"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import Link from "next/link";

import AuthGuard from "@/components/AuthGuard";

import {
  getCategories,
  getProducts,
  getProductsByCategory,
  searchProducts,
  Category,
  Product,
} from "@/lib/api/products";

type SortOption =
  | ""
  | "price-asc"
  | "price-desc"
  | "rating-asc"
  | "rating-desc"
  | "title-asc"
  | "title-desc";

export default function ProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /*
   * Read URL parameters directly from the browser on the first render.
   * This makes direct URLs such as:
   *
   * /products?page=999
   *
   * initialize with page 999 instead of accidentally starting at page 1.
   */
  const getInitialParam = (key: string) => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get(key);
    }

    return searchParams.get(key);
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);

  // Page
  const [page, setPage] = useState(() => {
    const value = Number(getInitialParam("page"));

    return Number.isInteger(value) && value > 0 ? value : 1;
  });

  // Page size
  const [pageSize, setPageSize] = useState(() => {
    const value = Number(getInitialParam("pageSize"));

    return [10, 20, 50].includes(value) ? value : 10;
  });

  // Search
  const [search, setSearch] = useState(
    () => getInitialParam("search") || ""
  );

  const [searchInput, setSearchInput] = useState(
    () => getInitialParam("search") || ""
  );

  const isInitialSearchRender = useRef(true);

  // Category
  const [category, setCategory] = useState(
    () => getInitialParam("category") || ""
  );

  // Sort
  const [sort, setSort] = useState<SortOption>(() => {
    const value = getInitialParam("sort");

    const validSorts: SortOption[] = [
      "",
      "price-asc",
      "price-desc",
      "rating-asc",
      "rating-desc",
      "title-asc",
      "title-desc",
    ];

    return validSorts.includes(value as SortOption)
      ? (value as SortOption)
      : "";
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Calculate total number of pages
  const totalPages = Math.ceil(total / pageSize);

  /*
   * Safety check:
   * If the current page becomes larger than the available pages,
   * move the user to the last valid page.
   */
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  /*
   * Keep page, page size, search, category and sort values
   * synchronized with the URL.
   */
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();

    if (page > 1) {
      params.set("page", page.toString());
    }

    if (pageSize !== 10) {
      params.set("pageSize", pageSize.toString());
    }

    if (search) {
      params.set("search", search);
    }

    /*
     * Search and category cannot be used together.
     * Search has priority.
     */
    if (category && !search) {
      params.set("category", category);
    }

    if (sort) {
      params.set("sort", sort);
    }

    const queryString = params.toString();

    router.replace(
      queryString ? `${pathname}?${queryString}` : pathname,
      { scroll: false }
    );
  }, [
    page,
    pageSize,
    search,
    category,
    sort,
    router,
    pathname,
  ]);

  /*
   * IMPORTANT:
   * The dependency array always contains exactly the same
   * number of dependencies.
   *
   * This fixes the React error:
   * "The final argument passed to useEffect changed size between renders."
   */
  useEffect(() => {
    if (totalPages === 0) {
      return;
    }

    updateUrl();
  }, [updateUrl, totalPages]);

  // Convert UI sort value into API parameters
  const getSortParams = () => {
    if (!sort) {
      return {};
    }

    const [sortBy, order] = sort.split("-") as [
      "price" | "rating" | "title",
      "asc" | "desc"
    ];

    return {
      sortBy,
      order,
    };
  };

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();

        setCategories(data);
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // Fetch products
  const fetchProducts = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError("");

      try {
        const skip = (page - 1) * pageSize;
        const sortParams = getSortParams();

        let data;

        /*
         * Search has priority.
         *
         * The assignment states that search and category
         * cannot be sent together to the API, so when searching
         * we do not send the category.
         */
        if (search.trim()) {
          data = await searchProducts(
            search.trim(),
            {
              limit: pageSize,
              skip,
              ...sortParams,
            },
            signal
          );
        } else if (category) {
          data = await getProductsByCategory(category, {
            limit: pageSize,
            skip,
            ...sortParams,
          });
        } else {
          data = await getProducts({
            limit: pageSize,
            skip,
            ...sortParams,
          });
        }

        /*
         * Always store the total returned by the API.
         */
        setTotal(data.total);

        /*
         * Handle invalid page values.
         *
         * Example:
         *
         * /products?page=999
         *
         * If there are 194 products and page size is 10:
         *
         * total pages = 20
         *
         * So page 999 becomes page 20.
         */
        const maxPage = Math.max(
          1,
          Math.ceil(data.total / pageSize)
        );

        if (page > maxPage) {
          setPage(maxPage);
          return;
        }

        setProducts(data.products);
      } catch (error) {
        /*
         * Ignore errors caused by intentionally cancelled
         * requests.
         */
        if (signal?.aborted) {
          return;
        }

        console.error(error);

        setError("Failed to load products.");
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [page, pageSize, search, category, sort]
  );

  /*
   * Fetch products whenever page, page size, search,
   * category or sort changes.
   */
  useEffect(() => {
    const controller = new AbortController();

    fetchProducts(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchProducts]);

  /*
   * Debounce search.
   *
   * The API is not called on every keystroke.
   * It waits 500ms after the user stops typing.
   */
  useEffect(() => {
    if (isInitialSearchRender.current) {
      isInitialSearchRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  // Search input
  const handleSearchChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;

    setSearchInput(value);

    /*
     * Search and category cannot be used together.
     * When the user starts searching, clear the category.
     */
    if (value.trim()) {
      setCategory("");
    }
  };

  // Category change
  const handleCategoryChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setCategory(event.target.value);
    setPage(1);
  };

  // Sort change
  const handleSortChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setSort(event.target.value as SortOption);
    setPage(1);
  };

  // Page size change
  const handlePageSizeChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setPageSize(Number(event.target.value));
    setPage(1);
  };

  // Previous page
  const handlePrevious = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  // Next page
  const handleNext = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-7xl">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Product Dashboard
            </h1>

            <p className="mt-1 text-gray-700">
              Manage your products
            </p>
          </div>

          {/* Search + Filters */}
          <div className="mb-4 rounded-lg bg-white p-4 shadow">
            <div className="grid gap-4 md:grid-cols-3">

              {/* Search */}
              <div className="md:col-span-1">
                <label
                  htmlFor="search"
                  className="mb-2 block text-sm font-medium text-gray-900"
                >
                  Search products
                </label>

                <input
                  id="search"
                  type="text"
                  value={searchInput}
                  onChange={handleSearchChange}
                  placeholder="Search by product name..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-500 outline-none focus:border-blue-500"
                />
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="category"
                  className="mb-2 block text-sm font-medium text-gray-900"
                >
                  Category
                </label>

                <select
                  id="category"
                  value={category}
                  onChange={handleCategoryChange}
                  disabled={Boolean(searchInput.trim())}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <option value="">
                    All categories
                  </option>

                  {categories.map((item) => (
                    <option
                      key={item.slug}
                      value={item.slug}
                    >
                      {item.name}
                    </option>
                  ))}
                </select>

                {searchInput.trim() && (
                  <p className="mt-1 text-xs text-gray-500">
                    Category filter is disabled while searching.
                  </p>
                )}
              </div>

              {/* Sort */}
              <div>
                <label
                  htmlFor="sort"
                  className="mb-2 block text-sm font-medium text-gray-900"
                >
                  Sort by
                </label>

                <select
                  id="sort"
                  value={sort}
                  onChange={handleSortChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
                >
                  <option value="">
                    Default
                  </option>

                  <option value="price-asc">
                    Price: Low to High
                  </option>

                  <option value="price-desc">
                    Price: High to Low
                  </option>

                  <option value="rating-desc">
                    Rating: High to Low
                  </option>

                  <option value="rating-asc">
                    Rating: Low to High
                  </option>

                  <option value="title-asc">
                    Title: A to Z
                  </option>

                  <option value="title-desc">
                    Title: Z to A
                  </option>
                </select>
              </div>

            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="rounded-lg bg-white p-8 text-center shadow">
              <p className="text-gray-700">
                Loading products...
              </p>
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="rounded-lg bg-white p-8 text-center shadow">
              <p className="mb-4 text-red-600">
                {error}
              </p>

              <button
                onClick={() => fetchProducts()}
                className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty */}
          {!isLoading &&
            !error &&
            products.length === 0 && (
              <div className="rounded-lg bg-white p-8 text-center shadow">
                <p className="text-gray-700">
                  No products found.
                </p>
              </div>
            )}

          {/* Products */}
          {!isLoading &&
            !error &&
            products.length > 0 && (
              <>
                <div className="overflow-hidden rounded-lg bg-white shadow">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                            Product
                          </th>

                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                            Category
                          </th>

                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                            Price
                          </th>

                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                            Rating
                          </th>

                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                            Stock
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200">
                        {products.map((product) => (
                          <tr
                            key={product.id}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <img
                                  src={product.thumbnail}
                                  alt={product.title}
                                  className="h-14 w-14 rounded-lg object-cover"
                                />

                                <Link
  href={`/products/${product.id}`}
  className="font-medium text-gray-900 hover:text-blue-600"
>
  {product.title}
</Link>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-gray-700">
                              {product.category}
                            </td>

                            <td className="px-6 py-4 font-medium text-gray-900">
                              ${product.price}
                            </td>

                            <td className="px-6 py-4 text-gray-700">
                              ⭐ {product.rating}
                            </td>

                            <td className="px-6 py-4 text-gray-700">
                              {product.stock}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                <div className="mt-4 flex flex-col gap-4 rounded-lg bg-white p-4 shadow sm:flex-row sm:items-center sm:justify-between">

                  {/* Showing */}
                  <div className="text-sm text-gray-700">
                    Showing{" "}
                    <span className="font-semibold text-gray-900">
                      {(page - 1) * pageSize + 1}
                    </span>
                    {"–"}
                    <span className="font-semibold text-gray-900">
                      {Math.min(
                        page * pageSize,
                        total
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-gray-900">
                      {total}
                    </span>
                  </div>

                  {/* Page size */}
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="pageSize"
                      className="text-sm text-gray-700"
                    >
                      Page size:
                    </label>

                    <select
                      id="pageSize"
                      value={pageSize}
                      onChange={handlePageSizeChange}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      <option value={10}>
                        10
                      </option>

                      <option value={20}>
                        20
                      </option>

                      <option value={50}>
                        50
                      </option>
                    </select>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevious}
                      disabled={page === 1}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: totalPages },
                        (_, index) => index + 1
                      ).map((pageNumber) => (
                        <button
                          key={pageNumber}
                          onClick={() =>
                            setPage(pageNumber)
                          }
                          className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium ${
                            pageNumber === page
                              ? "bg-blue-600 text-white"
                              : "border border-gray-300 text-gray-900 hover:bg-gray-50"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleNext}
                      disabled={page === totalPages}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>

                </div>
              </>
            )}

        </div>
      </main>
    </AuthGuard>
  );
}