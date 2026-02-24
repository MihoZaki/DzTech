import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchProductById,
  searchProducts,
  submitReview,
} from "../services/api"; // Import the API functions
import { toast } from "sonner"; // Import toast for error messages
import { StarIcon } from "@heroicons/react/24/solid"; // Import StarIcon for the rating display/form
import ProductCard from "../components/ProductCard"; // Import ProductCard
import { useQuery } from "@tanstack/react-query"; // Import useQuery

// Base URL for the backend API (adjust this for your deployment environment)
const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ||
  "";

const ProductDetail = () => {
  const { id } = useParams();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0); // Track the index of the selected image from the array
  const [quantity, setQuantity] = useState(1);
  const { user } = useAuth(); // Get the current user from auth context
  const [reviews, setReviews] = useState([]); // State to hold reviews
  const [newReviewRating, setNewReviewRating] = useState(0); // State for the new review's star rating
  const [isSubmittingReview, setIsSubmittingReview] = useState(false); // Loading state for review submission
  const [isAddingToCart, setIsAddingToCart] = useState(false); // Loading state for add to cart
  const { addToCart } = useCart(); // Use the context function directly

  // Function to construct full image URL
  const constructImageUrl = (imageUrl) => {
    if (!imageUrl) return "";

    // If it's already a full URL, return as is
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    // Otherwise, prepend the backend base URL
    return `${imageUrl}`;
  };

  // Fetch main product details using TanStack Query
  const {
    data: product,
    isLoading: isProductLoading,
    isError: isProductError,
    error: productError,
    refetch: refetchProduct,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProductById(id),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Cache for 10 minutes
    enabled: !!id, // Only run query if id exists
    onError: (error) => {
      console.error(`Error fetching product with id ${id}:`, error);
      toast.error("Failed to load product details. Please try again later.");
    },
  });

  // Fetch related products using TanStack Query
  const {
    data: relatedProductsData,
    isLoading: isRelatedProductsLoading,
    isError: isRelatedProductsError,
    error: relatedProductsError,
  } = useQuery({
    queryKey: ["related-products", product?.category_id], // Use category_id from the main product
    queryFn: () =>
      searchProducts({
        category_id: product?.category_id,
        limit: 6,
        page: 1,
      }),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Cache for 10 minutes
    enabled: !!product?.category_id, // Only run query if the main product has loaded and has a category_id
    onError: (error) => {
      console.error("Error fetching related products:", error);
      toast.error("Failed to load related products. Please try again later.");
    },
  });

  // Process related products data
  const relatedProducts = React.useMemo(() => {
    if (!relatedProductsData?.data) return [];

    // Process related products to ensure image URLs are properly formatted
    return relatedProductsData.data
      .filter((p) => p.id !== id) // Filter out the current product
      .map((prod) => {
        if (prod.image_urls && prod.image_urls.length > 0) {
          prod.image_urls = prod.image_urls.map((url) =>
            constructImageUrl(url)
          );
        }
        return prod;
      });
  }, [relatedProductsData, id, constructImageUrl]);

  const handleAddToCart = async () => { // Make function async
    if (product) {
      setIsAddingToCart(true);
      try {
        // Prepare the product object to pass to the context function
        // The context function will handle the API call via TanStack Query
        const productToAdd = {
          ...product,
          quantity: quantity, // Use the selected quantity
          image: product.image_urls && product.image_urls.length > 0
            ? constructImageUrl(product.image_urls[0])
            : "", // Use the constructed image URL
          // The context will handle price calculation internally based on the product object
        };

        // Call the context function which uses TanStack Query
        await addToCart(productToAdd);

        toast.success(`"${product.name}" added to cart!`); // Show success toast using product.name
      } catch (error) {
        // Errors are now handled within the CartContext mutation
        // But we can still catch here if needed for UI-specific logic
        console.error("Failed to add item to cart:", error);
        toast.error("Failed to add item to cart. Please try again."); // Show error toast
      } finally {
        setIsAddingToCart(false);
      }
    }
  };

  // Handler for submitting a new review
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please log in to submit a rating.");
      return;
    }
    if (newReviewRating <= 0) {
      toast.error("Please select a rating.");
      return;
    }

    setIsSubmittingReview(true);
    try {
      await submitReview(product.id, newReviewRating);

      toast.success("Rating submitted successfully!");

      // Refetch the product to get updated ratings
      await refetchProduct();

      // Reset the form ONLY on success
      setNewReviewRating(0);
    } catch (error) {
      console.error("Error submitting rating:", error);

      // --- Extract Error Message Logic ---
      let errorMessage = "Failed to submit rating. Please try again.";

      // 1. Check if it's an Axios error with a response
      if (error.response) {
        // The backend sent a response with a status code outside 2xx
        const backendData = error.response.data;

        // Common patterns for error messages in JSON responses
        if (typeof backendData === "string") {
          errorMessage = backendData;
        } else if (backendData?.message) {
          errorMessage = backendData.message;
        } else if (backendData?.error) {
          errorMessage = backendData.error;
        } else if (backendData?.msg) {
          errorMessage = backendData.msg;
        }
      } // 2. Check if it's a network error or request made but no response
      else if (error.request) {
        console.warn("No response received from server:", error.request);
        errorMessage = "Network error: Could not reach the server.";
      } // 3. Other errors (setup issues, etc.)
      else {
        if (error.message) {
          errorMessage = error.message;
        }
      }

      // Display the specific message
      toast.error(errorMessage);
    } finally {
      setIsSubmittingReview(false);
    }
  };
  // Calculate the current image source based on the selected index and the product's image_urls
  const currentImageSrc = React.useMemo(() => {
    if (
      !product || !product.image_urls || !product.image_urls[selectedImageIndex]
    ) {
      return ""; // Fallback to empty string if no images
    }
    return product.image_urls[selectedImageIndex];
  }, [product, selectedImageIndex]);

  // --- Determine Pricing Information ---
  const hasDiscount = product?.has_active_discount &&
    product?.discounted_price_cents !== undefined;
  const currentPrice = hasDiscount
    ? product?.discounted_price_cents / 100
    : product?.price_cents / 100; // Convert cents to dollars
  const originalPrice = hasDiscount ? product?.price_cents / 100 : null; // Convert cents to dollars
  const discountPercentage = hasDiscount
    ? product?.effective_discount_percentage
    : 0;
  // --- End of Determination ---

  // --- Determine Rating Information ---
  const hasRatings = product?.num_ratings && product.num_ratings > 0;
  const avgRating = hasRatings ? (product?.avg_rating || 0) : 0;
  const numRatings = product?.num_ratings || 0;
  // --- End of Determination ---

  if (isProductLoading) {
    return (
      <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen">
        <div className="skeleton h-96 w-full mb-6 bg-base-200"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="skeleton h-8 w-3/4 mb-4 bg-base-200"></div>
            <div className="skeleton h-4 w-full mb-2 bg-base-200"></div>
            <div className="skeleton h-4 w-5/6 mb-6 bg-base-200"></div>
            <div className="skeleton h-12 w-full bg-base-200"></div>
          </div>
          <div>
            <div className="skeleton h-64 w-full bg-base-200"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isProductError) {
    return (
      <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4 text-error">
            Error loading product:{" "}
            {productError.message || "An unknown error occurred"}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => refetchProduct()} // Retry function
          >
            Retry
          </button>
          <Link to="/products" className="btn btn-accent btn-outline">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  // If product is loaded but is null/empty (not found)
  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen">
        <p className="text-center text-error">Product not found.</p>
        <Link to="/products" className="btn btn-primary">Back to Products</Link>
      </div>
    );
  }

  // Determine the list of images to display in the thumbnail gallery
  const imageGalleryList = product.image_urls || []; // Use image_urls array, fallback to empty array if none

  return (
    <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen">
      {/* Updated Link with btn-sm */}
      <Link to="/products" className="btn btn-accent btn-outline mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to Products
      </Link>

      <div className="divider"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div>
          <div className="aspect-square mb-4 bg-base-100 rounded-lg p-4">
            <img
              src={currentImageSrc} // Use the image source determined by state/index
              alt={`${product.name} - Image ${selectedImageIndex + 1}`} // Provide better alt text using product.name
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          {/* Thumbnail Strip */}
          <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
            {/* Added flex-wrap and scrollable container */}
            {imageGalleryList.map((imgUrl, index) => (
              <button
                key={index} // Use the array index as the key
                className={`w-16 h-16 border rounded ${
                  selectedImageIndex === index
                    ? "border-primary ring-2 ring-primary"
                    : "border-transparent"
                } bg-base-200 flex-shrink-0`} // Highlight selected image
                onClick={() => setSelectedImageIndex(index)} // Update selected index on click
                title={`View Image ${index + 1}`} // Tooltip for clarity
              >
                <img
                  src={imgUrl}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover rounded pointer-events-none"
                />{" "}
                {/* pointer-events-none prevents interaction with img itself */}
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>{" "}
          {/* Use product.name */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl font-bold text-primary">
              DA {currentPrice?.toFixed(2) ?? "0.00"}{" "}
              {/* Use currentPrice and convert to DA */}
            </span>
            {/* Show original price if there's a discount */}
            {hasDiscount && originalPrice && (
              <>
                <span className="line-through text-gray-500">
                  DA {originalPrice.toFixed(2)}
                </span>
                <span className="badge badge-success bg-green-600 text-white">
                  -{discountPercentage.toFixed(0)}%
                </span>
              </>
            )}
          </div>

          {/* Rating Display */}
          <div className="flex items-center gap-1 mb-4">
            <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="text-sm">
              {hasRatings ? avgRating.toFixed(2) : "No ratings"} ({numRatings}
              {" "}
              reviews)
            </span>
          </div>

          {/* Short Description */}
          <p className="text-gray-600 mb-4">
            {product.description ||
              product.short_description || "No description available."}
          </p>

          {/* Old-style specs table */}
          <div className="mb-6">
            <table className="table table-zebra bg-base-100">
              <tbody>
                <tr>
                  <td>Category</td>
                  <td>{product.category}</td>
                </tr>
                <tr>
                  <td>Brand</td>
                  <td>{product.brand}</td>
                </tr>
                <tr>
                  <td>Stock Quantity</td>
                  <td
                    className={product.stock_quantity > 0
                      ? "text-success"
                      : "text-error"}
                  >
                    {product.stock_quantity > 0
                      ? `${product.stock_quantity} In Stock`
                      : "Out of Stock"}
                  </td>
                </tr>
                <tr>
                  <td>Avg Rating</td>
                  <td>
                    {hasRatings ? avgRating.toFixed(2) : "N/A"} ({numRatings}
                    {" "}
                    reviews)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Add to Cart Section */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center">
              <button
                className="btn btn-sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={isAddingToCart} // Disable when adding to cart
              >
                -
              </button>
              <span className="mx-2">{quantity}</span>
              <button
                className="btn btn-sm"
                onClick={() => setQuantity(quantity + 1)}
                disabled={isAddingToCart} // Disable when adding to cart
              >
                +
              </button>
            </div>
            <button
              className="btn btn-primary flex-1"
              onClick={handleAddToCart}
              disabled={isAddingToCart} // Disable when adding to cart
            >
              {isAddingToCart
                ? (
                  <>
                    <span className="loading loading-spinner loading-xs mr-2">
                    </span>
                    Adding...
                  </>
                )
                : (
                  "Add to Cart"
                )}
            </button>
          </div>

          {/* Reviews Section (Stars Only, Repositioned) */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-2">Rate this Product</h3>
            {user
              ? (
                <form onSubmit={handleReviewSubmit}>
                  <div className="flex space-x-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`text-xl ${
                          star <= newReviewRating
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                        onClick={() => setNewReviewRating(star)}
                      >
                        <StarIcon className="h-6 w-6" />
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary"
                    disabled={isSubmittingReview || newReviewRating <= 0}
                  >
                    {isSubmittingReview
                      ? (
                        <>
                          <span className="loading loading-spinner loading-xs mr-2">
                          </span>
                          Submitting...
                        </>
                      )
                      : (
                        "Submit Rating"
                      )}
                  </button>
                </form>
              )
              : (
                <p className="text-sm text-gray-500">
                  Log in to rate this product.
                </p>
              )}
          </div>

          <div className="divider"></div>
          <h2 className="text-2xl content-center font-bold mb-4">
            Specifications
          </h2>
          <div className="bg-base-100 p-4 rounded-box border border-base-200">
            <table className="table table-zebra">
              <tbody>
                {product.spec_highlights &&
                  Object.entries(product.spec_highlights).map((
                    [key, value],
                  ) => (
                    <tr key={key}>
                      <td className="font-semibold capitalize">
                        {key.replace(/_/g, " ")}
                      </td>{" "}
                      {/* Format key */}
                      <td>{value}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="divider"></div>
      {/* Related Products */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Related Products</h2>
        {isRelatedProductsLoading
          ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card bg-base-100 shadow-xl">
                  <div className="skeleton h-48 w-full"></div>
                  <div className="card-body">
                    <div className="skeleton h-4 w-3/4 mb-2"></div>
                    <div className="skeleton h-4 w-full mb-2"></div>
                    <div className="skeleton h-4 w-1/2 mb-4"></div>
                    <div className="skeleton h-8 w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          )
          : isRelatedProductsError
          ? (
            <div className="text-center py-8">
              <p className="text-error">Failed to load related products.</p>
              <button
                className="btn btn-sm mt-2"
                onClick={() => relatedProductsData.refetch()} // Retry function for related products
              >
                Retry
              </button>
            </div>
          )
          : relatedProducts.length > 0
          ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          )
          : (
            <p className="text-center text-gray-500">
              No related products found.
            </p>
          )}
      </div>
    </div>
  );
};

export default ProductDetail;
