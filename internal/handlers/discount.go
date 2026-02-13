package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/MihoZaki/DzTech/internal/services"
	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// DiscountHandler handles HTTP requests for discount management.
type DiscountHandler struct {
	service *services.DiscountService
	logger  *slog.Logger
}

// NewDiscountHandler creates a new instance of DiscountHandler.
func NewDiscountHandler(service *services.DiscountService, logger *slog.Logger) *DiscountHandler {
	return &DiscountHandler{
		service: service,
		logger:  logger,
	}
}

// RegisterRoutes registers discount-related routes with the provided router.
// This function assumes the router already has admin authorization middleware applied.
func (h *DiscountHandler) RegisterRoutes(r chi.Router) {
	r.Post("/", h.CreateDiscount)
	r.Get("/{id}", h.GetDiscount)
	r.Put("/{id}", h.UpdateDiscount)
	r.Delete("/{id}", h.DeleteDiscount)
	r.Get("/", h.ListDiscounts)
	r.Get("/product/{product_id}", h.GetDiscountsByProductID)

	r.Route("/{discount_id}/link", func(r chi.Router) {
		r.Post("/product", h.LinkDiscountToProduct)
	})
	r.Route("/{discount_id}/unlink", func(r chi.Router) {
		r.Post("/product", h.UnlinkDiscountFromProduct)
	})
}

// CreateDiscount handles the creation of a new discount.
func (h *DiscountHandler) CreateDiscount(w http.ResponseWriter, r *http.Request) {
	var req models.CreateDiscountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Invalid JSON in CreateDiscount request", "error", err)
		http.Error(w, `{"error": "Invalid JSON", "message": "Request body contains invalid JSON"}`, http.StatusBadRequest)
		return
	}

	if err := req.Validate(); err != nil {
		h.logger.Error("Validation failed for CreateDiscount request", "error", err)
		fieldErrors := make(map[string]string)
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			for _, err := range validationErrors {
				fieldErrors[err.Field()] = formatValidationError(err)
			}
		}
		// Send validation error response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnprocessableEntity)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Validation Failed",
			"message": "The request data is invalid.",
			"details": fieldErrors,
		})
		return
	}

	createdDiscount, err := h.service.CreateDiscount(r.Context(), req)
	if err != nil {
		h.logger.Error("Failed to create discount", "error", err)
		if strings.Contains(err.Error(), "already exists") {
			http.Error(w, `{"error": "Discount Code Conflict", "message": "`+err.Error()+`"}`, http.StatusConflict)
			return
		}
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to create discount"}`, http.StatusInternalServerError)
		return
	}

	h.logger.Info("Discount created successfully", "discount_id", createdDiscount.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdDiscount)
}

// GetDiscount handles retrieving a specific discount by ID.
func (h *DiscountHandler) GetDiscount(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.logger.Error("Invalid discount ID in GetDiscount request", "id", idStr, "error", err)
		http.Error(w, `{"error": "Invalid Discount ID", "message": "Discount ID must be a valid UUID"}`, http.StatusBadRequest)
		return
	}

	discount, err := h.service.GetDiscount(r.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get discount", "id", id, "error", err)
		if errors.Is(err, pgx.ErrNoRows) || err.Error() == "discount not found" {
			http.Error(w, `{"error": "Discount Not Found", "message": "The requested discount does not exist"}`, http.StatusNotFound)
			return
		}
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to retrieve discount"}`, http.StatusInternalServerError)
		return
	}

	h.logger.Info("Discount retrieved successfully", "discount_id", discount.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(discount)
}

func (h *DiscountHandler) GetDiscountsByProductID(w http.ResponseWriter, r *http.Request) {
	productIDStr := chi.URLParam(r, "product_id")
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		h.logger.Error("Invalid product ID parameter in GetDiscountsByProductID request", "value", productIDStr, "error", err)
		http.Error(w, `{"error": "Invalid Parameter", "message": "Parameter 'product_id' must be a valid UUID"}`, http.StatusBadRequest)
		return
	}

	discounts, err := h.service.GetDiscountsByProductID(r.Context(), productID)
	if err != nil {
		h.logger.Error("Failed to get discounts for product", "product_id", productID, "error", err)
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to retrieve discounts for product"}`, http.StatusInternalServerError)
		return
	}

	h.logger.Info("Discounts retrieved successfully for product", "product_id", productID, "count", len(discounts))
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(discounts) // Encode the slice directly
}

