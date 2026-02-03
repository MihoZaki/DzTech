package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/MihoZaki/DzTech/internal/services"
	"github.com/MihoZaki/DzTech/internal/utils"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type CartHandler struct {
	cartService    *services.CartService
	productService *services.ProductService // Might be needed for future operations
	logger         *slog.Logger
}

func NewCartHandler(cartService *services.CartService, productService *services.ProductService, logger *slog.Logger) *CartHandler {
	return &CartHandler{
		cartService:    cartService,
		productService: productService,
		logger:         logger,
	}
}
func (h *CartHandler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.GetCart)                            // GET /cart
	r.Post("/items", h.AddItem)                      // POST /cart/items <- Add this line
	r.Patch("/items/{itemID}", h.UpdateItemQuantity) // PATCH /cart/items/{id}
	r.Post("/add-bulk", h.AddBulkItemsToCart)
	r.Delete("/items/{itemID}", h.RemoveItem) // DELETE /cart/items/{id} - Add this line
	r.Delete("/", h.ClearCart)                // DELETE /cart - Add this line
}

// getSessionIDFromCookie extracts the session ID from the "session_id" cookie.
// It logs if the cookie is missing but doesn't send an error response.
func (h *CartHandler) getSessionIDFromCookie(r *http.Request) (string, bool) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		h.logger.Debug("Session cookie not found in request", "error", err)
		return "", false
	}
	return cookie.Value, true
}

// setSessionIDCookie sets the "session_id" cookie in the response.
// It generates a new UUID if no session ID exists yet.
// It configures the cookie with HttpOnly and SameSite flags for security.
// Adjust Secure flag based on whether you are using HTTPS.
func (h *CartHandler) setSessionIDCookie(w http.ResponseWriter, sessionID string) {
	if sessionID == "" {
		// Generate a new session ID if none exists
		sessionID = uuid.New().String()
		h.logger.Debug("Generated new session ID for cookie", "session_id", sessionID)
	}

	cookie := &http.Cookie{
		Name:     "session_id",            // Name of the cookie
		Value:    sessionID,               // The session ID value
		Path:     "/",                     // Cookie is valid for the entire site
		HttpOnly: true,                    // Prevents JavaScript access (security)
		Secure:   false,                   // Set to true if using HTTPS in production
		SameSite: http.SameSiteStrictMode, // Mitigate CSRF (adjust if needed for cross-origin requests)
		MaxAge:   86400,                   // Cookie expires in 24 hours (86400 seconds)
		// Expires:  time.Now().Add(24 * time.Hour), // Alternative to MaxAge
	}

	http.SetCookie(w, cookie) // Add the cookie to the response headers
}

// GetCart retrieves the current user's or guest's cart.
// Expected Headers: Authorization (Bearer token) for authenticated users.
//
//	Session ID is retrieved from the "session_id" cookie for guest users.
//
// Response: 200 OK with CartSummary JSON. Sets "session_id" cookie if it didn't exist for guests.
//
//	400 Bad Request if neither auth nor session cookie is provided (for guests).
//	500 Internal Server Error if backend fails.
func (h *CartHandler) GetCart(w http.ResponseWriter, r *http.Request) {
	var userID *uuid.UUID
	var sessionID string

	// Extract user ID from context if authenticated
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user accessing cart", "user_id", user.ID)
		userID = &user.ID
		// sessionID remains empty for authenticated users
	} else {
		// Fall back to session ID from cookie for guest users
		var hasSessionCookie bool
		sessionID, hasSessionCookie = h.getSessionIDFromCookie(r)
		if !hasSessionCookie {
			// If no session cookie exists, we might still want to initialize a cart for a guest,
			// but we need a session ID. The service layer will generate one if needed.
			// The handler should then set the cookie.
			// For now, let's assume we want to allow the request to proceed to the service,
			// which will generate a session ID if necessary, and then we set the cookie here.
			sessionID = uuid.New().String()
			h.logger.Debug("No session cookie found, generated new session ID for guest cart request", "session_id", sessionID)
			// Do NOT set the cookie yet. We need to call the service first to ensure the cart exists/gets created.
			// The service might need to interact with the database based on the session ID.
		}
		h.logger.Debug("Guest user accessing cart", "session_id", sessionID)
	}

	// Call the service with the determined userID or sessionID
	cartSummary, err := h.cartService.GetCartForContext(r.Context(), userID, sessionID)
	if err != nil {
		// Log the specific error from the service
		if userID != nil {
			h.logger.Error("Failed to get user cart", "user_id", *userID, "error", err)
		} else {
			h.logger.Error("Failed to get guest cart", "session_id", sessionID, "error", err)
		}
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to retrieve cart.")
		return
	}

	// If the request was for a guest and we generated a new session ID (or just read an existing one),
	// ensure the cookie is set in the response.
	if userID == nil { // Only for guests
		if !h.hasSessionCookie(r) {
			h.setSessionIDCookie(w, sessionID) // Set the cookie with the session ID used
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cartSummary)
}

