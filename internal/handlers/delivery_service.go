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

// DeliveryServiceHandler manages HTTP requests for delivery service-related operations.
type DeliveryServiceHandler struct {
	service *services.DeliveryServiceService
	logger  *slog.Logger
}

// NewDeliveryServiceHandler creates a new instance of DeliveryServiceHandler.
func NewDeliveryServiceHandler(service *services.DeliveryServiceService, logger *slog.Logger) *DeliveryServiceHandler {
	return &DeliveryServiceHandler{
		service: service,
		logger:  logger,
	}
}

// RegisterRoutes registers the delivery service-related routes with the provided Chi router.
// Assumes the router 'r' has admin middleware applied (e.g., JWT + RequireAdmin).
func (h *DeliveryServiceHandler) RegisterRoutes(r chi.Router) {
	r.Post("/", h.CreateDeliveryService)       // POST /api/v1/admin/delivery-services
	r.Get("/{id}", h.GetDeliveryService)       // GET /api/v1/admin/delivery-services/{id} (gets any status)
	r.Get("/", h.ListAllDeliveryServices)      // GET /api/v1/admin/delivery-services?page=&limit=&active_only= (admin sees all)
	r.Patch("/{id}", h.UpdateDeliveryService)  // PATCH /api/v1/admin/delivery-services/{id}
	r.Delete("/{id}", h.DeleteDeliveryService) // DELETE /api/v1/admin/delivery-services/{id}
}

// CreateDeliveryService handles creating a new delivery service.
func (h *DeliveryServiceHandler) CreateDeliveryService(w http.ResponseWriter, r *http.Request) {
	var req models.CreateDeliveryServiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON in request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if err := req.Validate(); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	deliveryService, err := h.service.CreateDeliveryService(r.Context(), req)
	if err != nil {
		// Log the error server-side
		h.logger.Error("Failed to create delivery service", "error", err, "name", req.Name)
		// Check for specific DB errors like unique_violation if needed
		http.Error(w, "Failed to create delivery service", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated) // 201 Created
	if err := json.NewEncoder(w).Encode(deliveryService); err != nil {
		// Log encoding error, but response headers might already be sent
		h.logger.Error("Failed to encode CreateDeliveryService response", "error", err)
	}
}

// GetDeliveryService handles retrieving a specific delivery service by its ID (admin: gets any status).
func (h *DeliveryServiceHandler) GetDeliveryService(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid delivery service ID format", http.StatusBadRequest)
		return
	}

	// Use the new method that ignores the active status for admin retrieval
	deliveryService, err := h.service.GetDeliveryServiceByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrDeliveryServiceNotFound) {
			http.Error(w, "Delivery service not found", http.StatusNotFound)
			return
		}
		h.logger.Error("Failed to get delivery service by ID (admin)", "error", err, "id", id)
		http.Error(w, "Failed to retrieve delivery service", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(deliveryService); err != nil {
		h.logger.Error("Failed to encode GetDeliveryService response", "error", err)
	}
}

// ListAllDeliveryServices handles listing delivery services (admin: sees all statuses).
func (h *DeliveryServiceHandler) ListAllDeliveryServices(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters for pagination and filtering
	activeOnlyStr := r.URL.Query().Get("active_only")
	activeOnly := activeOnlyStr == "true" // Default to false if not provided or not "true"
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

	offset := (page - 1) * limit

	// Use the admin-specific list method
	deliveryServices, err := h.service.ListAllDeliveryServices(r.Context(), activeOnly, limit, offset)
	if err != nil {
		h.logger.Error("Failed to list delivery services (admin)", "error", err, "active_only", activeOnly, "page", page, "limit", limit)
		http.Error(w, "Failed to retrieve delivery services", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(deliveryServices); err != nil {
		h.logger.Error("Failed to encode ListAllDeliveryServices response", "error", err)
	}
}

// UpdateDeliveryService handles updating an existing delivery service.
func (h *DeliveryServiceHandler) UpdateDeliveryService(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid delivery service ID format", http.StatusBadRequest)
		return
	}

	var req models.UpdateDeliveryServiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON in request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Validate the partial request struct (optional, if using validator tags)
	// Note: Validator might need special handling for partial updates (e.g., omitempty rules)
	if err := req.Validate(); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	updatedDeliveryService, err := h.service.UpdateDeliveryService(r.Context(), id, req)
	if err != nil {
		if errors.Is(err, services.ErrDeliveryServiceNotFound) {
			http.Error(w, "Delivery service not found", http.StatusNotFound)
			return
		}
		h.logger.Error("Failed to update delivery service", "error", err, "id", id)
		http.Error(w, "Failed to update delivery service", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(updatedDeliveryService); err != nil {
		h.logger.Error("Failed to encode UpdateDeliveryService response", "error", err)
	}
}

// DeleteDeliveryService handles deleting a delivery service.
func (h *DeliveryServiceHandler) DeleteDeliveryService(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid delivery service ID format", http.StatusBadRequest)
		return
	}

	err = h.service.DeleteDeliveryService(r.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrDeliveryServiceNotFound) {
			// Technically, if it's already gone, is it an error? Maybe return 204 No Content?
			// For consistency with Update, let's return 404 if not found *before* the delete attempt.
			// If the delete query itself fails (e.g., foreign key constraint), it returns 500.
			// If the delete query succeeds but affected 0 rows (despite finding it earlier), might need specific handling.
			// Let's stick to the pattern used in Update.
			http.Error(w, "Delivery service not found", http.StatusNotFound)
			return
		}
		h.logger.Error("Failed to delete delivery service", "error", err, "id", id)
		http.Error(w, "Failed to delete delivery service", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent) // 204 No Content on successful delete
}
