package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/MihoZaki/DzTech/internal/services"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// OrderHandler manages HTTP requests for order-related operations.
type OrderHandler struct {
	service *services.OrderService
	logger  *slog.Logger
}

// NewOrderHandler creates a new instance of OrderHandler.
func NewOrderHandler(service *services.OrderService, logger *slog.Logger) *OrderHandler {
	return &OrderHandler{
		service: service,
		logger:  logger,
	}
}

// RegisterUserRoutes registers the order-related routes accessible to authenticated users.
func (h *OrderHandler) RegisterUserRoutes(r chi.Router) {
	r.Post("/", h.CreateOrder)   // POST /api/v1/orders (checkout)
	r.Get("/{id}", h.GetOrder)   // GET /api/v1/orders/{id}
	r.Get("/", h.ListUserOrders) // GET /api/v1/orders?page=&limit=&status=

}

// RegisterAdminRoutes registers the order-related routes accessible only to admins.
func (h *OrderHandler) RegisterAdminRoutes(r chi.Router) {
	r.Get("/all", h.ListAllOrders)             // GET /api/v1/admin/orders/all?page=&limit=&user_id=&status=
	r.Get("/{id}", h.GetOrderByID)             // GET /api/v1/admin/orders/{id} (admin access)
	r.Put("/{id}/status", h.UpdateOrderStatus) // PUT /api/v1/admin/orders/{id}/status
	r.Put("/{id}/cancel", h.CancelOrder)       // PUT /api/v1/admin/orders/{id}/cancel
}

// CreateOrder handles the creation of a new order.
// Expected JSON body: models.CreateOrderRequest
// Requires UserID from JWT context.
func (h *OrderHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	// 1. Extract UserID from JWT context (existing logic)
	var userIDVal *uuid.UUID
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user accessing order", "user_id", user.ID)
		userIDVal = &user.ID
	}
	if userIDVal == nil {
		http.Error(w, "Unauthorized: missing user context", http.StatusUnauthorized)
		return
	}
	userID := *userIDVal // Dereference for easier use

	// 2. Decode Request Body into CreateOrderFromCartRequest
	var req models.CreateOrderFromCartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON in request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 3. Validate the request struct
	if err := req.Validate(); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 4. Call the Service Method
	orderSummary, err := h.service.CreateOrder(r.Context(), req, userID) // Pass the NEW req and userID
	if err != nil {
		// Log the error server-side
		h.logger.Error("Failed to create order", "error", err, "user_id", userID)
		// Return a generic error message to the client
		http.Error(w, "Failed to create order: "+err.Error(), http.StatusInternalServerError) // More specific error message
		return
	}

	// 5. Send Success Response (201 Created) (existing logic)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated) // 201 Created
	if err := json.NewEncoder(w).Encode(orderSummary); err != nil {
		// Log encoding error, but response headers might already be sent
		h.logger.Error("Failed to encode CreateOrder response", "error", err)
	}
}

// GetOrder handles retrieving a specific order by its ID.
// Requires the order to belong to the authenticated user (UserID from JWT context).
func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	// Extract OrderID from URL path
	orderIDStr := chi.URLParam(r, "id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		http.Error(w, "Invalid order ID format", http.StatusBadRequest)
		return
	}

	// Extract UserID from JWT context
	var userIDVal *uuid.UUID
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user accessing cart", "user_id", user.ID)
		userIDVal = &user.ID
		// sessionID remains empty for authenticated users
	}
	if userIDVal == nil {
		http.Error(w, "Unauthorized: missing user context", http.StatusUnauthorized)
		return
	}

	orderWithItems, err := h.service.GetOrder(r.Context(), orderID)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			http.Error(w, "Order not found", http.StatusNotFound)
			return
		}
		h.logger.Error("Failed to get order", "error", err, "order_id", orderID, "user_id", *userIDVal)
		http.Error(w, "Failed to retrieve order", http.StatusInternalServerError)
		return
	}

	// Check if the order belongs to the requesting user
	if orderWithItems.Order.UserID != *userIDVal {
		// Log potential security issue
		h.logger.Warn("User attempted to access another user's order", "requesting_user_id", *userIDVal, "order_owner_id", orderWithItems.Order.UserID, "order_id", orderID)
		http.Error(w, "Forbidden: access denied", http.StatusForbidden)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(orderWithItems); err != nil {
		h.logger.Error("Failed to encode GetOrder response", "error", err)
	}
}

// GetOrderByID handles retrieving a specific order by its ID (admin only).
// Does NOT check if the order belongs to the requesting user.
func (h *OrderHandler) GetOrderByID(w http.ResponseWriter, r *http.Request) {
	// Extract OrderID from URL path
	orderIDStr := chi.URLParam(r, "id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		http.Error(w, "Invalid order ID format", http.StatusBadRequest)
		return
	}
	var userID *uuid.UUID
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user accessing cart", "user_id", user.ID)
		userID = &user.ID
		// sessionID remains empty for authenticated users
	}
	if userID == nil {
		http.Error(w, "Unauthorized: missing user context", http.StatusUnauthorized)
		return
	}

	// Fetch the order with items using the service
	orderWithItems, err := h.service.GetOrder(r.Context(), orderID)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			http.Error(w, "Order not found", http.StatusNotFound)
			return
		}
		h.logger.Error("Failed to get order by ID (admin)", "error", err, "order_id", orderID, "user_id", userID)
		http.Error(w, "Failed to retrieve order", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(orderWithItems); err != nil {
		h.logger.Error("Failed to encode GetOrderByID response", "error", err)
	}
}

