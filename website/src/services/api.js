// src/services/api.js
import axios from "axios";
import { toast } from "sonner";

// Base URL for the API (adjust this for your deployment environment)
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  "http://localhost:8080/api";

// Create an Axios instance with defaults
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Timeout after 30 seconds (increased from 10s)
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// --- Request Interceptor: Attach Access Token (EXCEPT for auth endpoints) ---
apiClient.interceptors.request.use(
  (config) => {
    // Don't attach the access token to login, logout, or refresh endpoints
    if (
      config.url.endsWith("/v1/auth/login") ||
      config.url.endsWith("/v1/auth/refresh") ||
      config.url.endsWith("/v1/auth/logout")
    ) {
      console.log(
        "[API Interceptor] Skipping access token header for:",
        config.url,
      );
      return config;
    }

    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.log(
        "[API Interceptor] No access token found for request:",
        config.url,
      );
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// --- Response Interceptor: Handle 401 and Attempt Refresh ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is a 401 UNAUTHORIZED
    if (error.response?.status === 401) {
      if (
        originalRequest.url.endsWith("/v1/auth/login") ||
        originalRequest.url.endsWith("/v1/auth/logout") ||
        originalRequest.url.endsWith("/v1/auth/refresh") ||
        originalRequest._retry
      ) {
        console.log(
          "[API Interceptor] 401 on auth endpoint or retry attempt. Rejecting original request.",
          originalRequest.url,
        );
        return Promise.reject(error);
      }

      // Proceed with refresh logic only for non-auth requests
      if (isRefreshing) {
        // If a refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true; // Mark this request as retried
      isRefreshing = true;

      try {
        console.log("[API Interceptor] Calling refresh endpoint...");
        // Attempt to refresh the token (cookies should be sent due to withCredentials: true)
        const refreshResponse = await apiClient.post("/v1/auth/refresh");
        const newAccessToken = refreshResponse.data?.access_token; // Extract from {  { access_token: ... } }

        if (!newAccessToken) {
          throw new Error(
            `Refresh response missing 'access_token'. Got: ${
              JSON.stringify(refreshResponse.data)
            }`,
          );
        }

        console.log(
          "[API Interceptor] New access token received.",
        );

        // Update the access token in localStorage
        localStorage.setItem("access_token", newAccessToken);

        // Process queued requests with the new token
        processQueue(null, newAccessToken);

        // Retry the original request that failed with 401
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        isRefreshing = false;
        console.log(
          "[API Interceptor] Retrying original request after refresh.",
        );
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("[API Interceptor] Refresh failed:", refreshError);
        // Clear tokens and logout user if refresh fails
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        processQueue(refreshError, null);
        isRefreshing = false;

        // Optionally redirect to login page globally here if needed
        // window.location.href = '/auth/login';
        // Or show a toast
        toast.error("Session expired. Please log in again.");

        // Reject the original request with the refresh error
        return Promise.reject(refreshError);
      }
    }

    // If the error is not a 401, or if it was a 401 but handled above, reject the promise
    return Promise.reject(error);
  },
);

// --- Authentication Endpoints ---
/**
 * Registers a new user.
 * @param {Object} userData - The user's registration data (email, password, full_name).
 * @returns {Promise<Object>} The response data containing the new user info.
 */
export const registerUser = async (userData) => {
  try {
    const response = await apiClient.post("/v1/auth/register", userData);
    return response.data; // Returns { success: true,  { id, email, full_name, ... } }
  } catch (error) {
    console.error("Error registering user:", error);
    throw error; // Re-throw to be handled by caller
  }
};

/**
 * Logs in a user and returns an access token.
 * @param {Object} credentials - The user's login credentials (email, password).
 * @returns {Promise<Object>} The response data containing access token and user info.
 */
export const loginUser = async (credentials) => {
  try {
    const response = await apiClient.post("/v1/auth/login", credentials);
    return response.data; // Returns { success: true,  { access_token, user: { id, email, full_name, ... } } }
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
};

/**
 * Logs out the user by revoking the refresh token (assumes refresh token is handled via cookies).
 * @returns {Promise<void>} Resolves on successful logout.
 */
export const logoutUser = async () => {
  try {
    // Logout is a POST request, refresh token is sent via cookie
    await apiClient.post("/v1/auth/logout");
    // Response is 204 No Content, no data to return
  } catch (error) {
    console.error("Error logging out:", error);
    throw error;
  }
};

// --- Public Products Endpoints ---
/**
 * Fetches a paginated list of products.
 * @param {number} page - Page number (1-indexed).
 * @param {number} limit - Number of products per page.
 * @returns {Promise<Object>} The response data containing products array, pagination info, etc.
 */
export const fetchProducts = async (page = 1, limit = 20) => {
  try {
    const response = await apiClient.get("/v1/products", {
      params: {
        page,
        limit,
      },
    });
    // The API returns {  [...], page, limit, total, total_pages }
    // Return the *entire* response object. The component will destructure it.
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

/**
 * Fetches details of a specific product by its ID.
 * @param {string} id - The UUID of the product.
 * @returns {Promise<Object>} The response data containing the product details.
 */
export const fetchProductById = async (id) => {
  try {
    const response = await apiClient.get(`/v1/products/${id}`);
    // The API returns the product object directly
    return response.data;
  } catch (error) {
    console.error(`Error fetching product with id ${id}:`, error);
    throw error;
  }
};

/**
 * Searches for products based on various criteria.
 * @param {Object} searchParams - Object containing search parameters (query, category_id, brand, min_price, max_price, in_stock_only, include_discounted_only, page, limit, spec_filter).
 * @returns {Promise<Object>} The response data containing matching products array, pagination info, etc.
 */
export const searchProducts = async (searchParams = {}) => {
  try {
    // Default parameters
    const params = {
      page: 1,
      limit: 20,
      ...searchParams, // Spread the provided search parameters
    };

    // Convert boolean parameters to strings as expected by the API
    if (params.in_stock_only !== undefined) {
      params.in_stock_only = String(params.in_stock_only).toLowerCase();
    }
    if (params.include_discounted_only !== undefined) {
      params.include_discounted_only = String(params.include_discounted_only)
        .toLowerCase();
    }

    const response = await apiClient.get("/v1/products/search", { params });
    return response.data;
  } catch (error) {
    console.error("Error searching products:", error);
    throw error;
  }
};

/**
 * Fetches all product categories.
 * @returns {Promise<Array>} An array of category objects.
 */
export const fetchCategories = async () => {
  try {
    const response = await apiClient.get("/v1/products/categories");
    // The API returns the array of categories directly
    return response.data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};

/**
 * Fetches details of a specific category by its ID.
 * @param {string} id - The UUID of the category.
 * @returns {Promise<Object>} The response data containing the category details.
 */
export const fetchCategoryById = async (id) => {
  try {
    const response = await apiClient.get(`/v1/products/categories/${id}`);
    // The API returns the category object directly
    return response.data;
  } catch (error) {
    console.error(`Error fetching category with id ${id}:`, error);
    throw error;
  }
};

// --- Checkout Endpoints ---

/**
 * Places an order for a guest user using their session cart.
 * @param {Object} orderData - The order details including shipping address and payment method.
 * @returns {Promise<Object>} The response data containing the created order and items.
 */
export const placeGuestOrder = async (orderData) => {
  try {
    // Note: The session ID is handled automatically via the 'withCredentials: true' and cookies
    const response = await apiClient.post("/v1/checkout/guest", orderData);
    return response.data; // Returns { order: { ... }, items: [...] }
  } catch (error) {
    console.error("Error placing guest order:", error);
    throw error;
  }
};

// --- User Cart Endpoints (Require Authorization Token) ---
// Note: The interceptor handles adding the Authorization header automatically if token exists in localStorage
/**
 * Adds multiple items to the user's cart in a single request.
 * @param {Array<{product_id: string, quantity: number}>} items - Array of items to add.
 * @returns {Promise<Object>} The response data containing the updated cart summary.
 */
export const bulkAddToCart = async (items) => {
  try {
    const response = await apiClient.post("/v1/cart/add-bulk", {
      items: items,
    });
    return response.data; // Returns { message: "...", cart_summary: { ... } }
  } catch (error) {
    console.error("Error adding items to cart in bulk:", error);
    throw error;
  }
};

/**
 * Fetches the current user's cart.
 * @returns {Promise<Object>} The response data containing the cart details.
 */
export const fetchUserCart = async () => {
  // Token is automatically added by interceptor if present
  try {
    const response = await apiClient.get("/v1/cart");
    return response.data; // Returns the cart object
  } catch (error) {
    console.error("Error fetching user cart:", error);
    throw error;
  }
};

/**
 * Adds an item to the current user's cart.
 * @param {string} productId - The UUID of the product to add.
 * @param {number} quantity - The quantity to add.
 * @returns {Promise<Object>} The response data containing the added cart item details.
 */
export const addItemToCart = async (productId, quantity) => {
  // Token is automatically added by interceptor if present
  try {
    const response = await apiClient.post("/v1/cart/items", {
      product_id: productId,
      quantity: quantity,
    });
    return response.data; // Returns the added/updated cart item object
  } catch (error) {
    console.error("Error adding item to cart:", error);
    throw error;
  }
};

/**
 * Updates the quantity of an item in the current user's cart.
 * @param {string} itemId - The UUID of the cart item to update.
 * @param {number} quantity - The new quantity.
 * @returns {Promise<Object>} The response data containing the updated cart item details.
 */
export const updateCartItem = async (itemId, quantity) => {
  // Token is automatically added by interceptor if present
  try {
    const response = await apiClient.patch(`/v1/cart/items/${itemId}`, {
      quantity: quantity,
    });
    return response.data; // Returns the updated cart item object
  } catch (error) {
    console.error("Error updating cart item:", error);
    throw error;
  }
};

/**
 * Removes an item from the current user's cart.
 * @param {string} itemId - The UUID of the cart item to remove.
 * @returns {Promise<void>} Resolves on successful removal.
 */
export const removeCartItem = async (itemId) => {
  // Token is automatically added by interceptor if present
  try {
    await apiClient.delete(`/v1/cart/items/${itemId}`);
    // Response is 204 No Content, no data to return
  } catch (error) {
    console.error("Error removing item from cart:", error);
    throw error;
  }
};

/**
 * Clears the current user's cart.
 * @returns {Promise<void>} Resolves on successful clearing.
 */
export const clearUserCart = async () => {
  // Token is automatically added by interceptor if present
  try {
    await apiClient.delete("/v1/cart");
    // Response is 204 No Content, no data to return
  } catch (error) {
    console.error("Error clearing cart:", error);
    throw error;
  }
};

// --- User Orders Endpoints (Require Authorization Token) ---
/**
 * Creates a new order from the user's cart.
 * @param {Object} orderData - The order details (delivery_service_id, shipping_address, notes).
 * @returns {Promise<Object>} The response data containing the created order details.
 */
export const createOrder = async (orderData) => {
  // Token is automatically added by interceptor if present
  try {
    const response = await apiClient.post("/v1/orders", orderData);
    return response.data; // Returns the created order object
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
};

/**
 * Fetches details of a specific order belonging to the user.
 * @param {string} orderId - The UUID of the order.
 * @returns {Promise<Object>} The response data containing the order details.
 */
export const fetchOrderById = async (orderId) => {
  // Token is automatically added by interceptor if present
  try {
    const response = await apiClient.get(`/v1/orders/${orderId}`);
    return response.data; // Returns the order object
  } catch (error) {
    console.error(`Error fetching order with id ${orderId}:`, error);
    throw error;
  }
};

/**
 * Fetches a paginated list of orders for the current user.
 * @param {number} page - Page number (1-indexed).
 * @param {number} limit - Number of orders per page.
 * @returns {Promise<Object>} The response data containing orders array, pagination info, etc.
 */
export const fetchUserOrders = async (page = 1, limit = 20) => {
  // Token is automatically added by interceptor if present
  try {
    const response = await apiClient.get("/v1/orders", {
      params: {
        page,
        limit,
      },
    });
    return response.data; // Returns {  [...], page, limit, total, total_pages }
  } catch (error) {
    console.error("Error fetching user orders:", error);
    throw error;
  }
};

// --- User Profile Endpoints (Require Authorization Token) ---
// Assuming these endpoints exist and follow the pattern seen in admin
// Check actual API docs for exact paths and payload structure if they differ from admin

/**
 * Updates the current user's profile information (name, email).
 * @param {Object} profileData - The profile data to update.
 * @returns {Promise<Object>} The response data containing the updated user details.
 */
export const updateUserProfile = async (profileData) => {
  // Token is automatically added by interceptor if present
  try {
    const response = await apiClient.put("/v1/user/profile", profileData); // Check actual path
    return response.data.data; // Assuming response is { success: true,  { ...updated_user_data... } }
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

/**
 * Changes the current user's password.
 * @param {Object} passwordData - The password change data (current_password, new_password, confirm_password).
 * @returns {Promise<Object>} The response data confirming the password change.
 */
export const changeUserPassword = async (passwordData) => {
  // Token is automatically added by interceptor if present
  try {
    const response = await apiClient.put(
      "/v1/user/password/change",
      passwordData,
    ); // Check actual path
    return response.data; // Assuming response is { success: true, message: "Password changed successfully" }
  } catch (error) {
    console.error("Error changing user password:", error);
    throw error;
  }
};

// --- Delivery Options Endpoint (Require Authorization Token) ---
/**
 * Fetches the available delivery options for the user.
 * @returns {Promise<Array>} An array of delivery option objects.
 */
export const fetchDeliveryOptions = async () => {
  // Token is automatically added by interceptor if present
  try {
    const response = await apiClient.get("/v1/delivery-options");
    return response.data; // Returns the array of delivery options
  } catch (error) {
    console.error("Error fetching delivery options:", error);
    throw error;
  }
};

// --- Reviews Endpoint (Require Authorization Token) ---
/**
 * Submits a review for a product.
 * @param {string} productId - The UUID of the product.
 * @param {number} rating - The rating (1-5).
 * @returns {Promise<Object>} The response data containing the created review details.
 */
export const submitReview = async (productId, rating) => {
  // Token is automatically added by interceptor if present
  try {
    const response = await apiClient.post("/v1/reviews", {
      product_id: productId,
      rating: rating,
    });
    return response.data; // Returns the created review object
  } catch (error) {
    console.error("Error submitting review:", error);
    throw error;
  }
};

// --- Health Check Endpoint ---
/**
 * Checks the health of the API service.
 * @returns {Promise<Object>} The response data containing the health status.
 */
export const checkHealth = async () => {
  try {
    const response = await apiClient.get("/health");
    return response.data; // Returns { status: "ok", timestamp: "..." }
  } catch (error) {
    console.error("Error checking health:", error);
    throw error; // Might throw a 500 error response
  }
};

export default apiClient;
