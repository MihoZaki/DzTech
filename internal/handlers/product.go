package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

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
	// Use the helper for decoding and validating
	if err := DecodeAndValidateJSON(w, r, &req); err != nil {
		slog.Debug("Create product request failed validation/decoding", "error", err)
		return // Error response already sent by helper
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
	if id, uuidErr := uuid.Parse(identifier); uuidErr == nil {
		// It's a UUID
		product, err = h.productService.GetProduct(r.Context(), id)
	} else {
		// Assume it's a slug
		product, err = h.productService.GetProductBySlug(r.Context(), identifier)
	}

	if err != nil {
		slog.Debug("Product not found", "identifier", identifier, "error", err)
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

func (h *ProductHandler) SearchProducts(w http.ResponseWriter, r *http.Request) {
	filter := models.ProductFilter{
		Page:  1,
		Limit: 20,
	}

	// Parse query parameters
	query := r.URL.Query()
	if q := query.Get("q"); q != "" {
		filter.Query = q
	}
	if categoryIDStr := query.Get("category_id"); categoryIDStr != "" {
		categoryID, err := uuid.Parse(categoryIDStr)
		if err == nil && categoryID != uuid.Nil {
			filter.CategoryID = categoryID
		}
	}
	if brand := query.Get("brand"); brand != "" {
		filter.Brand = brand
	}
	if pageStr := query.Get("page"); pageStr != "" {
		page, err := strconv.Atoi(pageStr)
		if err == nil && page > 0 {
			filter.Page = page
		}
	}
	if limitStr := query.Get("limit"); limitStr != "" {
		limit, err := strconv.Atoi(limitStr)
		if err == nil && limit > 0 && limit <= 100 {
			filter.Limit = limit
		}
	}
	if minPriceStr := query.Get("min_price"); minPriceStr != "" {
		minPrice, err := strconv.ParseInt(minPriceStr, 10, 64)
		if err == nil && minPrice >= 0 {
			filter.MinPrice = &minPrice
		}
	}
	if maxPriceStr := query.Get("max_price"); maxPriceStr != "" {
		maxPrice, err := strconv.ParseInt(maxPriceStr, 10, 64)
		if err == nil && maxPrice >= 0 {
			filter.MaxPrice = &maxPrice
		}
	}
	if inStockOnlyStr := query.Get("in_stock_only"); inStockOnlyStr != "" {
		inStockOnly := strings.ToLower(inStockOnlyStr) == "true"
		filter.InStockOnly = &inStockOnly
	}

	products, err := h.productService.SearchProducts(r.Context(), filter)
	if err != nil {
		slog.Error("Failed to search products", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to search products")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

func (h *ProductHandler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	// Use the helper for parsing UUID from path
	productID, err := ParseUUIDPathParam(w, r, "id")
	if err != nil {
		slog.Debug("Update product request failed to parse productID", "error", err)
		return // Error response already sent by helper
	}

	var req models.CreateProductRequest // Reuse the same request model for updates
	// Use the helper for decoding and validating
	if err := DecodeAndValidateJSON(w, r, &req); err != nil {
		slog.Debug("Update product request failed validation/decoding", "error", err)
		return // Error response already sent by helper
	}

	updatedProduct, err := h.productService.UpdateProduct(r.Context(), productID, req)
	if err != nil {
		// Map service errors more specifically if possible, or use a generic helper
		// For now, let's see if we can make a more generic error sender for product-specific messages
		if strings.Contains(err.Error(), "product not found") {
			utils.SendErrorResponse(w, http.StatusNotFound, "Not Found", "Product not found")
			return
		}
		if strings.Contains(err.Error(), "category not found") {
			utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Category not found")
			return
		}
		slog.Error("Failed to update product", "error", err, "product_id", productID)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to update product")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedProduct)
}

func (h *ProductHandler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	// Use the helper for parsing UUID from path
	productID, err := ParseUUIDPathParam(w, r, "id")
	if err != nil {
		slog.Debug("Delete product request failed to parse productID", "error", err)
		return // Error response already sent by helper
	}

	err = h.productService.DeleteProduct(r.Context(), productID)
	if err != nil {
		if strings.Contains(err.Error(), "product not found") {
			utils.SendErrorResponse(w, http.StatusNotFound, "Not Found", "Product not found")
			return
		}
		slog.Error("Failed to delete product", "error", err, "product_id", productID)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to delete product")
		return
	}

	w.WriteHeader(http.StatusNoContent)
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

// Add new GetCategory endpoint that handles both ID and slug
func (h *ProductHandler) GetCategory(w http.ResponseWriter, r *http.Request) {
	identifier := chi.URLParam(r, "id")

	// Try to parse as UUID first (more specific format)
	if id, uuidErr := uuid.Parse(identifier); uuidErr == nil {
		// It's a UUID - get by ID
		category, err := h.productService.GetCategoryByID(r.Context(), id)
		if err != nil {
			if strings.Contains(err.Error(), "category not found") {
				utils.SendErrorResponse(w, http.StatusNotFound, "Not Found", "Category not found")
				return
			}
			utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to get category")
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(category)
		return
	} else {
		// Assume it's a slug - get by slug
		category, err := h.productService.GetCategoryBySlug(r.Context(), identifier)
		if err != nil {
			if strings.Contains(err.Error(), "category not found") {
				utils.SendErrorResponse(w, http.StatusNotFound, "Not Found", "Category not found")
				return
			}
			utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to get category")
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(category)
		return
	}
}

func (h *ProductHandler) RegisterRoutes(r chi.Router) {
	r.Post("/", h.CreateProduct)
	r.Get("/{id}", h.GetProduct)
	// Add new routes using the specific querier functions
	r.Get("/", h.ListAllProducts)          // Uses basic ListProducts function (no search)
	r.Get("/categories", h.ListCategories) // Uses ListCategories function
	// Add new category endpoint that handles both ID and slug
	r.Get("/categories/{id}", h.GetCategory) // Smart resolution: UUID or slug
	// Add update and delete routes
	r.Put("/{id}", h.UpdateProduct)    // Update product
	r.Delete("/{id}", h.DeleteProduct) // Delete product
	// Add search route
	r.Get("/search", h.SearchProducts) // Advanced product search
}