// UpdateDiscount handles updating an existing discount by ID.
func (h *DiscountHandler) UpdateDiscount(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.logger.Error("Invalid discount ID in UpdateDiscount request", "id", idStr, "error", err)
		http.Error(w, `{"error": "Invalid Discount ID", "message": "Discount ID must be a valid UUID"}`, http.StatusBadRequest)
		return
	}

	var req models.UpdateDiscountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Invalid JSON in UpdateDiscount request", "error", err)
		http.Error(w, `{"error": "Invalid JSON", "message": "Request body contains invalid JSON"}`, http.StatusBadRequest)
		return
	}

	// Validation for UpdateDiscountRequest might be trickier due to conditional fields.
	// You might need custom validation logic here or ensure the service handles it robustly.
	// For now, let's assume basic struct validation works where applicable.
	if err := req.Validate(); err != nil {
		h.logger.Error("Validation failed for UpdateDiscount request", "error", err)
		fieldErrors := make(map[string]string)
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			for _, err := range validationErrors {
				fieldErrors[err.Field()] = formatValidationError(err)
			}
		}
		// Send validation error response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnprocessableEntity)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Validation Failed",
			"message": "The request data is invalid.",
			"details": fieldErrors,
		})
		return
	}

	updatedDiscount, err := h.service.UpdateDiscount(r.Context(), id, req)
	if err != nil {
		h.logger.Error("Failed to update discount", "id", id, "error", err)
		if errors.Is(err, pgx.ErrNoRows) || err.Error() == "discount not found" {
			http.Error(w, `{"error": "Discount Not Found", "message": "The requested discount does not exist"}`, http.StatusNotFound)
			return
		}
		if strings.Contains(err.Error(), "already exists") {
			http.Error(w, `{"error": "Discount Code Conflict", "message": "`+err.Error()+`"}`, http.StatusConflict)
			return
		}
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to update discount"}`, http.StatusInternalServerError)
		return
	}

	h.logger.Info("Discount updated successfully", "discount_id", updatedDiscount.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(updatedDiscount)
}

// DeleteDiscount handles deleting a discount by ID.
func (h *DiscountHandler) DeleteDiscount(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.logger.Error("Invalid discount ID in DeleteDiscount request", "id", idStr, "error", err)
		http.Error(w, `{"error": "Invalid Discount ID", "message": "Discount ID must be a valid UUID"}`, http.StatusBadRequest)
		return
	}

	err = h.service.DeleteDiscount(r.Context(), id)
	if err != nil {
		h.logger.Error("Failed to delete discount", "id", id, "error", err)
		if errors.Is(err, pgx.ErrNoRows) || err.Error() == "discount not found" {
			http.Error(w, `{"error": "Discount Not Found", "message": "The requested discount does not exist"}`, http.StatusNotFound)
			return
		}
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to delete discount"}`, http.StatusInternalServerError)
		return
	}

	h.logger.Info("Discount deleted successfully", "discount_id", id)
	w.WriteHeader(http.StatusNoContent) // 204 No Content
}

// ListDiscounts handles retrieving a paginated list of discounts based on filters.
func (h *DiscountHandler) ListDiscounts(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	query := r.URL.Query()
	var isActive *bool
	if isActiveStr := query.Get("is_active"); isActiveStr != "" {
		isActiveVal, err := strconv.ParseBool(isActiveStr)
		if err != nil {
			h.logger.Error("Invalid is_active parameter in ListDiscounts request", "value", isActiveStr, "error", err)
			http.Error(w, `{"error": "Invalid Parameter", "message": "Parameter 'is_active' must be a valid boolean (true/false)"}`, http.StatusBadRequest)
			return
		}
		isActive = &isActiveVal
	}

	// --- Parse new date filter parameters ---
	var validFrom, validUntil *time.Time
	if validFromStr := query.Get("valid_from"); validFromStr != "" {
		parsedTime, err := time.Parse(time.RFC3339, validFromStr) // Or another layout if needed, e.g. time.RFC3339Nano
		if err != nil {
			h.logger.Error("Invalid valid_from parameter in ListDiscounts request", "value", validFromStr, "error", err)
			http.Error(w, `{"error": "Invalid Parameter", "message": "Parameter 'valid_from' must be a valid RFC3339 timestamp"}`, http.StatusBadRequest)
			return
		}
		validFrom = &parsedTime
	}

	if validUntilStr := query.Get("valid_until"); validUntilStr != "" {
		parsedTime, err := time.Parse(time.RFC3339, validUntilStr) // Or another layout if needed
		if err != nil {
			h.logger.Error("Invalid valid_until parameter in ListDiscounts request", "value", validUntilStr, "error", err)
			http.Error(w, `{"error": "Invalid Parameter", "message": "Parameter 'valid_until' must be a valid RFC3339 timestamp"}`, http.StatusBadRequest)
			return
		}
		validUntil = &parsedTime
	}
	// ---

	pageStr := query.Get("page")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1 // Default to page 1
	}

	limitStr := query.Get("limit")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 20 // Default to 20 per page
	}
	if limit > 100 {
		limit = 100 // Enforce maximum limit
	}

	req := models.ListDiscountsRequest{
		IsActive:   isActive,
		ValidFrom:  validFrom,  // Add parsed date filters
		ValidUntil: validUntil, // Add parsed date filters
		Page:       page,
		Limit:      limit,
	}

	listResponse, err := h.service.ListDiscounts(r.Context(), req)
	if err != nil {
		h.logger.Error("Failed to list discounts", "request", req, "error", err)
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to retrieve discount list"}`, http.StatusInternalServerError)
		return
	}

	h.logger.Info("Discount list retrieved successfully", "page", req.Page, "limit", req.Limit, "total", listResponse.Total)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(listResponse)
}