// AddItem adds an item to the current user's or guest's cart.
// Expected Headers: Authorization (Bearer token) for authenticated users.
//
//	Session ID is retrieved from the "session_id" cookie for guest users.
//
// Expected Body: JSON { "product_id": "uuid-string", "quantity": number }
// Response: 200 OK with updated CartItem JSON. Sets "session_id" cookie if it didn't exist for guests.
//
//	400 Bad Request if input is invalid, or neither auth nor session cookie is provided (for guests).
//	404 Not Found if product doesn't exist.
//	409 Conflict if requested quantity exceeds stock (handled by DB/service).
//	500 Internal Server Error if backend fails.
func (h *CartHandler) AddItem(w http.ResponseWriter, r *http.Request) {
	var userID *uuid.UUID
	var sessionID string

	// Extract user ID from context if authenticated
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user adding item to cart", "user_id", user.ID)
		userID = &user.ID
		// sessionID remains empty for authenticated users
	} else {
		// Fall back to session ID from cookie for guest users
		var hasSessionCookie bool
		sessionID, hasSessionCookie = h.getSessionIDFromCookie(r)
		if !hasSessionCookie {
			// Generate a new session ID if the cookie is missing for a guest request
			sessionID = uuid.New().String()
			h.logger.Debug("No session cookie found, generated new session ID for guest add item request", "session_id", sessionID)
		}
		h.logger.Debug("Guest user adding item to cart", "session_id", sessionID)
	}

	h.logger.Debug("Handling cart add item request")

	// Parse the request body
	var req models.AddItemRequest // Use the struct from models package
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Invalid JSON body.")
		h.logger.Debug("Failed to decode add item request body", "error", err)
		return
	}

	// Validate the request struct using the Validate method defined in models/cart.go
	err = req.Validate() // Call the Validate method on the received struct
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", fmt.Sprintf("Validation failed: %v", err))
		h.logger.Debug("Add item request validation failed", "request", req, "error", err)
		return
	}

	// Parse the product ID string into a UUID (validate tag already checked format)
	productID, err := uuid.Parse(req.ProductID)
	if err != nil {
		// This should theoretically not happen if validator worked correctly,
		// but good practice to handle it.
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Invalid product ID format after validation.")
		h.logger.Error("Unexpected parsing error after validation", "product_id_str", req.ProductID, "error", err)
		return
	}

	h.logger.Debug("Adding item to cart", "user_id", userID, "session_id", sessionID, "product_id", productID, "quantity", req.Quantity)

	// Call the service to add the item (passes userID if present, otherwise sessionID)
	updatedOrNewItem, err := h.cartService.AddItemToCart(r.Context(), userID, sessionID, productID, req.Quantity)
	if err != nil {
		// Log the specific error from the service
		h.logger.Error("Failed to add item to cart", "user_id", userID, "session_id", sessionID, "product_id", productID, "quantity", req.Quantity, "error", err)

		// Check for specific known errors like stock issues
		errMsg := strings.ToLower(err.Error())
		if strings.Contains(errMsg, "stock") || strings.Contains(errMsg, "check") {
			utils.SendErrorResponse(w, http.StatusConflict, "Conflict", "Requested quantity exceeds available stock or other constraint violated.")
			return
		}

		// Generic error for other failures
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to add item to cart.")
		return
	}

	// If the request was for a guest and we generated a new session ID, set the cookie.
	if userID == nil && !h.hasSessionCookie(r) { // Only for guests who didn't have a cookie initially
		h.setSessionIDCookie(w, sessionID)
	}

	// Successfully added/updated item
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedOrNewItem) // Encode the item returned by the service
}

