"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import AuthGuard from "@/components/AuthGuard";
import { getProduct, Product } from "@/lib/api/products";

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        setError("");

        const id = Number(params.id);

        if (!Number.isInteger(id) || id <= 0) {
          setError("Product not found.");
          return;
        }

        const data = await getProduct(id);

        setProduct(data);
      } catch (error) {
        console.error("Failed to load product:", error);
        setError("Product not found.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [params.id]);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-6xl">

          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="mb-6 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            ← Back to Products
          </button>

          {/* Loading */}
          {isLoading && (
            <div className="rounded-lg bg-white p-10 text-center shadow">
              <p className="text-gray-700">
                Loading product...
              </p>
            </div>
          )}

          {/* Error / Not Found */}
          {!isLoading && error && (
            <div className="rounded-lg bg-white p-10 text-center shadow">
              <h1 className="mb-3 text-2xl font-bold text-gray-900">
                Product Not Found
              </h1>

              <p className="mb-6 text-gray-600">
                The product you are looking for does not exist.
              </p>

              <button
                onClick={() => router.push("/products")}
                className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Back to Products
              </button>
            </div>
          )}

          {/* Product Details */}
          {!isLoading && !error && product && (
            <div className="rounded-xl bg-white p-6 shadow">

              {/* Header */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">
                  {product.title}
                </h1>

                <p className="mt-2 text-gray-500">
                  Category: {product.category}
                </p>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">

                {/* Images */}
                <div>
                  <div className="mb-4 flex h-96 items-center justify-center rounded-xl bg-gray-50">
                    <img
                      src={product.thumbnail}
                      alt={product.title}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {product.images.map((image, index) => (
                      <div
                        key={`${image}-${index}`}
                        className="flex h-24 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-2"
                      >
                        <img
                          src={image}
                          alt={`${product.title} ${index + 1}`}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Product Information */}
                <div>

                  {/* Price */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-500">
                      Price
                    </p>

                    <p className="text-4xl font-bold text-gray-900">
                      ${product.price}
                    </p>
                  </div>

                  {/* Rating */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-500">
                      Rating
                    </p>

                    <p className="mt-1 text-lg text-gray-900">
                      ⭐ {product.rating}
                    </p>
                  </div>

                  {/* Stock */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-500">
                      Stock
                    </p>

                    <p className="mt-1 text-lg font-medium text-gray-900">
                      {product.stock} units
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <h2 className="mb-2 text-xl font-semibold text-gray-900">
                      Description
                    </h2>

                    <p className="leading-7 text-gray-600">
                      {product.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reviews */}
              <div className="mt-10 border-t border-gray-200 pt-8">
                <h2 className="mb-5 text-2xl font-bold text-gray-900">
                  Reviews
                </h2>

                {product.reviews &&
                product.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {product.reviews.map((review, index) => (
                      <div
                        key={`${review.reviewerEmail}-${index}`}
                        className="rounded-lg border border-gray-200 p-5"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {review.reviewerName}
                            </p>

                            <p className="text-sm text-gray-500">
                              {review.reviewerEmail}
                            </p>
                          </div>

                          <p className="text-sm text-gray-700">
                            ⭐ {review.rating}
                          </p>
                        </div>

                        <p className="mt-3 text-gray-700">
                          {review.comment}
                        </p>

                        <p className="mt-2 text-xs text-gray-500">
                          {new Date(
                            review.date
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">
                    No reviews available.
                  </p>
                )}
              </div>

            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}