// LinkDiscountToProduct handles associating a discount with a product.
func (h *DiscountHandler) LinkDiscountToProduct(w http.ResponseWriter, r *http.Request) {
	discountIDStr := chi.URLParam(r, "discount_id")
	discountID, err := uuid.Parse(discountIDStr)
	if err != nil {
		h.logger.Error("Invalid discount ID in LinkDiscountToProduct request", "discount_id", discountIDStr, "error", err)
		http.Error(w, `{"error": "Invalid Discount ID", "message": "Discount ID must be a valid UUID"}`, http.StatusBadRequest)
		return
	}

	var req models.LinkDiscountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Invalid JSON in LinkDiscountToProduct request", "error", err)
		http.Error(w, `{"error": "Invalid JSON", "message": "Request body contains invalid JSON"}`, http.StatusBadRequest)
		return
	}

	if err := req.Validate(); err != nil {
		h.logger.Error("Validation failed for LinkDiscountToProduct request", "error", err)
		fieldErrors := make(map[string]string)
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			for _, err := range validationErrors {
				fieldErrors[err.Field()] = formatValidationError(err)
			}
		}
		// Send validation error response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnprocessableEntity)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Validation Failed",
			"message": "The request data is invalid.",
			"details": fieldErrors,
		})
		return
	}

	err = h.service.LinkDiscountToProduct(r.Context(), discountID, req.ProductID)
	if err != nil {
		h.logger.Error("Failed to link discount to product", "discount_id", discountID, "product_id", req.ProductID, "error", err)
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to link discount to product"}`, http.StatusInternalServerError)
		return
	}

	h.logger.Info("Discount linked to product successfully", "discount_id", discountID, "product_id", req.ProductID)
	w.WriteHeader(http.StatusOK) // 200 OK or 204 No Content
}

// UnlinkDiscountFromProduct handles removing the association between a discount and a product.
func (h *DiscountHandler) UnlinkDiscountFromProduct(w http.ResponseWriter, r *http.Request) {
	discountIDStr := chi.URLParam(r, "discount_id")
	discountID, err := uuid.Parse(discountIDStr)
	if err != nil {
		h.logger.Error("Invalid discount ID in UnlinkDiscountFromProduct request", "discount_id", discountIDStr, "error", err)
		http.Error(w, `{"error": "Invalid Discount ID", "message": "Discount ID must be a valid UUID"}`, http.StatusBadRequest)
		return
	}

	var req models.UnlinkDiscountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Invalid JSON in UnlinkDiscountFromProduct request", "error", err)
		http.Error(w, `{"error": "Invalid JSON", "message": "Request body contains invalid JSON"}`, http.StatusBadRequest)
		return
	}

	if err := req.Validate(); err != nil {
		h.logger.Error("Validation failed for UnlinkDiscountFromProduct request", "error", err)
		fieldErrors := make(map[string]string)
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			for _, err := range validationErrors {
				fieldErrors[err.Field()] = formatValidationError(err)
			}
		}
		// Send validation error response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnprocessableEntity)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Validation Failed",
			"message": "The request data is invalid.",
			"details": fieldErrors,
		})
		return
	}

	err = h.service.UnlinkDiscountFromProduct(r.Context(), discountID, req.ProductID)
	if err != nil {
		h.logger.Error("Failed to unlink discount from product", "discount_id", discountID, "product_id", req.ProductID, "error", err)
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to unlink discount from product"}`, http.StatusInternalServerError)
		return
	}

	h.logger.Info("Discount unlinked from product successfully", "discount_id", discountID, "product_id", req.ProductID)
	w.WriteHeader(http.StatusOK) // 200 OK or 204 No Content
}
