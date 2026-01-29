// src/pages/Cart.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";

const Cart = () => {
  const { cart, subtotal, total, updateQuantity, removeFromCart, clearCart } =
    useCart(); // Removed tax

  return (
    <div className="container mx-auto px-4 py-8 bg-base-200 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      {cart.length === 0
        ? (
          <div className="text-center py-12">
            <p className="text-xl mb-4">Your cart is empty</p>
            <Link to="/products" className="btn btn-primary">
              Continue Shopping
            </Link>
          </div>
        )
        : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="card bg-base-100 shadow-lg">
                    <div className="card-body">
                      <div className="flex items-center space-x-4">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-20 h-20 object-contain bg-base-200 p-2 rounded"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.title}</h3>
                          <p className="text-primary font-bold">
                            DZD {item.price}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            className="btn btn-xs"
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                Math.max(1, item.quantity - 1),
                              )}
                          >
                            -
                          </button>
                          <span className="mx-2">{item.quantity}</span>
                          <button
                            className="btn btn-xs"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                        <button
                          className="btn btn-error btn-xs"
                          onClick={() =>
                            removeFromCart(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <button
                  className="btn btn-error btn-sm"
                  onClick={clearCart}
                >
                  Clear Cart
                </button>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="card bg-base-100 shadow-lg sticky top-24">
                <div className="card-body">
                  <h3 className="card-title">Order Summary</h3>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>DZD {subtotal.toFixed(2)}</span>
                    </div>
                    {/* Removed Tax calculation and display */}
                    <div className="divider"></div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>DZD {total.toFixed(2)}</span>{" "}
                      {/* Total now equals Subtotal */}
                    </div>
                  </div>

                  {/* Updated button to link to /checkout */}
                  <Link to="/checkout" className="btn btn-primary w-full mt-4">
                    Proceed to Checkout
                  </Link>

                  <Link to="/products" className="btn btn-outline w-full mt-2">
                    Continue Shopping
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Cart;