// Helper to check if session cookie exists (used in AddItem, UpdateItemQuantity, RemoveItem, ClearCart)
func (h *CartHandler) hasSessionCookie(r *http.Request) bool {
	_, err := r.Cookie("session_id")
	return err == nil
}

// UpdateItemQuantity updates the quantity of an existing item in the current user's or guest's cart.
// Expected Headers: Authorization (Bearer token) for authenticated users.
//
//	Session ID is retrieved from the "session_id" cookie for guest users.
//
// Expected URL Param: itemID (UUID string)
// Expected Body: JSON { "quantity": number }
// Response: 200 OK with updated CartItem JSON. Sets "session_id" cookie if it didn't exist for guests.
//
//	400 Bad Request if input is invalid, session ID is missing, or item ID is invalid.
//	404 Not Found if the cart item doesn't exist.
//	403 Forbidden if the item doesn't belong to the user's/guest's cart.
//	409 Conflict if requested quantity exceeds stock (handled by DB/service).
//	500 Internal Server Error if backend fails.
func (h *CartHandler) UpdateItemQuantity(w http.ResponseWriter, r *http.Request) {
	var userID *uuid.UUID
	var sessionID string

	// Extract user ID from context if authenticated
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user updating item quantity in cart", "user_id", user.ID)
		userID = &user.ID
		// sessionID remains empty for authenticated users
	} else {
		// Fall back to session ID from cookie for guest users
		var hasSessionCookie bool
		sessionID, hasSessionCookie = h.getSessionIDFromCookie(r)
		if !hasSessionCookie {
			utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "A session ID cookie ('session_id') is required for guest carts.")
			h.logger.Debug("Missing session cookie for guest cart update item request and no authenticated user in context")
			return
		}
		h.logger.Debug("Guest user updating item quantity in cart", "session_id", sessionID)
	}

	itemID, err := ParseUUIDPathParam(w, r, "itemID")
	if err != nil {
		h.logger.Debug("Update item request failed to parse itemID", "error", err)
		return // Error response already sent by helper
	}

	h.logger.Debug("Handling cart update item request", "user_id", userID, "session_id", sessionID, "item_id", itemID)

	var req models.UpdateItemQuantityRequest // Use the struct from models package
	if err := DecodeAndValidateJSON(w, r, &req); err != nil {
		h.logger.Debug("Update item request failed validation/decoding", "error", err)
		return // Error response already sent by helper
	}

	h.logger.Debug("Updating item quantity in cart", "user_id", userID, "session_id", sessionID, "item_id", itemID, "new_quantity", req.Quantity)

	updatedItem, err := h.cartService.UpdateItemQuantityInCart(r.Context(), userID, sessionID, itemID, req.Quantity)
	if err != nil {
		SendServiceError(w, h.logger, "update item quantity in cart", err)
		return
	}

	// If the request was for a guest and we generated a new session ID, set the cookie.
	// Note: This specific endpoint (UpdateItemQuantity) might not typically be the first interaction
	// for a guest, so the cookie likely already exists. We only set it if it was missing at the start.
	if userID == nil && !h.hasSessionCookie(r) { // Only for guests who didn't have a cookie initially
		h.setSessionIDCookie(w, sessionID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedItem) // Encode the item returned by the service
}

