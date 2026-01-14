package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/MihoZaki/DzTech/internal/services"
	"github.com/MihoZaki/DzTech/internal/utils"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// CartHandler manages HTTP requests for cart operations.
type CartHandler struct {
	cartService    *services.CartService
	productService *services.ProductService // Might be needed for future operations
	logger         *slog.Logger
}

// NewCartHandler creates a new instance of CartHandler.
func NewCartHandler(cartService *services.CartService, productService *services.ProductService, logger *slog.Logger) *CartHandler {
	return &CartHandler{
		cartService:    cartService,
		productService: productService,
		logger:         logger,
	}
}

// RegisterRoutes registers the cart-related endpoints with the Chi router.
// This handler only implements GET /cart initially, configured as a public route for guests.
func (h *CartHandler) RegisterRoutes(r chi.Router) {
	// No JWT middleware applied here for guest testing
	r.Get("/", h.GetCart)                            // GET /cart
	r.Post("/items", h.AddItem)                      // POST /cart/items <- Add this line
	r.Patch("/items/{itemID}", h.UpdateItemQuantity) // PATCH /cart/items/{id}
	r.Delete("/items/{itemID}", h.RemoveItem)        // DELETE /cart/items/{id} - Add this line
	r.Delete("/", h.ClearCart)                       // DELETE /cart - Add this line
	// Future routes like PATCH /items/{id}, DELETE /items/{id}, etc., will go here.
	// They might require auth later.
}

