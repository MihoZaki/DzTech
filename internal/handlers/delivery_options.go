package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/MihoZaki/DzTech/internal/services"
	"github.com/go-chi/chi/v5"
)

// DeliveryOptionsHandler manages HTTP requests for fetching delivery options.
type DeliveryOptionsHandler struct {
	service *services.DeliveryServiceService // Inject the DeliveryServiceService
	logger  *slog.Logger
}

// NewDeliveryOptionsHandler creates a new instance of DeliveryOptionsHandler.
func NewDeliveryOptionsHandler(service *services.DeliveryServiceService, logger *slog.Logger) *DeliveryOptionsHandler {
	return &DeliveryOptionsHandler{
		service: service,
		logger:  logger,
	}
}

// GetActiveDeliveryOptions handles retrieving the list of active delivery services.
// Requires user authentication (JWT middleware should be applied upstream).
func (h *DeliveryOptionsHandler) GetActiveDeliveryOptions(w http.ResponseWriter, r *http.Request) {
	deliveryServices, err := h.service.GetActiveDeliveryServices(r.Context())
	if err != nil {
		h.logger.Error("Failed to fetch active delivery options", "error", err)
		http.Error(w, "Failed to retrieve delivery options", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(deliveryServices); err != nil {
		h.logger.Error("Failed to encode GetActiveDeliveryOptions response", "error", err)
	}
}

// RegisterRoutes registers the delivery options-related routes with the provided Chi router.
func (h *DeliveryOptionsHandler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.GetActiveDeliveryOptions) // GET /api/v1/delivery-options/
}
