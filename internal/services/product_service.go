package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"mime/multipart"

	"github.com/MihoZaki/DzTech/internal/db"
	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/MihoZaki/DzTech/internal/storage"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type ProductService struct {
	querier db.Querier
	storer  storage.Storer
}

func NewProductService(querier db.Querier, storer storage.Storer) *ProductService {
	return &ProductService{
		querier: querier,
		storer:  storer,
	}
}

func (s *ProductService) CreateProduct(ctx context.Context, req models.CreateProductRequest) (*models.Product, error) {
	// Validate category exists
	_, err := s.querier.GetCategory(ctx, req.CategoryID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("category not found")
		}
		return nil, err
	}
	// Marshal spec highlights to JSON
	specHighlightsJSON, err := json.Marshal(req.SpecHighlights)
	if err != nil {
		return nil, errors.New("invalid spec highlights format")
	}
	// Marshal image urls to JSON
	imageUrlsJSON, err := json.Marshal(req.ImageUrls) // Uses URLs from request (JSON or handler processing)
	if err != nil {
		return nil, errors.New("invalid image urls format")
	}
	params := prepareCreateProductParams(
		req.CategoryID,
		req.Name,
		req.Slug,
		req.Description,      // Pass *string directly
		req.ShortDescription, // Pass *string directly
		req.PriceCents,
		int32(req.StockQuantity),
		req.Status,
		req.Brand,
		imageUrlsJSON,
		specHighlightsJSON,
	)

	dbProduct, err := s.querier.CreateProduct(ctx, params)
	if err != nil {
		return nil, err
	}

	return s.toProductModel(dbProduct), nil
}

func (s *ProductService) CreateProductWithUpload(
	ctx context.Context,
	req models.CreateProductRequest,
	imageFileHeaders []*multipart.FileHeader, // Pass the file headers from the handler
) (*models.Product, error) {
	// Validate category exists
	_, err := s.querier.GetCategory(ctx, req.CategoryID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("category not found")
		}
		return nil, err
	}

	// --- Process Files using the Storer (Business Logic) ---
	var processedImageUrls []string
	for _, fileHeader := range imageFileHeaders {
		// Open the file
		file, err := fileHeader.Open()
		if err != nil {
			return nil, fmt.Errorf("failed to open uploaded file %s: %w", fileHeader.Filename, err)
		}

		// Upload the file using the injected storer
		url, err := s.storer.UploadFile(file, fileHeader)
		file.Close() // Close the file after uploading (regardless of success/error)
		if err != nil {
			return nil, fmt.Errorf("failed to upload image %s: %w", fileHeader.Filename, err)
		}

		processedImageUrls = append(processedImageUrls, url)
	}

	req.ImageUrls = processedImageUrls // Assign the processed URLs back to the struct
	specHighlightsJSON, err := json.Marshal(req.SpecHighlights)
	if err != nil {
		return nil, errors.New("invalid spec highlights format")
	}
	imageUrlsJSON, err := json.Marshal(req.ImageUrls) // Uses URLs from req (populated by service)
	if err != nil {
		return nil, errors.New("invalid image urls format")
	}
	params := prepareCreateProductParams(
		req.CategoryID,
		req.Name,
		req.Slug,
		req.Description,      // Pass *string directly
		req.ShortDescription, // Pass *string directly
		req.PriceCents,
		int32(req.StockQuantity), // Convert int to int32
		req.Status,
		req.Brand,
		imageUrlsJSON,
		specHighlightsJSON,
	)

	dbProduct, err := s.querier.CreateProduct(ctx, params)
	if err != nil {
		return nil, err
	}

	return s.toProductModel(dbProduct), nil
}

func (s *ProductService) GetProduct(ctx context.Context, id uuid.UUID) (*models.Product, error) {
	dbProduct, err := s.querier.GetProduct(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("product not found")
		}
		return nil, err
	}

	return s.toProductModel(dbProduct), nil
}

func (s *ProductService) GetProductBySlug(ctx context.Context, slug string) (*models.Product, error) {
	dbProduct, err := s.querier.GetProductBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("product not found")
		}
		return nil, err
	}

	return s.toProductModel(dbProduct), nil
}

