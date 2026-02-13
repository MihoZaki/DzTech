package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/MihoZaki/DzTech/internal/services"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// CategoryHandler handles HTTP requests for categories.
type CategoryHandler struct {
	service *services.CategoryService
	logger  *slog.Logger
}

// NewCategoryHandler creates a new instance of CategoryHandler.
func NewCategoryHandler(service *services.CategoryService, logger *slog.Logger) *CategoryHandler {
	return &CategoryHandler{
		service: service,
		logger:  logger,
	}
}

// RegisterRoutes registers the category-related routes under the given router.
// This should be mounted under the admin routes (e.g., /api/v1/admin/categories).
func (h *CategoryHandler) RegisterRoutes(r chi.Router) {
	r.Post("/", h.CreateCategory)       // POST /api/v1/admin/categories
	r.Get("/{id}", h.GetCategory)       // GET /api/v1/admin/categories/{id}
	r.Get("/", h.ListCategories)        // GET /api/v1/admin/categories
	r.Put("/{id}", h.UpdateCategory)    // PUT /api/v1/admin/categories/{id}
	r.Delete("/{id}", h.DeleteCategory) // DELETE /api/v1/admin/categories/{id}
}

// CreateCategory handles creating a new category.
func (h *CategoryHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var req models.CreateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Invalid JSON in CreateCategory request", "error", err)
		sendErrorResponse(w, http.StatusBadRequest, "Invalid JSON", "Request body contains invalid JSON")
		return
	}

	// Validate the request payload
	if err := req.Validate(); err != nil {
		h.logger.Error("Validation failed for CreateCategory request", "error", err)
		sendValidationError(w, err)
		return
	}

	createdCategory, err := h.service.CreateCategory(r.Context(), req)
	if err != nil {
		h.logger.Error("Failed to create category", "error", err)
		if errors.Is(err, pgx.ErrNoRows) && strings.Contains(err.Error(), "parent category") {
			sendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Parent category not found")
			return
		}
		sendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to create category")
		return
	}

	h.logger.Info("Category created successfully", "category_id", createdCategory.ID, "name", createdCategory.Name)
	sendSuccessResponse(w, http.StatusCreated, createdCategory)
}

// GetCategory handles retrieving a specific category by its ID.
func (h *CategoryHandler) GetCategory(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.logger.Error("Invalid ID parameter in GetCategory request", "value", idStr, "error", err)
		sendErrorResponse(w, http.StatusBadRequest, "Invalid Parameter", "Parameter 'id' must be a valid UUID")
		return
	}

	category, err := h.service.GetCategory(r.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get category", "id", id, "error", err)
		if errors.Is(err, pgx.ErrNoRows) {
			sendErrorResponse(w, http.StatusNotFound, "Not Found", "Category not found")
			return
		}
		sendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to retrieve category")
		return
	}

	h.logger.Info("Category retrieved successfully", "category_id", id)
	sendSuccessResponse(w, http.StatusOK, category)
}

// ListCategories handles retrieving a paginated list of categories.
func (h *CategoryHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	pageStr := r.URL.Query().Get("page")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1 // Default to page 1
	}

	limitStr := r.URL.Query().Get("limit")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 20 // Default to 20 per page
	}
	if limit > 100 {
		limit = 100 // Enforce maximum limit
	}

	paginatedResult, err := h.service.ListCategories(r.Context(), page, limit)
	if err != nil {
		h.logger.Error("Failed to list categories", "page", page, "limit", limit, "error", err)
		sendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to retrieve category list")
		return
	}

	h.logger.Info("Category list retrieved successfully", "page", page, "limit", limit, "total", paginatedResult.Total)
	sendSuccessResponse(w, http.StatusOK, paginatedResult)
}

// UpdateCategory handles updating an existing category.
func (h *CategoryHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.logger.Error("Invalid ID parameter in UpdateCategory request", "value", idStr, "error", err)
		sendErrorResponse(w, http.StatusBadRequest, "Invalid Parameter", "Parameter 'id' must be a valid UUID")
		return
	}

	var req models.UpdateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Invalid JSON in UpdateCategory request", "error", err)
		sendErrorResponse(w, http.StatusBadRequest, "Invalid JSON", "Request body contains invalid JSON")
		return
	}

	// Validate the request payload
	if err := req.Validate(); err != nil {
		h.logger.Error("Validation failed for UpdateCategory request", "error", err)
		sendValidationError(w, err)
		return
	}

	updatedCategory, err := h.service.UpdateCategory(r.Context(), id, req)
	if err != nil {
		h.logger.Error("Failed to update category", "id", id, "error", err)
		if errors.Is(err, pgx.ErrNoRows) {
			sendErrorResponse(w, http.StatusNotFound, "Not Found", "Category not found")
			return
		}
		if strings.Contains(err.Error(), "category not found") {
			sendErrorResponse(w, http.StatusBadRequest, "Bad Request", "category not found")
			return
		}
		if strings.Contains(err.Error(), "cannot be its own parent") {
			sendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Category cannot be its own parent")
			return
		}
		sendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to update category")
		return
	}

	h.logger.Info("Category updated successfully", "category_id", id, "name", updatedCategory.Name)
	sendSuccessResponse(w, http.StatusOK, updatedCategory)
}

// DeleteCategory handles deleting a category by its ID.
func (h *CategoryHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.logger.Error("Invalid ID parameter in DeleteCategory request", "value", idStr, "error", err)
		sendErrorResponse(w, http.StatusBadRequest, "Invalid Parameter", "Parameter 'id' must be a valid UUID")
		return
	}

	err = h.service.DeleteCategory(r.Context(), id)
	if err != nil {
		h.logger.Error("Failed to delete category", "id", id, "error", err)
		if errors.Is(err, pgx.ErrNoRows) {
			sendErrorResponse(w, http.StatusNotFound, "Not Found", "Category not found")
			return
		}
		sendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to delete category")
		return
	}

	h.logger.Info("Category deleted successfully", "category_id", id)
	w.WriteHeader(http.StatusNoContent) // 204 No Content on successful deletion
}

// --- Helper Functions (Local to Handler) ---

// sendSuccessResponse sends a standard success response.
func sendSuccessResponse(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    data,
	})
}

// sendErrorResponse sends a standard error response.
func sendErrorResponse(w http.ResponseWriter, statusCode int, title, detail string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error":   title,
		"message": detail,
	})
}

// sendValidationError sends a standard validation error response.
// This is a basic example, adjust based on your validation library's error format.
func sendValidationError(w http.ResponseWriter, err error) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error":   "Validation Error",
		"message": err.Error(), // Provide the validation error message
	})
}
