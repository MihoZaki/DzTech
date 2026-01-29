// src/pages/ProductDetail.jsx
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useCart } from "../contexts/CartContext";
import { fetchProductById } from "../services/api"; // Import the new API function

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const data = await fetchProductById(id); // Fetch from real API
        setProduct(data);
      } catch (error) {
        console.error("Error fetching product:", error);
        // Optionally, set an error state or redirect
      }
    };
    loadProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (product) {
      addToCart({ ...product, quantity });
    }
  };

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8 bg-base-200 min-h-screen">
        <div className="skeleton h-96 w-full mb-6 bg-gray-800"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="skeleton h-8 w-3/4 mb-4 bg-gray-800"></div>
            <div className="skeleton h-4 w-full mb-2 bg-gray-800"></div>
            <div className="skeleton h-4 w-5/6 mb-6 bg-gray-800"></div>
            <div className="skeleton h-12 w-full bg-gray-800"></div>
          </div>
          <div>
            <div className="skeleton h-64 w-full bg-gray-800"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-base-200 min-h-screen">
      {/* Updated Link with btn-sm */}
      <Link
        to="/products"
        className="btn btn-sm btn-ghost mb-6 flex items-center"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to Products
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div>
          <div className="aspect-square mb-4 bg-base-100 rounded-lg p-4">
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <div className="flex space-x-2">
            {[product.image].map((img, index) => (
              <button
                key={index}
                className={`w-16 h-16 border rounded ${
                  selectedImage === index
                    ? "border-primary"
                    : "border-transparent"
                } bg-base-100`}
                onClick={() => setSelectedImage(index)}
              >
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-cover rounded"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.title}</h1>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl font-bold text-primary">
              ${product.price}
            </span>
            {/* Removed discount calculation if not in API */}
            {/* <span className="line-through text-gray-500">${(product.price * 1.2).toFixed(2)}</span> */}
            {/* <span className="badge badge-success bg-green-600 text-white">20% OFF</span> */}
          </div>

          <div className="mb-6">
            <p className="text-gray-600 mb-4">{product.description}</p>

            <div className="mb-6">
              <h3 className="font-semibold mb-2">Specifications:</h3>
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
                  {/* Add more specs from product.spec_highlights if needed */}
                  <tr>
                    <td>Stock Quantity</td>
                    <td
                      className={product.stock > 0
                        ? "text-success"
                        : "text-error"}
                    >
                      {product.stock > 0
                        ? `${product.stock} In Stock`
                        : "Out of Stock"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center">
              <button
                className="btn btn-sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                -
              </button>
              <span className="mx-2">{quantity}</span>
              <button
                className="btn btn-sm"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </button>
            </div>
            <button
              className="btn btn-primary flex-1"
              onClick={handleAddToCart}
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>

      {/* Related Products */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Related Products</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Related products would go here */}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
