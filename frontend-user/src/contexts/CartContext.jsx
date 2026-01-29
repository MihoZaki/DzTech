import React, { createContext, useContext, useEffect, useState } from "react";
import { useStore } from "../stores/useStore";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart } =
    useStore();

  // Calculate totals
  const subtotal = cart.reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0,
  );
  const total = subtotal;

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
