import axios from "axios";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_URL ||
  "http://localhost:8080/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request Interceptor: Attach Access Token (EXCEPT for login, logout, and refresh endpoints)
apiClient.interceptors.request.use(
  (config) => {
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

// Response Interceptor: Handle 401 and Attempt Refresh
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
        originalRequest._retry // Prevent loops if _retry is incorrectly set before reaching here for non-auth requests
      ) {
        console.log(
          "[API Interceptor] 401 on login/refresh/logout or retry attempt. Rejecting original request.",
          originalRequest.url,
        );
        return Promise.reject(error);
      }

      // Proceed with refresh logic only for non-auth requests
      if (isRefreshing) {
        // If a refresh is already in progress, queue this request
        console.log(
          "[API Interceptor] Queuing request while refresh is in progress:",
          originalRequest.url,
        );
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            console.log(
              "[API Interceptor] Retry queued request with new token:",
              originalRequest.url,
            );
            return apiClient(originalRequest);
          })
          .catch((err) => {
            console.log(
              "[API Interceptor] Queued request failed after refresh attempt:",
              originalRequest.url,
            );
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      console.log("[API Interceptor] Starting token refresh process...");

      try {
        console.log("[API Interceptor] Calling refresh endpoint...");

        const refreshResponse = await apiClient.post("/v1/auth/refresh");
        const newAccessToken = refreshResponse.data?.access_token;

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
        console.log(
          "[API Interceptor] Processing queued requests with new token...",
        );
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
        console.error(
          "[API Interceptor] Status:",
          refreshError.response?.status,
        );
        console.error("[API Interceptor] Data:", refreshError.response?.data);

        // The refresh endpoint returned an error (likely 401 because refresh token is invalid/expired)
        // Clear tokens and logout user
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        console.log("[API Interceptor] Tokens cleared after refresh failure.");

        // Process queued requests with the refresh error, rejecting them
        processQueue(refreshError, null);
        isRefreshing = false; // Ensure the flag is reset even after failure

        // Optionally redirect to login page globally here if needed
        window.location.href = "/auth/login";
        // Or show a toast
        toast.error("Session expired. Please log in again.");

        return Promise.reject(refreshError);
      }
    }

    // If the error is not a 401, or if it was a 401 but handled above, reject the promise
    return Promise.reject(error);
  },
);

// --- Auth API Functions ---
export const login = (email, password) =>
  apiClient.post("/v1/auth/login", { email, password });
export const logout = () => apiClient.post("/v1/auth/logout");

// --- Admin API Functions ---
// Product Crud
//
// Fetch all products
export const fetchProducts = (page = 1, limit = 20) => {
  const params = { page, limit };
  return apiClient.get("/v1/admin/products", { params });
};
// Search Product with filters
export const searchProducts = (q, page = 1, limit = 20, filters = {}) => {
  const params = {
    q,
    page,
    limit,
    ...filters,
  };
  Object.keys(params).forEach((key) => {
    if (params[key] === undefined || params[key] === "") {
      delete params[key];
    }
  });

  return apiClient.get("/v1/products/search", { params }); // Use the search endpoint
};
// Fetch Products by ID
export const fetchProductById = (id) =>
  apiClient.get(`/v1/admin/products/${id}`);
