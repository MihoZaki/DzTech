import React, { createContext, useContext, useState } from "react";
import { useStore } from "../stores/useStore";
import {
  addItemToCart,
  clearUserCart,
  fetchUserCart,
  removeCartItem,
  updateCartItem,
} from "../services/api";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // Import TanStack Query hooks

// Import the auth context to listen for changes
import { useAuth } from "../contexts/AuthContext";

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ||
  "";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const queryClient = useQueryClient(); // Get the query client instance
  const { cart: localCart } = useStore(); // We might still use the local store for optimistic updates if desired
  const { user, isAuthenticated } = useAuth(); // Get auth context

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

  const cartQueryKey = isAuthenticated ? ["cart", user?.id] : ["cart", "guest"];

  // 1. QUERY TO FETCH CART DATA FROM THE API
  const {
    data: backendCartData = { items: [], total_amount_cents: 0 }, // Default value to prevent errors
    isLoading: isCartLoading,
    isError: isCartError,
    error: cartError,
    refetch: refetchCart,
  } = useQuery({
    queryKey: cartQueryKey, // Use the dynamic key
    queryFn: () => fetchUserCart(), // API function to fetch cart (relies on session cookie for guests)
    enabled: true, // Enable for both authed and unauthed now
    staleTime: 0, // Data becomes stale immediately, forcing refetch on invalidation
    cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
    onError: (error) => {
      console.error("Error fetching cart:", error);
      // Optionally show a toast error here if it's a persistent issue
      // toast.error("Failed to load cart. Please try again.");
    },
  });

  // Process backend data for UI consumption (similar to syncCartWithBackend logic)
  const processedCart = React.useMemo(() => {
    if (!backendCartData.items || !Array.isArray(backendCartData.items)) {
      return [];
    }
    return backendCartData.items.map((cartItem) => {
      const product = cartItem.product;
      const unitPrice = product.final_price_cents / 100; // Use product's final price

      // Construct full image URL
      const fullImageUrl = product.image_urls && product.image_urls.length > 0
        ? constructImageUrl(product.image_urls[0])
        : "";

      return {
        id: product.id,
        name: product.name,
        price: unitPrice, // This is the final/discounted price
        original_price_cents: product.original_price_cents, // Preserve original price
        final_price_cents: product.final_price_cents, // Preserve final price
        image: fullImageUrl, // Use the constructed full image URL
        quantity: cartItem.quantity, // Use the quantity from backend
        cart_item_id: cartItem.id, // Store the backend cart item ID
        brand: product.brand,
        stock_quantity: product.stock_quantity,
        has_active_discount: product.has_active_discount,
      };
    });
  }, [backendCartData, constructImageUrl]);

  // Calculate totals based on processed cart data from the query
  const { subtotal, total } = React.useMemo(() => {
    let sub = 0;
    processedCart.forEach((item) => {
      const price = typeof item.price === "number"
        ? item.price
        : parseFloat(item.price);
      const quantity = typeof item.quantity === "number"
        ? item.quantity
        : parseInt(item.quantity);
      if (!isNaN(price) && !isNaN(quantity)) {
        sub += price * quantity;
      }
    });
    return { subtotal: sub, total: sub }; // Assuming total equals subtotal
  }, [processedCart]);

  // 2. MUTATION TO ADD AN ITEM TO THE CART
  const addCartItemMutation = useMutation({
    mutationFn: ({ productId, quantity }) => addItemToCart(productId, quantity),
    onSuccess: () => {
      // Invalidate and refetch the cart query to get the updated data from the backend
      // Use the current query key to invalidate the correct cache entry
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
      toast.success("Item added to cart!"); // Show success toast
    },
    onError: (error) => {
      // console.error("Error adding item to cart:", error);
      const errorMessage = error?.response?.data?.message ||
        "Failed to add item to cart. Please try again.";
      console.error("Error adding item to cart:", errorMessage);
      toast.error(errorMessage); // Show error toast
    },
  });

  // 3. MUTATION TO UPDATE ITEM QUANTITY IN THE CART
  const updateQuantityMutation = useMutation({
    mutationFn: ({ cartItemId, quantity }) =>
      updateCartItem(cartItemId, quantity),
    onSuccess: () => {
      // Invalidate and refetch the cart query to get the updated data from the backend
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
      toast.success("Quantity updated!"); // Show success toast
    },
    onError: (error) => {
      console.error("Error updating quantity:", error);
      const errorMessage = error?.response?.data?.message || error.message ||
        "Failed to update quantity. Please try again.";
      toast.error(errorMessage); // Show error toast
    },
  });

  // 4. MUTATION TO REMOVE AN ITEM FROM THE CART
  const removeCartItemMutation = useMutation({
    mutationFn: (cartItemId) => removeCartItem(cartItemId),
    onSuccess: () => {
      // Invalidate and refetch the cart query to get the updated data from the backend
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
      toast.success("Item removed from cart!"); // Show success toast
    },
    onError: (error) => {
      console.error("Error removing item from cart:", error);
      const errorMessage = error?.response?.data?.message || error.message ||
        "Failed to remove item from cart. Please try again.";
      toast.error(errorMessage); // Show error toast
    },
  });

  // 5. MUTATION TO CLEAR THE ENTIRE CART
  const clearCartMutation = useMutation({
    mutationFn: () => clearUserCart(),
    onSuccess: () => {
      // Invalidate and refetch the cart query to get the updated (empty) data from the backend
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
      toast.success("Cart cleared!"); // Show success toast
    },
    onError: (error) => {
      console.error("Error clearing cart:", error);
      const errorMessage = error?.response?.data?.message || error.message ||
        "Failed to clear cart. Please try again.";
      toast.error(errorMessage); // Show error toast
    },
  });

  // Define functions that wrap the mutations for easier use in components
  const addToCart = async (product) => {
    return await addCartItemMutation.mutateAsync({
      productId: product.id,
      quantity: product.quantity || 1,
    });
  };

  const updateQuantity = async (productId, newQuantity) => {
    // Find the cart_item_id associated with the product ID
    const cartItem = processedCart.find((item) => item.id === productId);
    if (cartItem) {
      updateQuantityMutation.mutate({
        cartItemId: cartItem.cart_item_id,
        quantity: newQuantity,
      });
    } else {
      console.error(
        `Cart item with product ID ${productId} not found for update.`,
      );
      toast.error("Item not found in cart for update.");
    }
  };

  const removeFromCart = async (productId) => {
    // Find the cart_item_id associated with the product ID
    const cartItem = processedCart.find((item) => item.id === productId);
    if (cartItem) {
      removeCartItemMutation.mutate(cartItem.cart_item_id);
    } else {
      console.error(
        `Cart item with product ID ${productId} not found for removal.`,
      );
      toast.error("Item not found in cart for removal.");
    }
  };

  const clearCart = async () => {
    clearCartMutation.mutate();
  };

  // Function to manually refresh the cart
  const refreshCart = () => {
    refetchCart();
  };

  // Construct the context value
  const contextValue = {
    cart: processedCart, // Use the cart data from the query
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    refreshCart,
    subtotal,
    total,
    isLoading: isCartLoading, // Use loading state from the query
    isError: isCartError, // Expose error state if needed
    error: cartError, // Expose error details if needed
    // Expose mutation statuses if needed for granular control in UI
    isAddingItem: addCartItemMutation.isPending,
    isUpdatingQuantity: updateQuantityMutation.isPending,
    isRemovingItem: removeCartItemMutation.isPending,
    isClearingCart: clearCartMutation.isPending,
    isAuthenticated, // Expose auth status to components if needed for logic
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