// GetCart retrieves the current guest's cart based on the session ID header.
// Expected Headers: X-Session-ID (mandatory for guest users).
// Response: 200 OK with CartSummary JSON.
//
//	400 Bad Request if session ID is missing.
//	500 Internal Server Error if backend fails.
//
// GetCart retrieves the current guest's cart based on the session ID header.
func (h *CartHandler) GetCart(w http.ResponseWriter, r *http.Request) {
	sessionID, ok := GetSessionIDFromHeader(w, r, h.logger)
	if !ok {
		return
	}

	h.logger.Debug("Handling guest cart request", "session_id", sessionID)

	cartSummary, err := h.cartService.GetCartForContext(r.Context(), nil, sessionID)
	if err != nil {
		SendServiceError(w, h.logger, "get guest cart", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cartSummary)
}

// AddItem adds an item to the current guest's cart based on the session ID header and request body.
// Expected Headers: X-Session-ID (mandatory for guest users).
// Expected Body: JSON { "product_id": "uuid-string", "quantity": number }
// Response: 200 OK with updated CartItem JSON.
//
//	400 Bad Request if input is invalid or session ID is missing.
//	404 Not Found if product doesn't exist.
//	409 Conflict if requested quantity exceeds stock (handled by DB/service).
//	500 Internal Server Error if backend fails.
func (h *CartHandler) AddItem(w http.ResponseWriter, r *http.Request) {
	sessionID, ok := GetSessionIDFromHeader(w, r, h.logger)
	if !ok {
		return
	}
	h.logger.Debug("Handling guest cart add item request", "session_id", sessionID)

	var req models.AddItemRequest
	if err := DecodeAndValidateJSON(w, r, &req); err != nil {
		h.logger.Debug("Add item request failed validation/decoding", "error", err)
		return // Error response already sent by helper
	}
	productID, err := uuid.Parse(req.ProductID) // Assuming validation tag 'uuid' is sufficient, otherwise validate here too
	if err != nil {
		// This should ideally be caught by the 'uuid' tag in AddItemRequest, but good to be safe.
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Invalid product ID format after validation.")
		h.logger.Error("Unexpected parsing error after validation", "product_id_str", req.ProductID, "error", err)
		return
	}

	h.logger.Debug("Adding item to cart", "session_id", sessionID, "product_id", productID, "quantity", req.Quantity)

	updatedOrNewItem, err := h.cartService.AddItemToCart(r.Context(), nil, sessionID, productID, req.Quantity)
	if err != nil {
		SendServiceError(w, h.logger, "add item to guest cart", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedOrNewItem)
}

// UpdateItemQuantity updates the quantity of an existing item in the current guest's cart.
// Expected Headers: X-Session-ID (mandatory for guest users).
// Expected URL Param: itemID (UUID string)
// Expected Body: JSON { "quantity": number }
// Response: 200 OK with updated CartItem JSON.
//
//	400 Bad Request if input is invalid, session ID is missing, or item ID is invalid.
//	404 Not Found if the cart item doesn't exist.
//	403 Forbidden if the item doesn't belong to the user's/guest's cart.
//	409 Conflict if requested quantity exceeds stock (handled by DB/service).
//	500 Internal Server Error if backend fails.
func (h *CartHandler) UpdateItemQuantity(w http.ResponseWriter, r *http.Request) {
	sessionID, ok := GetSessionIDFromHeader(w, r, h.logger)
	if !ok {
		return
	}
	itemID, err := ParseUUIDPathParam(w, r, "itemID")
	if err != nil {
		h.logger.Debug("Update item request failed to parse itemID", "error", err)
		return // Error response already sent by helper
	}

	h.logger.Debug("Handling guest cart update item request", "session_id", sessionID, "item_id", itemID)

	var req models.UpdateItemQuantityRequest
	if err := DecodeAndValidateJSON(w, r, &req); err != nil {
		h.logger.Debug("Update item request failed validation/decoding", "error", err)
		return // Error response already sent by helper
	}

	h.logger.Debug("Updating item quantity in cart", "session_id", sessionID, "item_id", itemID, "new_quantity", req.Quantity)

	updatedItem, err := h.cartService.UpdateItemQuantityInCart(r.Context(), nil, sessionID, itemID, req.Quantity)
	if err != nil {
		SendServiceError(w, h.logger, "update item quantity in guest cart", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedItem)
}

// RemoveItem removes a specific item from the current guest's cart.
// Expected Headers: X-Session-ID (mandatory for guest users).
// Expected URL Param: itemID (UUID string)
// Response: 204 No Content on success.
//
//	400 Bad Request if input is invalid, session ID is missing, or item ID is invalid.
//	404 Not Found if the cart item doesn't exist.
//	403 Forbidden if the item doesn't belong to the user's/guest's cart.
//	500 Internal Server Error if backend fails.
func (h *CartHandler) RemoveItem(w http.ResponseWriter, r *http.Request) {
	// Get session ID from the header
	sessionID, ok := GetSessionIDFromHeader(w, r, h.logger)
	if !ok {
		return
	}

	// Get item ID from the URL path
	itemID, err := ParseUUIDPathParam(w, r, "itemID")
	if err != nil {
		h.logger.Debug("Remove item request failed to parse itemID", "error", err)
		return // Error response already sent by helper
	}

	h.logger.Debug("Handling guest cart remove item request", "session_id", sessionID, "item_id", itemID)

	// Call the service to remove the item (passing nil for userID as it's a guest request for now)
	err = h.cartService.RemoveItemFromCart(r.Context(), nil, sessionID, itemID)
	if err != nil {
		// Log the specific error from the service
		h.logger.Error("Failed to remove item from guest cart", "session_id", sessionID, "item_id", itemID, "error", err)

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
	h.logger.Debug("Successfully removed item", "itemid", itemID)
	// Successfully removed item - Return 204 No Content
	w.WriteHeader(http.StatusNoContent)
}

// ClearCart removes all items from the current guest's cart.
// Expected Headers: X-Session-ID (mandatory for guest users).
// Response: 204 No Content on success.
//
//	400 Bad Request if session ID is missing.
//	500 Internal Server Error if backend fails.
func (h *CartHandler) ClearCart(w http.ResponseWriter, r *http.Request) {
	// For guest-only testing, get session ID from the header
	sessionID, ok := GetSessionIDFromHeader(w, r, h.logger)
	if !ok {
		return
	}

	h.logger.Debug("Handling guest cart clear request", "session_id", sessionID)

	// Call the service to clear the cart (passing nil for userID as it's a guest request for now)
	err := h.cartService.ClearCart(r.Context(), nil, sessionID)
	if err != nil {
		// Log the specific error from the service
		h.logger.Error("Failed to clear guest cart", "session_id", sessionID, "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to clear cart.")
		return
	}

	// Successfully cleared cart - Return 204 No Content
	w.WriteHeader(http.StatusNoContent)
}

