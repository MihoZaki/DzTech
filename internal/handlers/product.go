package handlers

import (
	"encoding/json"
	"fmt"
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
	contentType := r.Header.Get("Content-Type")
	var createdProduct *models.Product
	var err error

	if strings.HasPrefix(contentType, "multipart/form-data") {
		slog.Debug("Handling multipart product creation request")

		createdProduct, err = h.createProductFromMultipart(r)
	} else if contentType == "application/json" || strings.HasPrefix(contentType, "application/json;") {
		slog.Debug("Handling JSON product creation request")

		createdProduct, err = h.createProductFromJSON(w, r)
	} else {
		utils.SendErrorResponse(w, http.StatusUnsupportedMediaType, "Unsupported Media Type", fmt.Sprintf("Unsupported Content-Type: %s", contentType))
		slog.Debug("Unsupported Content-Type received", "content_type", contentType)
		return
	}

	if err != nil {
		slog.Error("Failed to create product", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to create product")
		return
	}

	slog.Debug("Successfully created product", "product_id", createdProduct.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdProduct)
}

func (h *ProductHandler) createProductFromMultipart(r *http.Request) (*models.Product, error) {
	err := r.ParseMultipartForm(32 << 20) // 32 MB
	if err != nil {
		return nil, fmt.Errorf("error parsing multipart form: %w", err)
	}
	name := r.FormValue("name")
	descriptionStr := r.FormValue("description")
	var description *string
	if descriptionStr != "" {
		description = &descriptionStr
	}
	shortDescriptionStr := r.FormValue("short_description")
	var shortDescription *string
	if shortDescriptionStr != "" {
		shortDescription = &shortDescriptionStr
	}
	priceCentsStr := r.FormValue("price_cents")
	priceCents, err := strconv.ParseInt(priceCentsStr, 10, 64)
	if err != nil || priceCents < 0 {
		return nil, fmt.Errorf("invalid price_cents: %v", err)
	}
	stockQuantityStr := r.FormValue("stock_quantity")
	stockQuantity, err := strconv.Atoi(stockQuantityStr)
	if err != nil || stockQuantity < 0 {
		return nil, fmt.Errorf("invalid stock_quantity: %v", err)
	}
	status := r.FormValue("status")
	brand := r.FormValue("brand")
	categoryIDStr := r.FormValue("category_id")
	categoryID, err := uuid.Parse(categoryIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid category_id format: %v", err)
	}
	slug := r.FormValue("slug")

	specHighlightsJSONStr := r.FormValue("spec_highlights")
	var specHighlights map[string]any
	if specHighlightsJSONStr != "" {
		if err := json.Unmarshal([]byte(specHighlightsJSONStr), &specHighlights); err != nil {
			return nil, fmt.Errorf("invalid spec_highlights JSON: %w", err)
		}
	} else {
		specHighlights = make(map[string]any) // Initialize as empty map if not provided
	}
	imageFileHeaders := r.MultipartForm.File["images"] // Get []*multipart.FileHeader

	req := models.CreateProductRequest{
		CategoryID:       categoryID,
		Name:             name,
		Slug:             slug,
		Description:      description,
		ShortDescription: shortDescription,
		PriceCents:       priceCents,
		StockQuantity:    stockQuantity, // Keep as int, service converts to int32
		Status:           status,
		Brand:            brand,
		ImageUrls:        []string{}, // Initialize as empty, will be filled by service
		SpecHighlights:   specHighlights,
	}

	err = req.Validate()
	if err != nil {
		return nil, fmt.Errorf("validation failed for text fields: %w", err)
	}

	return h.productService.CreateProductWithUpload(r.Context(), req, imageFileHeaders)
}

func (h *ProductHandler) createProductFromJSON(w http.ResponseWriter, r *http.Request) (*models.Product, error) {
	var req models.CreateProductRequest

	if err := DecodeAndValidateJSON(w, r, &req); err != nil {
		slog.Debug("Create product request failed validation/decoding", "error", err)
		return nil, err
	}

	product, err := h.productService.CreateProduct(r.Context(), req)
	if err != nil {
		return nil, err
	}

	return product, nil
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
	productID, err := ParseUUIDPathParam(w, r, "id")
	if err != nil {
		slog.Debug("Update product request failed to parse productID", "error", err)
		return // Error response already sent by helper
	}

	contentType := r.Header.Get("Content-Type")

	// --- Detect Content-Type and Parse Accordingly ---
	var updatedProduct *models.Product

	if strings.HasPrefix(contentType, "multipart/form-data") {
		slog.Debug("Handling multipart product update request", "product_id", productID)
		// Handle Multipart Form (File Uploads)
		updatedProduct, err = h.updateProductFromMultipart(r, productID)
	} else if contentType == "application/json" || strings.HasPrefix(contentType, "application/json;") {
		slog.Debug("Handling JSON product update request", "product_id", productID)
		// Handle Standard JSON - use the new helper-based logic
		updatedProduct, err = h.updateProductFromJSON(w, r, productID)
	} else {
		utils.SendErrorResponse(w, http.StatusUnsupportedMediaType, "Unsupported Media Type", fmt.Sprintf("Unsupported Content-Type: %s", contentType))
		slog.Debug("Unsupported Content-Type received for update", "content_type", contentType, "product_id", productID)
		return
	}

	if err != nil {
		// Map service errors more specifically if possible, or use a generic helper
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

	// Successfully updated product
	slog.Debug("Successfully updated product", "product_id", updatedProduct.ID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedProduct)
}

func (h *ProductHandler) updateProductFromJSON(w http.ResponseWriter, r *http.Request, productID uuid.UUID) (*models.Product, error) {
	var req models.UpdateProductRequest
	// Use the existing helper for JSON decoding and validation
	if err := DecodeAndValidateJSON(w, r, &req); err != nil {
		slog.Debug("Update product request failed validation/decoding", "error", err, "product_id", productID)
		return nil, err // Propagate error to main handler
	}

	// Call the service to update the product (passing the validated struct and ID)
	product, err := h.productService.UpdateProduct(r.Context(), productID, req)
	if err != nil {
		return nil, err // Propagate error to main handler
	}

	return product, nil
}

func (h *ProductHandler) updateProductFromMultipart(r *http.Request, productID uuid.UUID) (*models.Product, error) {
	err := r.ParseMultipartForm(32 << 20) // 32 MB
	if err != nil {
		return nil, fmt.Errorf("error parsing multipart form: %w", err)
	}

	var req models.UpdateProductRequest

	// Check if each field is present in the form and assign to the pointer in the struct
	if val := r.FormValue("name"); val != "" {
		req.Name = &val
	}
	if val := r.FormValue("description"); val != "" {
		req.Description = &val
	}
	if val := r.FormValue("short_description"); val != "" {
		req.ShortDescription = &val
	}
	if val := r.FormValue("price_cents"); val != "" {
		if parsedVal, err := strconv.ParseInt(val, 10, 64); err == nil && parsedVal >= 0 {
			req.PriceCents = &parsedVal
		} else {
			return nil, fmt.Errorf("invalid price_cents: %v", err)
		}
	}
	if val := r.FormValue("stock_quantity"); val != "" {
		if parsedVal, err := strconv.Atoi(val); err == nil && parsedVal >= 0 {
			req.StockQuantity = &parsedVal
		} else {
			return nil, fmt.Errorf("invalid stock_quantity: %v", err)
		}
	}
	if val := r.FormValue("status"); val != "" {
		req.Status = &val
	}
	if val := r.FormValue("brand"); val != "" {
		req.Brand = &val
	}
	if val := r.FormValue("slug"); val != "" {
		req.Slug = &val
	}
	if val := r.FormValue("category_id"); val != "" {
		if parsedUUID, err := uuid.Parse(val); err == nil {
			req.CategoryID = &parsedUUID
		} else {
			return nil, fmt.Errorf("invalid category_id format: %v", err)
		}
	}
	if val := r.FormValue("spec_highlights"); val != "" {
		var specHighlights map[string]any
		if err := json.Unmarshal([]byte(val), &specHighlights); err == nil {
			req.SpecHighlights = &specHighlights
		} else {
			return nil, fmt.Errorf("invalid spec_highlights JSON: %w", err)
		}
	}
	imageFiles := r.MultipartForm.File["images"]

	product, err := h.productService.UpdateProductWithUpload(
		r.Context(),
		productID,
		req,        // Pass the UpdateProductRequest struct
		imageFiles, // Pass the []*multipart.FileHeader
	)
	if err != nil {
		return nil, fmt.Errorf("service error during update with upload: %w", err)
	}

	return product, nil
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

	r.Get("/", h.ListAllProducts)
	r.Get("/categories", h.ListCategories)

	r.Get("/categories/{id}", h.GetCategory)

	r.Patch("/{id}", h.UpdateProduct)
	r.Delete("/{id}", h.DeleteProduct)

	r.Get("/search", h.SearchProducts)
}