// Create Product
export const createProduct = (formData) =>
  apiClient.post("/v1/admin/products", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
// Update Product
export const updateProductDetailsAndImages = (id, formData) =>
  apiClient.patch(`/v1/admin/products/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
// Delete Product by ID
export const deleteProduct = (id) =>
  apiClient.delete(`/v1/admin/products/${id}`);

/**
 * Create a new delivery service.
 * @param {Object} deliveryServiceData - The delivery service data to create.
 * @param {string} deliveryServiceData.name
 * @param {string} deliveryServiceData.description
 * @param {number} deliveryServiceData.base_cost_cents
 * @param {number} deliveryServiceData.estimated_days
 * @param {boolean} deliveryServiceData.is_active
 */
export const createDeliveryService = (deliveryServiceData) => {
  return apiClient.post("/v1/admin/delivery-services", deliveryServiceData);
};

/**
 * Fetch a specific delivery service by ID.
 * @param {string} id - The UUID of the delivery service.
 */
export const fetchDeliveryServiceById = (id) => {
  return apiClient.get(`/v1/admin/delivery-services/${id}`);
};

/**
 * Fetch the list of delivery services.
 * @param {Object} [params] - Optional query parameters.
 * @param {boolean} [params.active_only] - Filter for active services only.
 * @param {number} [params.page] - Page number.
 * @param {number} [params.limit] - Items per page.
 */
export const fetchDeliveryServices = (params = {}) => {
  return apiClient.get("/v1/admin/delivery-services", { params });
};

/**
 * Update an existing delivery service.
 * @param {string} id - The UUID of the delivery service to update.
 * @param {Object} deliveryServiceData - The data to update (partial allowed).
 */
export const updateDeliveryService = (id, deliveryServiceData) => {
  return apiClient.patch(
    `/v1/admin/delivery-services/${id}`,
    deliveryServiceData,
  );
};

/**
 * Delete a specific delivery service by ID.
 * @param {string} id - The UUID of the delivery service to delete.
 */
export const deleteDeliveryService = (id) => {
  return apiClient.delete(`/v1/admin/delivery-services/${id}`);
};

// ---  User Management API Functions ---

/**
 * Fetch the list of users.
 * @param {Object} [params] - Optional query parameters.
 * @param {boolean} [params.active_only] - Filter for active users only.
 * @param {number} [params.page] - Page number.
 * @param {number} [params.limit] - Items per page.
 */
export const fetchUsers = (params = {}) => {
  return apiClient.get("/v1/admin/users", { params });
};

/**
 * Fetch details of a specific user by ID.
 * @param {string} id - The UUID of the user.
 */
export const fetchUserById = (id) => {
  return apiClient.get(`/v1/admin/users/${id}`);
};

/**
 * Activate a user account (soft-delete reversal).
 * @param {string} userId - The UUID of the user to activate.
 */
export const activateUser = (userId) => {
  return apiClient.post(`/v1/admin/users/${userId}/activate`);
};

/**
 * Deactivate a user account (soft-delete).
 * @param {string} userId - The UUID of the user to deactivate.
 */
export const deactivateUser = (userId) => {
  return apiClient.post(`/v1/admin/users/${userId}/deactivate`);
};
/**
 * Update the authenticated user's profile information (name, email).
 * @param {Object} profileData - The profile data to update.
 * @param {string} [profileData.full_name] - The new full name.
 * @param {string} [profileData.email] - The new email address.
 */
export const updateUserProfile = (profileData) => {
  return apiClient.put("/v1/user/profile", profileData);
};

/**
 * Change the authenticated user's password.
 * @param {Object} passwordData - The password change data.
 * @param {string} passwordData.current_password - The user's current password.
 * @param {string} passwordData.new_password - The new password.
 * @param {string} passwordData.confirm_password - Confirmation of the new password.
 */
export const changeUserPassword = (passwordData) => {
  return apiClient.put("/v1/user/password/change", passwordData);
};

// --- Discounts ---
// Existing functions:
/**
 * Fetch the list of discounts.
 * @param {Object} [params] - Optional query parameters.
 * @param {boolean} [params.is_active] - Filter by active status (e.g., true/false).
 * @param {number} [params.page] - Page number.
 * @param {number} [params.limit] - Items per page.
 */
export const fetchDiscounts = (params = {}) => {
  return apiClient.get("/v1/admin/discounts", { params });
};
export const fetchActiveDiscounts = () =>
  apiClient.get("/v1/admin/discounts", {
    params: {
      is_active: true,
    },
  });
export const fetchProductDiscounts = (productId) =>
  apiClient.get(`/v1/admin/discounts/product/${productId}`);

/**
 * Create a new discount.
 * @param {Object} discountData - The discount data to create.
 */
export const createDiscount = (discountData) => {
  return apiClient.post("/v1/admin/discounts", discountData);
};

/**
 * Fetch details of a specific discount by ID.
 * @param {string} id - The UUID of the discount.
 */
export const fetchDiscountById = (id) => {
  return apiClient.get(`/v1/admin/discounts/${id}`);
};

/**
 * Update an existing discount.
 * @param {string} id - The UUID of the discount to update.
 * @param {Object} discountData - The data to update (partial allowed).
 */
export const updateDiscount = (id, discountData) => {
  return apiClient.put(`/v1/admin/discounts/${id}`, discountData);
};

/**
 * Delete a specific discount by ID.
 * @param {string} id - The UUID of the discount to delete.
 */
export const deleteDiscount = (id) => {
  return apiClient.delete(`/v1/admin/discounts/${id}`);
};

/**
 * Link a discount to a specific product.
 * @param {string} discountId - The UUID of the discount.
 * @param {string} productId - The UUID of the product to link.
 */
export const linkProductDiscount = (discountId, productId) => {
  return apiClient.post(`/v1/admin/discounts/${discountId}/link/product`, {
    product_id: productId,
  });
};

/**
 * Unlink a discount from a specific product.
 * @param {string} discountId - The UUID of the discount.
 * @param {string} productId - The UUID of the product to unlink.
 */
export const unlinkProductDiscount = (discountId, productId) => {
  return apiClient.post(`/v1/admin/discounts/${discountId}/unlink/product`, {
    product_id: productId,
  });
};

/**
 * Fetch the list of all categories.
 */
export const fetchCategories = () => apiClient.get("/v1/admin/categories");

/**
 * Create a new product category.
 * @param {Object} categoryData - The category data to create.
 * @param {string} categoryData.name
 * @param {string} categoryData.type
 */
export const createCategory = (categoryData) => {
  return apiClient.post("/v1/admin/categories", categoryData);
};

/**
 * Fetch details of a specific category by ID.
 * @param {string} id - The UUID of the category.
 */
export const fetchCategoryById = (id) => {
  return apiClient.get(`/v1/admin/categories/${id}`);
};

/**
 * Update an existing product category.
 * @param {string} id - The UUID of the category to update.
 * @param {Object} categoryData - The data to update (partial allowed).
 */
export const updateCategory = (id, categoryData) => {
  return apiClient.put(`/v1/admin/categories/${id}`, categoryData);
};

/**
 * Delete a specific product category.
 * @param {string} id - The UUID of the category to delete.
 */
export const deleteCategory = (id) => {
  return apiClient.delete(`/v1/admin/categories/${id}`);
};

/**
 * Fetch the list of all orders.
 * @param {Object} [params] - Optional query parameters.
 * @param {string} [params.user_id] - Filter by user ID.
 * @param {string} [params.status] - Filter by order status.
 * @param {number} [params.page] - Page number.
 * @param {number} [params.limit] - Items per page.
 */
export const fetchOrders = (params = {}) => {
  return apiClient.get("/v1/admin/orders/all", { params });
};

/**
 * Fetch details of a specific order by ID.
 * @param {string} id - The UUID of the order.
 */
export const fetchOrderById = (id) => {
  return apiClient.get(`/v1/admin/orders/${id}`);
};

/**
 * Update the status of a specific order.
 * @param {string} orderId - The UUID of the order to update.
 * @param {Object} statusData - The status data to update.
 * @param {string} statusData.status - The new status (pending, confirmed, shipped, delivered, cancelled).
 */
export const updateOrderStatus = (orderId, statusData) => {
  return apiClient.put(`/v1/admin/orders/${orderId}/status`, statusData);
};

/**
 * Cancel a specific order.
 * @param {string} orderId - The UUID of the order to cancel.
 */
export const cancelOrder = (orderId) => {
  return apiClient.put(`/v1/admin/orders/${orderId}/cancel`);
};

// --- Analytics API Functions ---
/**
 * Get total revenue from delivered orders within a time range.
 * @param {Object} [params] - Optional query parameters.
 * @param {string} [params.start_date] - Start date in ISO 8601 format.
 * @param {string} [params.end_date] - End date in ISO 8601 format.
 */
export const fetchRevenueAnalytics = (params = {}) => {
  return apiClient.get("/v1/admin/analytics/revenue", { params });
};

/**
 * Get total number of delivered orders within a time range.
 * @param {Object} [params] - Optional query parameters.
 * @param {string} [params.start_date] - Start date in ISO 8601 format.
 * @param {string} [params.end_date] - End date in ISO 8601 format.
 */
export const fetchSalesVolumeAnalytics = (params = {}) => {
  return apiClient.get("/v1/admin/analytics/sales-volume", { params });
};

/**
 * Get average order value (AOV) for delivered orders within a time range.
 * @param {Object} [params] - Optional query parameters.
 * @param {string} [params.start_date] - Start date in ISO 8601 format.
 * @param {string} [params.end_date] - End date in ISO 8601 format.
 */
export const fetchAverageOrderValueAnalytics = (params = {}) => {
  return apiClient.get("/v1/admin/analytics/average-order-value", { params });
};

/**
 * Get top N selling products by quantity within a time range.
 * @param {Object} [params] - Optional query parameters.
 * @param {string} [params.start_date] - Start date in ISO 8601 format.
 * @param {string} [params.end_date] - End date in ISO 8601 format.
 * @param {number} [params.limit] - Number of top products to return.
 */
export const fetchTopProductsAnalytics = (params = {}) => {
  return apiClient.get("/v1/admin/analytics/top-products", { params });
};

/**
 * Get top N selling categories by quantity within a time range.
 * @param {Object} [params] - Optional query parameters.
 * @param {string} [params.start_date] - Start date in ISO 8601 format.
 * @param {string} [params.end_date] - End date in ISO 8601 format.
 * @param {number} [params.limit] - Number of top categories to return.
 */
export const fetchTopCategoriesAnalytics = (params = {}) => {
  return apiClient.get("/v1/admin/analytics/top-categories", { params });
};

/**
 * Get products with stock quantity below a specified threshold.
 * @param {Object} params - Query parameters.
 * @param {number} params.threshold - The minimum stock quantity threshold.
 */
export const fetchLowStockAnalytics = (params = {}) => {
  // Ensure threshold is provided and is a number
  if (typeof params.threshold !== "number" || params.threshold <= 0) {
    throw new Error(
      "Threshold parameter is required and must be a positive number.",
    );
  }
  return apiClient.get("/v1/admin/analytics/low-stock", { params });
};

/**
 * Get count of new customer registrations within a time range.
 * @param {Object} [params] - Optional query parameters.
 * @param {string} [params.start_date] - Start date in ISO 8601 format.
 * @param {string} [params.end_date] - End date in ISO 8601 format.
 */
export const fetchNewCustomersAnalytics = (params = {}) => {
  return apiClient.get("/v1/admin/analytics/new-customers", { params });
};

/**
 * Get count of orders for each status within a time range.
 * @param {Object} [params] - Optional query parameters.
 * @param {string} [params.start_date] - Start date in ISO 8601 format.
 * @param {string} [params.end_date] - End date in ISO 8601 format.
 */
export const fetchOrderStatusCountsAnalytics = (params = {}) => {
  return apiClient.get("/v1/admin/analytics/order-status-counts", { params });
};

export default apiClient;