// ListUserOrders handles listing orders for the authenticated user.
// Requires UserID from JWT context.
func (h *OrderHandler) ListUserOrders(w http.ResponseWriter, r *http.Request) {
	// Extract UserID from JWT context
	var userIDVal *uuid.UUID
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user accessing cart", "user_id", user.ID)
		userIDVal = &user.ID
		// sessionID remains empty for authenticated users
	}
	if userIDVal == nil {
		http.Error(w, "Unauthorized: missing user context", http.StatusUnauthorized)
		return
	}

	// Parse query parameters for pagination and filtering
	statusFilter := r.URL.Query().Get("status")
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1 // Default page
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		} // else, keep default
	}

	limit := 20 // Default limit
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		} // else, keep default
	}

	// Call the service method which now returns PaginatedResponse
	paginatedResult, err := h.service.ListUserOrders(r.Context(), *userIDVal, statusFilter, page, limit)
	if err != nil {
		h.logger.Error("Failed to list user orders", "error", err, "user_id", *userIDVal)
		http.Error(w, "Failed to retrieve orders", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	// Encode the PaginatedResponse struct directly
	if err := json.NewEncoder(w).Encode(paginatedResult); err != nil {
		h.logger.Error("Failed to encode ListUserOrders response", "error", err)
	}
}

// ListAllOrders handles listing all orders (admin only).
// Requires UserID from JWT context and admin privileges
func (h *OrderHandler) ListAllOrders(w http.ResponseWriter, r *http.Request) {
	// Extract UserID from JWT context
	var userIDVal *uuid.UUID
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user accessing cart", "user_id", user.ID)
		userIDVal = &user.ID
		// sessionID remains empty for authenticated users
	}
	if userIDVal == nil {
		http.Error(w, "Unauthorized: missing user context", http.StatusUnauthorized)
		return
	}
	// Parse query parameters for pagination and filtering
	userFilterStr := r.URL.Query().Get("user_id")
	statusFilter := r.URL.Query().Get("status")
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	var userFilterID uuid.UUID // Zero value if not provided
	if userFilterStr != "" {
		if parsedID, err := uuid.Parse(userFilterStr); err != nil {
			http.Error(w, "Invalid user ID filter format", http.StatusBadRequest)
			return
		} else {
			userFilterID = parsedID
		}
	}

	page := 1 // Default page
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		} // else, keep default
	}

	limit := 20 // Default limit
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		} // else, keep default
	}

	// Call the service method which now returns PaginatedResponse
	paginatedResult, err := h.service.ListAllOrders(r.Context(), userFilterID, statusFilter, page, limit)
	if err != nil {
		h.logger.Error("Failed to list all orders", "error", err, "user_id", *userIDVal) // Log the admin user ID making the request
		http.Error(w, "Failed to retrieve orders", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	// Encode the PaginatedResponse struct directly
	if err := json.NewEncoder(w).Encode(paginatedResult); err != nil {
		h.logger.Error("Failed to encode ListAllOrders response", "error", err)
	}
}

// UpdateOrderStatus handles updating the status of an order (admin only).
// Expected JSON body: models.UpdateOrderStatusRequest
// Requires UserID from JWT context and admin privileges.
func (h *OrderHandler) UpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	// Extract OrderID from URL path
	orderIDStr := chi.URLParam(r, "id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		http.Error(w, "Invalid order ID format", http.StatusBadRequest)
		return
	}

	var userIDVal *uuid.UUID
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user accessing cart", "user_id", user.ID)
		userIDVal = &user.ID
		// sessionID remains empty for authenticated users
	}
	if userIDVal == nil {
		http.Error(w, "Unauthorized: missing user context", http.StatusUnauthorized)
		return
	}

	var req models.UpdateOrderStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON in request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Validate the request struct (optional, if using validator tags)
	if err := req.Validate(); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	updatedOrder, err := h.service.UpdateOrderStatus(r.Context(), orderID, req)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			http.Error(w, "Order not found", http.StatusNotFound)
			return
		}
		// Check for other specific errors like invalid status transition
		var statusErr *services.StatusTransitionError //
		if errors.As(err, &statusErr) {
			http.Error(w, err.Error(), http.StatusConflict) // 409 Conflict for invalid transitions
			return
		}
		h.logger.Error("Failed to update order status", "error", err, "order_id", orderID, "user_id", *userIDVal, "new_status", req.Status)
		http.Error(w, "Failed to update order status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(updatedOrder); err != nil {
		h.logger.Error("Failed to encode UpdateOrderStatus response", "error", err)
	}
}

// CancelOrder handles cancelling an order (admin only).
// Requires UserID from JWT context and admin privileges.
func (h *OrderHandler) CancelOrder(w http.ResponseWriter, r *http.Request) {
	// Extract OrderID from URL path
	orderIDStr := chi.URLParam(r, "id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		http.Error(w, "Invalid order ID format", http.StatusBadRequest)
		return
	}

	var userIDVal *uuid.UUID
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user accessing cart", "user_id", user.ID)
		userIDVal = &user.ID
		// sessionID remains empty for authenticated users
	}
	if userIDVal == nil {
		http.Error(w, "Unauthorized: missing user context", http.StatusUnauthorized)
		return
	}

	updatedOrder, err := h.service.CancelOrder(r.Context(), orderID)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			http.Error(w, "Order not found", http.StatusNotFound)
			return
		}
		// Check for other specific errors like cannot cancel in current state
		var cancelErr *services.CannotCancelError //
		if errors.As(err, &cancelErr) {
			http.Error(w, err.Error(), http.StatusConflict) // 409 Conflict for invalid cancellation
			return
		}
		h.logger.Error("Failed to cancel order", "error", err, "order_id", orderID, "user_id", *userIDVal)
		http.Error(w, "Failed to cancel order", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(updatedOrder); err != nil {
		h.logger.Error("Failed to encode CancelOrder response", "error", err)
	}
}