// Add a method that uses the basic ListProducts function (without search)
func (s *ProductService) ListAllProducts(ctx context.Context, page, limit int) (*models.PaginatedResponse, error) {
	if limit == 0 {
		limit = 20
	}
	if page == 0 {
		page = 1
	}
	offset := (page - 1) * limit

	dbProducts, err := s.querier.ListProducts(ctx, db.ListProductsParams{
		PageLimit:  int32(limit),
		PageOffset: int32(offset),
	})
	if err != nil {
		return nil, err
	}

	// Get total count using a separate count query
	total, err := s.countAllProducts(ctx)
	if err != nil {
		return nil, err
	}
	slog.Info("the total number of products is", "total", total)
	result := make([]*models.Product, len(dbProducts))
	for i, p := range dbProducts {
		result[i] = s.toProductModel(p)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return &models.PaginatedResponse{
		Data:       result,
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}, nil
}

// Add a helper method to count all products
func (s *ProductService) countAllProducts(ctx context.Context) (int64, error) {
	// Use the dedicated count query for all products
	count, err := s.querier.CountAllProducts(ctx)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (s *ProductService) ListProductsByCategory(ctx context.Context, categoryID uuid.UUID, page, limit int) (*models.PaginatedResponse, error) {
	if limit == 0 {
		limit = 20
	}
	if page == 0 {
		page = 1
	}
	offset := (page - 1) * limit

	dbProducts, err := s.querier.ListProductsByCategory(ctx, db.ListProductsByCategoryParams{
		CategoryID: categoryID,
		PageLimit:  int32(limit),
		PageOffset: int32(offset),
	})
	if err != nil {
		return nil, err
	}

	// Count total products in category
	countQuery, err := s.querier.ListProductsByCategory(ctx, db.ListProductsByCategoryParams{
		CategoryID: categoryID,
		PageLimit:  int32(1000000), // Large number to get all
		PageOffset: 0,
	})
	if err != nil {
		return nil, err
	}

	result := make([]*models.Product, len(dbProducts))
	for i, p := range dbProducts {
		result[i] = s.toProductModel(p)
	}

	totalPages := int(math.Ceil(float64(len(countQuery)) / float64(limit)))

	return &models.PaginatedResponse{
		Data:       result,
		Page:       page,
		Limit:      limit,
		Total:      int64(len(countQuery)),
		TotalPages: totalPages,
	}, nil
}

func (s *ProductService) ListCategories(ctx context.Context) ([]*models.Category, error) {
	dbCategories, err := s.querier.ListCategories(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]*models.Category, len(dbCategories))
	for i, c := range dbCategories {
		result[i] = s.toCategoryModel(c)
	}

	return result, nil
}

func (s *ProductService) UpdateProduct(ctx context.Context, id uuid.UUID, req models.CreateProductRequest) (*models.Product, error) {
	// Validate category exists
	_, err := s.querier.GetCategory(ctx, req.CategoryID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("category not found")
		}
		return nil, err
	}

	// Marshal spec highlights to JSON
	specHighlightsJSON, err := json.Marshal(req.SpecHighlights)
	if err != nil {
		return nil, errors.New("invalid spec highlights format")
	}

	// Marshal image urls to JSON
	imageUrlsJSON, err := json.Marshal(req.ImageUrls)
	if err != nil {
		return nil, errors.New("invalid image urls format")
	}

	// Prepare update parameters
	params := db.UpdateProductParams{
		ProductID:        id,
		CategoryID:       req.CategoryID,
		Name:             req.Name,
		Slug:             req.Slug,
		Description:      nil,
		ShortDescription: nil,
		PriceCents:       req.PriceCents,
		StockQuantity:    int32(req.StockQuantity),
		Status:           req.Status,
		Brand:            req.Brand,
		ImageUrls:        imageUrlsJSON,
		SpecHighlights:   specHighlightsJSON,
	}

	if req.Description != nil {
		params.Description = req.Description
	}
	if req.ShortDescription != nil {
		params.ShortDescription = req.ShortDescription
	}

	dbProduct, err := s.querier.UpdateProduct(ctx, params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("product not found")
		}
		return nil, err
	}

	return s.toProductModel(dbProduct), nil
}

func (s *ProductService) DeleteProduct(ctx context.Context, id uuid.UUID) error {
	err := s.querier.DeleteProduct(ctx, id)
	if err != nil {
		return err
	}

	return nil
}