// RemoveItem removes a specific item from the current user's or guest's cart.
// Expected Headers: Authorization (Bearer token) for authenticated users.
//
//	Session ID is retrieved from the "session_id" cookie for guest users.
//
// Expected URL Param: itemID (UUID string)
// Response: 204 No Content on success. Sets "session_id" cookie if it didn't exist for guests.
//
//	400 Bad Request if input is invalid, session ID is missing, or item ID is invalid.
//	404 Not Found if the cart item doesn't exist.
//	403 Forbidden if the item doesn't belong to the user's/guest's cart.
//	500 Internal Server Error if backend fails.
func (h *CartHandler) RemoveItem(w http.ResponseWriter, r *http.Request) {
	var userID *uuid.UUID
	var sessionID string

	// Extract user ID from context if authenticated
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user removing item from cart", "user_id", user.ID)
		userID = &user.ID
		// sessionID remains empty for authenticated users
	} else {
		// Fall back to session ID from cookie for guest users
		var hasSessionCookie bool
		sessionID, hasSessionCookie = h.getSessionIDFromCookie(r)
		if !hasSessionCookie {
			utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "A session ID cookie ('session_id') is required for guest carts.")
			h.logger.Debug("Missing session cookie for guest cart remove item request and no authenticated user in context")
			return
		}
		h.logger.Debug("Guest user removing item from cart", "session_id", sessionID)
	}

	itemID, err := ParseUUIDPathParam(w, r, "itemID")
	if err != nil {
		h.logger.Debug("Remove item request failed to parse itemID", "error", err)
		return // Error response already sent by helper
	}

	h.logger.Debug("Handling cart remove item request", "user_id", userID, "session_id", sessionID, "item_id", itemID)

	err = h.cartService.RemoveItemFromCart(r.Context(), userID, sessionID, itemID)
	if err != nil {
		// Log the specific error from the service
		h.logger.Error("Failed to remove item from cart", "user_id", userID, "session_id", sessionID, "item_id", itemID, "error", err)

		// Check for specific known errors
		errMsg := strings.ToLower(err.Error())
		if strings.Contains(errMsg, "not found") {
			utils.SendErrorResponse(w, http.StatusNotFound, "Not Found", "Cart item not found.")
			return
		}
		if strings.Contains(errMsg, "access denied") || strings.Contains(errMsg, "does not belong") {
			utils.SendErrorResponse(w, http.StatusForbidden, "Forbidden", "Access denied: Cannot remove item from another user's/guest's cart.")
			return
		}

		// Generic error for other failures
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to remove item from cart.")
		return
	}

	// If the request was for a guest and we generated a new session ID, set the cookie.
	// Note: This specific endpoint (RemoveItem) might not typically be the first interaction
	// for a guest, so the cookie likely already exists. We only set it if it was missing at the start.
	if userID == nil && !h.hasSessionCookie(r) { // Only for guests who didn't have a cookie initially
		h.setSessionIDCookie(w, sessionID)
	}

	// Successfully removed item - Return 204 No Content
	w.WriteHeader(http.StatusNoContent)
}

