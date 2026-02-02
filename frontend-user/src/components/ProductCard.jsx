import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  CheckCircleIcon,
  EyeIcon,
  ShoppingCartIcon,
  StarIcon,
} from "@heroicons/react/24/solid";
import { useCart } from "../contexts/CartContext";

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleQuickAdd = async () => {
    if (isAdding) return;

    setIsAdding(true);
    setIsAdded(false);

    try {
      await addToCart({ ...product, quantity: 1 });
      setIsAdded(true);
      toast.success(`"${product.title}" added to cart!`);
      setTimeout(() => {
        setIsAdded(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to add item to cart:", error);
      toast.error("Failed to add item to cart. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300 relative">
      <figure className="px-4 pt-4 h-48 overflow-hidden">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-contain rounded-lg"
        />
      </figure>
      <div className="card-body p-4">
        <h2 className="card-title text-sm line-clamp-2">{product.title}</h2>
        <div className="flex items-center gap-1">
          <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
          <span className="text-xs">4.5</span>
          <span className="text-xs text-gray-500">(128)</span>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2">
          {product.description}
        </p>
        <div className="mt-2">
          <div className="text-xl font-bold text-base-content mb-2">
            DZD {product.price}
          </div>
          <div className="card-actions justify-end">
            <button
              className={`btn btn-sm ${
                isAdded ? "btn-success " : "btn-primary"
              }`}
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
                    <span className="text-base-content">
                      Added!
                    </span>
                  </>
                )
                : <ShoppingCartIcon className="h-4 w-4" />}
            </button>
            <Link
              to={`/product/${product.id}`}
              className="btn btn-primary btn-sm"
            >
              <EyeIcon className="h-4 w-4 mr-1" />
              View
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
