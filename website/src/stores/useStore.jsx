// Updated useStore.jsx
import { create } from "zustand";

export const useStore = create((set, get) => ({
  cart: [],
  buildPcComponents: {},

  // Cart actions
  addToCart: (product) =>
    set((state) => {
      const existingItem = state.cart.find((item) => item.id === product.id);
      if (existingItem) {
        return {
          cart: state.cart.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return { cart: [...state.cart, { ...product, quantity: 1 }] };
    }),

  removeFromCart: (productId) =>
    set((state) => ({
      cart: state.cart.filter((item) => item.id !== productId),
    })),

  updateQuantity: (productId, quantity) =>
    set((state) => ({
      cart: state.cart.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      ),
    })),

  clearCart: () => set({ cart: [] }),

  // New function to set cart directly from backend data
  setCartFromBackend: (cartItems) => set({ cart: cartItems }),

  // Build PC actions
  setPcComponent: (category, component) =>
    set((state) => ({
      buildPcComponents: {
        ...state.buildPcComponents,
        [category]: component,
      },
    })),

  clearBuildPcComponents: () => set({ buildPcComponents: {} }),
}));
