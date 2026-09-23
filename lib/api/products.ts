import api from "./axios";

export interface Product {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  rating: number;
  stock: number;
  thumbnail: string;
  images: string[];
  reviews?: Review[];
}

export interface Review {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
  reviewerEmail: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

export interface Category {
  slug: string;
  name: string;
  url: string;
}

export interface ProductQuery {
  limit: number;
  skip: number;
  sortBy?: "price" | "rating" | "title";
  order?: "asc" | "desc";
}

export interface ProductInput {
  title: string;
  description: string;
  price: number;
  category: string;
  stock: number;
}

// Get products with pagination and sorting
export const getProducts = async (
  query: ProductQuery
): Promise<ProductsResponse> => {
  const response = await api.get<ProductsResponse>("/products", {
    params: query,
  });

  return response.data;
};

// Search products
export const searchProducts = async (
  query: string,
  queryParams: ProductQuery,
  signal?: AbortSignal
): Promise<ProductsResponse> => {
  const response = await api.get<ProductsResponse>("/products/search", {
    params: {
      q: query,
      ...queryParams,
    },
    signal,
  });

  return response.data;
};

// Get all categories
export const getCategories = async (): Promise<Category[]> => {
  const response = await api.get<Category[]>("/products/categories");

  return response.data;
};
// Get products by category
export const getProductsByCategory = async (
  category: string,
  query: ProductQuery
): Promise<ProductsResponse> => {
  const response = await api.get<ProductsResponse>(
    `/products/category/${category}`,
    {
      params: query,
    }
  );

  return response.data;
};

// Get one product
export const getProduct = async (id: number): Promise<Product> => {
  const response = await api.get<Product>(`/products/${id}`);

  return response.data;
};

// Add product
export const addProduct = async (
  product: ProductInput
): Promise<Product> => {
  const response = await api.post<Product>("/products/add", product);

  return response.data;
};

// Update product
export const updateProduct = async (
  id: number,
  product: Partial<ProductInput>
): Promise<Product> => {
  const response = await api.put<Product>(`/products/${id}`, product);

  return response.data;
};

// Delete product
export const deleteProduct = async (id: number): Promise<Product> => {
  const response = await api.delete<Product>(`/products/${id}`);

  return response.data;
};