// ClearCart removes all items from the current user's or guest's cart.
// Expected Headers: Authorization (Bearer token) for authenticated users.
//
//	Session ID is retrieved from the "session_id" cookie for guest users.
//
// Response: 204 No Content on success. Sets "session_id" cookie if it didn't exist for guests.
//
//	400 Bad Request if session ID is missing (for guests).
//	500 Internal Server Error if backend fails.
func (h *CartHandler) ClearCart(w http.ResponseWriter, r *http.Request) {
	var userID *uuid.UUID
	var sessionID string

	// Extract user ID from context if authenticated
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user clearing cart", "user_id", user.ID)
		userID = &user.ID
		// sessionID remains empty for authenticated users
	} else {
		// Fall back to session ID from cookie for guest users
		var hasSessionCookie bool
		sessionID, hasSessionCookie = h.getSessionIDFromCookie(r)
		if !hasSessionCookie {
			utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "A session ID cookie ('session_id') is required for guest carts.")
			h.logger.Debug("Missing session cookie for guest cart clear request and no authenticated user in context")
			return
		}
		h.logger.Debug("Guest user clearing cart", "session_id", sessionID)
	}

	h.logger.Debug("Handling cart clear request", "user_id", userID, "session_id", sessionID)

	// Call the service to clear the cart (passes userID if present, otherwise sessionID)
	err := h.cartService.ClearCart(r.Context(), userID, sessionID)
	if err != nil {
		// Log the specific error from the service
		h.logger.Error("Failed to clear cart", "user_id", userID, "session_id", sessionID, "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to clear cart.")
		return
	}

	// If the request was for a guest and we generated a new session ID, set the cookie.
	// Note: This specific endpoint (ClearCart) might not typically be the first interaction
	// for a guest, so the cookie likely already exists. We only set it if it was missing at the start.
	if userID == nil && !h.hasSessionCookie(r) { // Only for guests who didn't have a cookie initially
		h.setSessionIDCookie(w, sessionID)
	}

	// Successfully cleared cart - Return 204 No Content
	w.WriteHeader(http.StatusNoContent)
}

// AddBulkItemsToCart adds multiple items to the user's or guest's cart in a single request.
// It expects a JSON body with an array of {product_id, quantity} objects.
func (h *CartHandler) AddBulkItemsToCart(w http.ResponseWriter, r *http.Request) {
	var userID *uuid.UUID
	var sessionID string

	// Extract user ID from context if authenticated
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user adding bulk items to cart", "user_id", user.ID)
		userID = &user.ID
		// sessionID remains empty for authenticated users
	} else {
		// Fall back to session ID from cookie for guest users
		var hasSessionCookie bool
		sessionID, hasSessionCookie = h.getSessionIDFromCookie(r)
		if !hasSessionCookie {
			// Generate a new session ID if the cookie is missing for a guest request
			sessionID = uuid.New().String()
			h.logger.Debug("No session cookie found, generated new session ID for guest bulk add request", "session_id", sessionID)
		}
		h.logger.Debug("Guest user adding bulk items to cart", "session_id", sessionID)
	}

	h.logger.Debug("Handling cart bulk add items request")

	// Parse the request body
	var req models.BulkAddItemRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Invalid JSON body.")
		h.logger.Debug("Failed to decode bulk add items request body", "error", err)
		return
	}

	// Validate the request structure (check for nil or empty items array)
	if req.Items == nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Request body must contain an 'items' array.")
		h.logger.Debug("Bulk add request body missing 'items' array", "request", req)
		return
	}
	if len(req.Items) == 0 {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Request body 'items' array cannot be empty.")
		h.logger.Debug("Bulk add request 'items' array is empty", "request", req)
		return
	}

	h.logger.Debug("Adding bulk items to cart", "user_id", userID, "session_id", sessionID, "num_items", len(req.Items))

	// Call the service to add the items (passes userID if present, otherwise sessionID)
	err = h.cartService.AddBulkItems(r.Context(), userID, sessionID, req.Items)
	if err != nil {
		// Log the specific error from the service
		h.logger.Error("Failed to add bulk items to cart", "user_id", userID, "session_id", sessionID, "num_items", len(req.Items), "error", err)

		// Check for specific known errors like stock issues
		errMsg := strings.ToLower(err.Error())
		if strings.Contains(errMsg, "stock") || strings.Contains(errMsg, "check") {
			utils.SendErrorResponse(w, http.StatusConflict, "Conflict", "Requested quantity for one or more items exceeds available stock or other constraint violated.")
			return
		}

		// Generic error for other failures
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to add items to cart.")
		return
	}

	// If the request was for a guest and we generated a new session ID, set the cookie.
	if userID == nil && !h.hasSessionCookie(r) { // Only for guests who didn't have a cookie initially
		h.setSessionIDCookie(w, sessionID)
	}

	w.WriteHeader(http.StatusOK) // 200 OK indicates successful addition
	fmt.Fprintf(w, "Successfully added %d items to cart", len(req.Items))
}
