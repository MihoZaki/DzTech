import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  CheckCircleIcon,
  EyeIcon,
  ShoppingCartIcon,
  StarIcon,
} from "@heroicons/react/24/solid";
import { useCart } from "../contexts/CartContext"; // Still need this to sync local cart

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ||
  "";

const ProductCard = ({ product }) => {
  const navigation = useNavigate();
  const savedTheme = localStorage.getItem("theme");
  const { addToCart } = useCart(); // Use the context function directly
  const [isAdded, setIsAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isShoped, setIsShopped] = useState(false);
  const [isShoping, setIsShoping] = useState(false);

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

  const handleQuickAdd = async () => {
    if (isAdding) return;
    setIsAdding(true);
    setIsAdded(false);

    try {
      // Prepare the product object to pass to the context function
      // The context function will handle the API call via TanStack Query
      const productToAdd = {
        ...product,
        quantity: 1,
        image: product.image_urls && product.image_urls.length > 0
          ? constructImageUrl(product.image_urls[0])
          : "", // Use the constructed image URL
        // The context will handle price calculation internally based on the product object
      };

      // Call the context function which uses TanStack Query
      await addToCart(productToAdd);

      setIsAdded(true);
      // toast.success(`"${product.name}" added to cart!`); // Use product.name
      setTimeout(() => {
        setIsAdded(false);
      }, 1500);
    } catch (error) {
      // Errors are now handled within the CartContext mutation
      // But we can still catch here if needed for UI-specific logic
      // console.error("Failed to add item to cart:", error);
      // toast.error("Failed to add item to cart. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };
  const handleQuickShop = async () => {
    if (isShoping) return;
    setIsShoping(true);
    setIsShopped(false);

    try {
      // Prepare the product object to pass to the context function
      // The context function will handle the API call via TanStack Query
      const productToAdd = {
        ...product,
        quantity: 1,
        image: product.image_urls && product.image_urls.length > 0
          ? constructImageUrl(product.image_urls[0])
          : "", // Use the constructed image URL
        // The context will handle price calculation internally based on the product object
      };

      // Call the context function which uses TanStack Query
      await addToCart(productToAdd);

      setIsShopped(true);
      // toast.success(`"${product.name}" added to cart!`); // Use product.name
      setTimeout(() => {
        setIsShopped(false);
      }, 1500);
      navigation("/checkout");
    } catch (error) {
      // Errors are now handled within the CartContext mutation
      // But we can still catch here if needed for UI-specific logic
      // console.error("Failed to add item to cart:", error);
      // toast.error("Failed to add item to cart. Please try again.");
    } finally {
      setIsShoping(false);
    }
  };

  const handleCardPress = () => {
    navigation(`/product/${product.id}`);
  };

  // Function to get display image URL
  const displayImage = product.image_urls && product.image_urls.length > 0
    ? constructImageUrl(product.image_urls[0])
    : ""; // Fallback to empty string if no image_urls

  // --- Determine Pricing Information (using new field names) ---
  const hasDiscount = product.has_active_discount &&
    product.discounted_price_cents !== undefined;
  const currentPrice = hasDiscount
    ? product.discounted_price_cents / 100
    : product.price_cents / 100; // Convert cents to dollars
  const originalPrice = hasDiscount ? product.price_cents / 100 : null; // Convert cents to dollars
  const discountPercentage = hasDiscount
    ? product.effective_discount_percentage
    : 0;
  const isOutOfStock = product.stock_quantity == 0;
  // --- End of Determination ---

  // --- Determine Rating Information ---
  const hasRatings = product.num_ratings && product.num_ratings > 0;
  const avgRating = hasRatings ? (product.avg_rating || 0) : 0;
  const numRatings = product.num_ratings || 0;
  // --- End of Determination ---

  return (
    <div
      className={`card bg-base-100 shadow-sm hover:shadow-2xl transition-shadow duration-300 relative border rounded-lg border-base-200`}
    >
      <figure
        className="h-48 overflow-hidden cursor-pointer relative" // Added 'relative' for badge positioning
        onClick={handleCardPress}
      >
        <img
          src={displayImage}
          alt={product.name} // Use product.name
          className="w-full h-full object-contain rounded-t-lg hover:scale-105 transition-transform duration-300"
        />
        {/* Discount Badge */}
        {hasDiscount && discountPercentage > 0 && (
          <div className="absolute top-2 left-2 bg-info text-white text-s font-bold px-2 py-1 rounded-lg z-10">
            -{discountPercentage}%
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute bottom-2 left-2 bg-error text-white text-xs font-bold px-2 py-1 rounded-lg z-10">
            out of stock
          </div>
        )}
      </figure>
      <div className="card-body p-4 relative">
        {/* Added 'relative' for absolute positioning of button */}
        <h2 className="card-title text-m line-clamp-2">{product.name}</h2>{" "}
        {/* Use product.name */}
        <div className="flex items-center gap-1">
          <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
          <span className="text-xs">
            {hasRatings ? avgRating.toFixed(2) : "N/A"} ({numRatings} reviews)
          </span>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2">
          {product.short_description || product.description}{" "}
          {/* Use short_description, fallback to description */}
        </p>
        {/* Price Display Container */}
        <div className="mt-2">
          {/* Price Display */}
          <div className="flex flex-col mb-2">
            <p className="text-lg font-bold text-base-content mb-0">
              {/* mb-0 removes default bottom margin */}
              {currentPrice?.toFixed(2)} DA
            </p>
            {hasDiscount && originalPrice && (
              <p className="text-xs font-medium text-gray-400 line-through mt-0">
                {originalPrice?.toFixed(2)} DA
              </p>
            )}
          </div>
          {/* Add to Cart Button - Positioned absolutely at the bottom right */}
          <div className="flex flex-row justify-end items-center gap-2">
            <button
              className={`btn btn-sm ${
                isAdded ? "btn-success " : "btn-primary"
              } z-50`}
              onClick={handleQuickAdd}
              title={isAdded ? "Added to Cart!" : "Add to Cart"}
              disabled={isAdded || isAdding}
            >
              {isAdding
                ? <span className="loading loading-spinner loading-xs"></span>
                : isAdded
                ? (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-1 text-base-content" />
                    <span className="text-base-content">Added!</span>
                  </>
                )
                : (
                  <>
                    <ShoppingCartIcon className="h-4 w-4 text-inherit mr-1" />
                    <p>Add to cart</p>
                  </>
                )}
            </button>
            <button
              className={`btn btn-sm ${
                isShoped ? "btn-success " : "btn-secondary"
              } z-50`}
              onClick={handleQuickShop}
              title={isShoped ? "Added to Cart!" : "Shop Now"}
              disabled={isShoped || isShoping}
            >
              {isShoping
                ? <span className="loading loading-spinner loading-xs"></span>
                : isShoped
                ? (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-1 text-base-content" />
                    <span className="text-base-content">Shopped!</span>
                  </>
                )
                : (
                  <>
                    <p>Shop Now</p>
                  </>
                )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