func (s *ProductService) SearchProducts(ctx context.Context, filter models.ProductFilter) (*models.PaginatedResponse, error) {
	limit := filter.Limit
	if limit == 0 {
		limit = 20
	}
	page := filter.Page
	if page == 0 {
		page = 1
	}
	offset := (page - 1) * limit

	// Handle nullable parameters - use zero values when not provided
	categoryID := uuid.Nil
	if filter.CategoryID != uuid.Nil {
		categoryID = filter.CategoryID
	}

	minPrice := int64(0)
	if filter.MinPrice != nil {
		minPrice = *filter.MinPrice
	}

	maxPrice := int64(0)
	if filter.MaxPrice != nil {
		maxPrice = *filter.MaxPrice
	}

	inStockOnly := false
	if filter.InStockOnly != nil {
		inStockOnly = *filter.InStockOnly
	}

	// Use the existing SearchProducts query
	dbProducts, err := s.querier.SearchProducts(ctx, db.SearchProductsParams{
		Query:       filter.Query,
		CategoryID:  categoryID,
		Brand:       filter.Brand,
		MinPrice:    minPrice,
		MaxPrice:    maxPrice,
		InStockOnly: inStockOnly,
		PageLimit:   int32(limit),
		PageOffset:  int32(offset),
	})
	if err != nil {
		return nil, err
	}

	// Get total count for pagination using CountProducts with same filters
	total, err := s.countSearchProducts(ctx, filter)
	if err != nil {
		return nil, err
	}

	result := make([]*models.Product, len(dbProducts))
	for i, p := range dbProducts {
		result[i] = s.toProductModel(p)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return &models.PaginatedResponse{
		Data:       result,
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}, nil
}

// Helper method to count search results
func (s *ProductService) countSearchProducts(ctx context.Context, filter models.ProductFilter) (int64, error) {
	// Handle nullable parameters - use zero values when not provided
	categoryID := uuid.Nil
	if filter.CategoryID != uuid.Nil {
		categoryID = filter.CategoryID
	}

	minPrice := int64(0)
	if filter.MinPrice != nil {
		minPrice = *filter.MinPrice
	}

	maxPrice := int64(0)
	if filter.MaxPrice != nil {
		maxPrice = *filter.MaxPrice
	}

	inStockOnly := false
	if filter.InStockOnly != nil {
		inStockOnly = *filter.InStockOnly
	}

	count, err := s.querier.CountProducts(ctx, db.CountProductsParams{
		Query:       filter.Query,
		CategoryID:  categoryID,
		Brand:       filter.Brand,
		MinPrice:    minPrice,
		MaxPrice:    maxPrice,
		InStockOnly: inStockOnly,
	})
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (s *ProductService) GetCategoryByID(ctx context.Context, id uuid.UUID) (*models.Category, error) {
	dbCategory, err := s.querier.GetCategory(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("category not found")
		}
		return nil, err
	}

	return s.toCategoryModel(dbCategory), nil
}

func (s *ProductService) GetCategoryBySlug(ctx context.Context, slug string) (*models.Category, error) {
	dbCategory, err := s.querier.GetCategoryBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("category not found")
		}
		return nil, err
	}

	return s.toCategoryModel(dbCategory), nil
}

// Add the Category model conversion function
func (s *ProductService) toCategoryModel(dbCategory db.Category) *models.Category {
	category := &models.Category{
		ID:        dbCategory.ID, // uuid.UUID
		Name:      dbCategory.Name,
		Slug:      dbCategory.Slug,
		Type:      dbCategory.Type,
		CreatedAt: dbCategory.CreatedAt.Time,
	}

	// Handle nullable ParentID - now correctly as *uuid.UUID
	if dbCategory.ParentID != uuid.Nil {
		category.ParentID = &dbCategory.ParentID
	}

	return category
}

func (s *ProductService) toProductModel(dbProduct db.Product) *models.Product {
	product := &models.Product{
		ID:            dbProduct.ID,
		CategoryID:    dbProduct.CategoryID,
		Name:          dbProduct.Name,
		Slug:          dbProduct.Slug,
		PriceCents:    dbProduct.PriceCents,
		StockQuantity: int(dbProduct.StockQuantity),
		Status:        dbProduct.Status,
		Brand:         dbProduct.Brand,
		CreatedAt:     dbProduct.CreatedAt.Time,
		UpdatedAt:     dbProduct.UpdatedAt.Time,
	}

	// Handle optional fields
	if dbProduct.Description != nil {
		product.Description = dbProduct.Description
	}
	if dbProduct.ShortDescription != nil {
		product.ShortDescription = dbProduct.ShortDescription
	}
	if dbProduct.DeletedAt.Valid {
		deletedAt := dbProduct.DeletedAt.Time
		product.DeletedAt = &deletedAt
	}

	// Unmarshal JSON fields
	var imageUrls []string
	if err := json.Unmarshal(dbProduct.ImageUrls, &imageUrls); err == nil {
		product.ImageUrls = imageUrls
	}

	var specHighlights map[string]any
	if err := json.Unmarshal(dbProduct.SpecHighlights, &specHighlights); err == nil {
		product.SpecHighlights = specHighlights
	}

	return product
}

func prepareCreateProductParams(categoryID uuid.UUID, name, slug string, description, shortDescription *string, priceCents int64, stockQuantity int32, status, brand string, imageUrlsJSON, specHighlightsJSON []byte) db.CreateProductParams { // Changed description, shortDescription to *string
	params := db.CreateProductParams{
		CategoryID:       categoryID,
		Name:             name,
		Slug:             slug,
		Description:      nil, // Will be set conditionally below
		ShortDescription: nil, // Will be set conditionally below
		PriceCents:       priceCents,
		StockQuantity:    stockQuantity,
		Status:           status,
		Brand:            brand,
		ImageUrls:        imageUrlsJSON,      // Already marshalled JSON bytes
		SpecHighlights:   specHighlightsJSON, // Already marshalled JSON bytes
	}

	// Conditionally set optional fields based on whether the pointers are not nil
	if description != nil {
		params.Description = description
	}
	if shortDescription != nil {
		params.ShortDescription = shortDescription
	}

	return params
}
