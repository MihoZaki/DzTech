package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/MihoZaki/DzTech/internal/services"
	"github.com/MihoZaki/DzTech/internal/utils"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type ProductHandler struct {
	productService *services.ProductService
}

func NewProductHandler(productService *services.ProductService) *ProductHandler {
	return &ProductHandler{
		productService: productService,
	}
}

func (h *ProductHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	var req models.CreateProductRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Invalid JSON")
		return
	}

	if err := req.Validate(); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Validation Error", "Validation failed")
		return
	}

	product, err := h.productService.CreateProduct(r.Context(), req)
	if err != nil {
		slog.Error("Failed to create product", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to create product")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(product)
}

func (h *ProductHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	identifier := chi.URLParam(r, "id")

	var product *models.Product
	var err error

	// Try to parse as UUID first (more specific format)
	if _, uuidErr := uuid.Parse(identifier); uuidErr == nil {
		// It's a UUID
		product, err = h.productService.GetProduct(r.Context(), identifier)
	} else {
		// Assume it's a slug
		product, err = h.productService.GetProductBySlug(r.Context(), identifier)
	}

	if err != nil {
		utils.SendErrorResponse(w, http.StatusNotFound, "Not Found", "Product not found")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(product)
}

// Add new ListAllProducts endpoint (uses basic ListProducts function)
func (h *ProductHandler) ListAllProducts(w http.ResponseWriter, r *http.Request) {
	page := 1
	limit := 20

	pageStr := r.URL.Query().Get("page")
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	limitStr := r.URL.Query().Get("limit")
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	products, err := h.productService.ListAllProducts(r.Context(), page, limit)
	if err != nil {
		slog.Error("Failed to list all products", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to list products")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

// Add new ListCategories endpoint
func (h *ProductHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := h.productService.ListCategories(r.Context())
	if err != nil {
		slog.Error("Failed to list categories", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to list categories")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

func (h *ProductHandler) RegisterRoutes(r chi.Router) {
	r.Post("/", h.CreateProduct)
	r.Get("/{id}", h.GetProduct)
	// Add new routes using the specific querier functions
	r.Get("/", h.ListAllProducts)          // Uses basic ListProducts function (no search)
	r.Get("/categories", h.ListCategories) // Uses ListCategories function
}
