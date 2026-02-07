package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/MihoZaki/DzTech/internal/services"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type ReviewHandler struct {
	service *services.ReviewService
	logger  *slog.Logger
}

func NewReviewHandler(service *services.ReviewService, logger *slog.Logger) *ReviewHandler {
	return &ReviewHandler{
		service: service,
		logger:  logger,
	}
}

// RegisterRoutes registers the review-related routes.
func (h *ReviewHandler) RegisterRoutes(r chi.Router) {
	r.Get("/product/{product_id}", h.GetReviewsByProductID) // GET /api/v1/reviews/product/{product_id}?page=&limit=

	r.Group(func(r chi.Router) {
		r.Post("/", h.CreateReview)              // POST /api/v1/reviews
		r.Put("/{review_id}", h.UpdateReview)    // PUT /api/v1/reviews/{review_id}
		r.Delete("/{review_id}", h.DeleteReview) // DELETE /api/v1/reviews/{review_id}
		// r.Get("/user", h.GetReviewsByCurrentUser) // GET /api/v1/reviews/user?page=&limit=
	})

	// r.Get("/user/{user_id}", h.GetReviewsByUserID) // GET /api/v1/reviews/user/{user_id}?page=&limit=
}

// CreateReview handles creating a new review.
func (h *ReviewHandler) CreateReview(w http.ResponseWriter, r *http.Request) {
	user, ok := models.GetUserFromContext(r.Context())
	if !ok || user.ID == uuid.Nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req models.CreateReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode CreateReview request", "error", err)
		http.Error(w, "Invalid JSON in request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if err := req.Validate(); err != nil {
		h.logger.Warn("Validation error in CreateReview", "error", err)
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	review, err := h.service.CreateReview(r.Context(), user.ID, req)
	if err != nil {
		h.logger.Error("Failed to create review", "error", err, "user_id", user.ID, "product_id", req.ProductID)

		if err.Error() == "user has already reviewed this product" {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		http.Error(w, "Failed to create review", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(review); err != nil {
		h.logger.Error("Failed to encode CreateReview response", "error", err)
	}
}

// UpdateReview handles updating an existing review.
func (h *ReviewHandler) UpdateReview(w http.ResponseWriter, r *http.Request) {
	user, ok := models.GetUserFromContext(r.Context())
	if !ok || user.ID == uuid.Nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	reviewIDStr := chi.URLParam(r, "review_id")
	reviewID, err := uuid.Parse(reviewIDStr)
	if err != nil {
		h.logger.Warn("Invalid review ID format in UpdateReview", "review_id_str", reviewIDStr, "error", err)
		http.Error(w, "Invalid review ID format", http.StatusBadRequest)
		return
	}

	var req models.UpdateReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode UpdateReview request", "error", err)
		http.Error(w, "Invalid JSON in request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if err := req.Validate(); err != nil {
		h.logger.Warn("Validation error in UpdateReview", "error", err)
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	review, err := h.service.UpdateReview(r.Context(), reviewID, user.ID, req)
	if err != nil {
		h.logger.Error("Failed to update review", "error", err, "user_id", user.ID, "review_id", reviewID)

		if err.Error() == "review not found or does not belong to user" {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}

		http.Error(w, "Failed to update review", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(review); err != nil {
		h.logger.Error("Failed to encode UpdateReview response", "error", err)
	}
}

// DeleteReview handles deleting an existing review.
func (h *ReviewHandler) DeleteReview(w http.ResponseWriter, r *http.Request) {
	user, ok := models.GetUserFromContext(r.Context())
	if !ok || user.ID == uuid.Nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	reviewIDStr := chi.URLParam(r, "review_id")
	reviewID, err := uuid.Parse(reviewIDStr)
	if err != nil {
		h.logger.Warn("Invalid review ID format in DeleteReview", "review_id_str", reviewIDStr, "error", err)
		http.Error(w, "Invalid review ID format", http.StatusBadRequest)
		return
	}

	err = h.service.DeleteReview(r.Context(), reviewID, user.ID)
	if err != nil {
		h.logger.Error("Failed to delete review", "error", err, "user_id", user.ID, "review_id", reviewID)

		if err.Error() == "review not found or does not belong to user" {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}

		http.Error(w, "Failed to delete review", http.StatusInternalServerError)
		return
	}

	// 204 No Content on successful deletion
	w.WriteHeader(http.StatusNoContent)
}

// GetReviewsByProductID handles fetching reviews for a specific product.
func (h *ReviewHandler) GetReviewsByProductID(w http.ResponseWriter, r *http.Request) {
	productIDStr := chi.URLParam(r, "product_id")
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		h.logger.Warn("Invalid product ID format in GetReviewsByProductID", "product_id_str", productIDStr, "error", err)
		http.Error(w, "Invalid product ID format", http.StatusBadRequest)
		return
	}

	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}

	}

	limit := 20
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}

	}

	resp, err := h.service.GetReviewsByProductID(r.Context(), productID, page, limit)
	if err != nil {
		h.logger.Error("Failed to get reviews for product", "error", err, "product_id", productID)
		http.Error(w, "Failed to retrieve reviews", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		h.logger.Error("Failed to encode GetReviewsByProductID response", "error", err)
	}
}

// GetReviewsByCurrentUser handles fetching reviews submitted by the currently authenticated user.
func (h *ReviewHandler) GetReviewsByCurrentUser(w http.ResponseWriter, r *http.Request) {
	user, ok := models.GetUserFromContext(r.Context())
	if !ok || user.ID == uuid.Nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	limit := 20
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	resp, err := h.service.GetReviewsByUserID(r.Context(), user.ID, page, limit)
	if err != nil {
		h.logger.Error("Failed to get reviews by current user", "error", err, "user_id", user.ID)
		http.Error(w, "Failed to retrieve reviews", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		h.logger.Error("Failed to encode GetReviewsByCurrentUser response", "error", err)
	}
}

// GetReviewsByUserID handles fetching reviews submitted by a specific user.
func (h *ReviewHandler) GetReviewsByUserID(w http.ResponseWriter, r *http.Request) {
	userIDStr := chi.URLParam(r, "user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.logger.Warn("Invalid user ID format in GetReviewsByUserID", "user_id_str", userIDStr, "error", err)
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}
	h.logger.Info("the user id", "id", userID)
}
