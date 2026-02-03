package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/MihoZaki/DzTech/internal/services"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// AdminUserHandler manages HTTP requests for admin user management operations.
type AdminUserHandler struct {
	service *services.AdminUserService
	logger  *slog.Logger
}

// NewAdminUserHandler creates a new instance of AdminUserHandler.
func NewAdminUserHandler(service *services.AdminUserService, logger *slog.Logger) *AdminUserHandler {
	return &AdminUserHandler{
		service: service,
		logger:  logger,
	}
}

// RegisterRoutes registers the admin user management-related routes with the provided Chi router.
// Assumes the router 'r' has admin middleware applied (e.g., JWT + RequireAdmin).
func (h *AdminUserHandler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.ListUsers)                      // GET /api/v1/admin/users (with ?active_only=&page=&limit=)
	r.Get("/{id}", h.GetUser)                    // GET /api/v1/admin/users/{id}
	r.Post("/{id}/activate", h.ActivateUser)     // POST /api/v1/admin/users/{id}/activate
	r.Post("/{id}/deactivate", h.DeactivateUser) // POST /api/v1/admin/users/{id}/deactivate
}

// ListUsers handles listing users.
func (h *AdminUserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters for filtering and pagination
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

	users, err := h.service.ListUsers(r.Context(), activeOnly, limit, offset)
	if err != nil {
		h.logger.Error("Failed to list users", "error", err, "active_only", activeOnly, "page", page, "limit", limit)
		http.Error(w, "Failed to retrieve users", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(users); err != nil {
		h.logger.Error("Failed to encode ListUsers response", "error", err)
	}
}

// GetUser handles retrieving a specific user's details by their ID.
func (h *AdminUserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}

	userInfo, err := h.service.GetUser(r.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		h.logger.Error("Failed to get user details", "error", err, "user_id", id)
		http.Error(w, "Failed to retrieve user details", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(userInfo); err != nil {
		h.logger.Error("Failed to encode GetUser response", "error", err, "user_id", id)
	}
}

// ActivateUser handles activating a user.
func (h *AdminUserHandler) ActivateUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}

	err = h.service.ActivateUser(r.Context(), id)
	if err != nil {
		h.logger.Error("Failed to activate user", "error", err, "user_id", id)
		http.Error(w, "Failed to activate user", http.StatusInternalServerError)
		return
	}

	// Return 204 No Content on successful activation
	w.WriteHeader(http.StatusNoContent) // 204 No Content
}

// DeactivateUser handles deactivating a user.
func (h *AdminUserHandler) DeactivateUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}

	err = h.service.DeactivateUser(r.Context(), id)
	if err != nil {
		h.logger.Error("Failed to deactivate user", "error", err, "user_id", id)
		http.Error(w, "Failed to deactivate user", http.StatusInternalServerError)
		return
	}

	// Return 204 No Content on successful deactivation
	w.WriteHeader(http.StatusNoContent) // 204 No Content
}
