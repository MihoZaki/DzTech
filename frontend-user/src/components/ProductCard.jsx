// src/components/ProductCard.jsx
import React, { useState } from "react"; // Import useState
import { Link } from "react-router-dom";
import {
  CheckCircleIcon,
  EyeIcon,
  ShoppingCartIcon,
  StarIcon,
} from "@heroicons/react/24/solid"; // Import CheckCircleIcon
import { useCart } from "../contexts/CartContext"; // Import useCart hook

const ProductCard = ({ product }) => {
  const { addToCart } = useCart(); // Get the addToCart function
  const [isAdded, setIsAdded] = useState(false); // State to track button state

  const handleQuickAdd = () => {
    addToCart({ ...product, quantity: 1 }); // Add the product with a default quantity of 1
    setIsAdded(true); // Set the state to indicate the item was added

    // Reset the state after 1.5 seconds
    setTimeout(() => {
      setIsAdded(false);
    }, 1500);
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
        {/* New structure for price and actions */}
        <div className="mt-2">
          <div className="text-xl font-bold text-base-content mb-2">
            ${product.price}
          </div>
          <div className="card-actions justify-end">
            <button
              className={`btn btn-sm ${
                isAdded ? "btn-success " : "btn-primary"
              }`} // Conditional class based on isAdded state
              onClick={handleQuickAdd} // Call the quick add function
              title={isAdded ? "Added to Cart!" : "Add to Cart"} // Tooltip changes based on state
              disabled={isAdded} // Optionally disable the button while showing success
            >
              {isAdded
                ? ( // Conditional rendering based on isAdded state
                  <>
                    {/* Fragment to wrap multiple elements without adding a DOM node */}
                    <CheckCircleIcon className="h-4 w-4 mr-1 text-base-content" />
                    <span className="text-base-content">
                      Added!
                    </span>
                  </>
                )
                : (
                  <ShoppingCartIcon className="h-4 w-4" /> // Original icon
                )}
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
