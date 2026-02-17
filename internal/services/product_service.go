package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"mime/multipart"
	"slices"
	"strings"
	"time"

	"github.com/MihoZaki/DzTech/internal/db"
	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/MihoZaki/DzTech/internal/storage"
	"github.com/MihoZaki/DzTech/internal/utils"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
)

type ProductService struct {
	querier db.Querier
	storer  storage.Storer
	cache   *redis.Client
	logger  *slog.Logger
}

const (
	CacheKeyProductByID   = "product:id:%s"   // Format: product:id:{uuid_string}
	CacheKeyProductBySlug = "product:slug:%s" // Format: product:slug:{slug_string}
	ProductCacheTTL       = 30 * time.Minute  // Define TTL for product cache entries
)

func NewProductService(querier db.Querier, storer storage.Storer, cache *redis.Client, logger *slog.Logger) *ProductService {
	return &ProductService{
		querier: querier,
		storer:  storer,
		cache:   cache,
		logger:  logger,
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
	// --- Generate Slug ---
	baseSlug := utils.GenerateSlug(req.Name)
	finalSlug := s.ensureUniqueSlug(ctx, baseSlug)

	params := prepareCreateProductParams(
		req.CategoryID,
		req.Name,
		finalSlug,
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

func (s *ProductService) CreateProductWithUpload(ctx context.Context, req models.CreateProductRequest, imageFileHeaders []*multipart.FileHeader) (*models.Product, error) {
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

	// --- Generate Slug ---
	baseSlug := utils.GenerateSlug(req.Name)
	finalSlug := s.ensureUniqueSlug(ctx, baseSlug)
	params := prepareCreateProductParams(
		req.CategoryID,
		req.Name,
		finalSlug,
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

// GetProduct retrieves a product by its ID, including calculated discount information, utilizing caching.
func (s *ProductService) GetProduct(ctx context.Context, id uuid.UUID) (*models.Product, error) {
	cacheKey := fmt.Sprintf(CacheKeyProductByID, id.String())

	// --- Try to get from cache first ---
	cachedData, err := s.cache.Get(ctx, cacheKey).Result()
	if err == nil {
		// Cache hit - deserialize and return
		var product models.Product
		if err := json.Unmarshal([]byte(cachedData), &product); err != nil {
			s.logger.Error("Failed to unmarshal cached product", "key", cacheKey, "error", err)
			// Proceed to fetch from DB below
		} else {
			s.logger.Debug("Product fetched from cache", "id", id)
			return &product, nil
		}
	} else if !errors.Is(err, redis.Nil) {
		// Some other Redis error occurred
		s.logger.Error("Redis error fetching product by ID", "key", cacheKey, "error", err)
		// Proceed to fetch from DB below
	}
	// If err was redis.Nil (cache miss) or unmarshalling failed, fetch from DB
	// ---

	s.logger.Debug("Product cache miss, fetching from database", "id", id)

	// Fetch from database using the existing query
	// Assuming you have a query like db.GetProductWithDiscountInfoRow(id)
	dbProduct, err := s.querier.GetProductWithDiscountInfo(ctx, id) // Use the actual query name
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("product not found")
		}
		return nil, fmt.Errorf("failed to fetch product from database: %w", err)
	}

	// Map the database product (with discount info) to the application model
	product := s.toProductModelWithDiscount(dbProduct) // Use the actual mapping function name

	// --- Store the result in cache ---
	productJSON, err := json.Marshal(product)
	if err != nil {
		s.logger.Error("Failed to marshal product for caching", "id", id, "error", err)
		// Still return the product fetched from the DB
	} else {
		// Cache for 30 minutes (adjust TTL as needed)
		if err := s.cache.Set(ctx, cacheKey, productJSON, ProductCacheTTL).Err(); err != nil {
			s.logger.Error("Failed to cache product", "key", cacheKey, "error", err)
		} else {
			s.logger.Debug("Product cached", "id", id, "key", cacheKey)
		}
	}

	return product, nil
}

// GetProductWithDiscountInfoBySlug retrieves a product by its slug, including calculated discount information, utilizing caching.
func (s *ProductService) GetProductWithDiscountInfoBySlug(ctx context.Context, slug string) (*models.Product, error) {
	cacheKey := fmt.Sprintf(CacheKeyProductBySlug, slug)

	// --- Try to get from cache first ---
	cachedData, err := s.cache.Get(ctx, cacheKey).Result()
	if err == nil {
		// Cache hit - deserialize and return
		var product models.Product
		if err := json.Unmarshal([]byte(cachedData), &product); err != nil {
			s.logger.Error("Failed to unmarshal cached product by slug", "key", cacheKey, "error", err)
			// Proceed to fetch from DB below
		} else {
			s.logger.Debug("Product fetched from cache by slug", "slug", slug)
			return &product, nil
		}
	} else if !errors.Is(err, redis.Nil) {
		// Some other Redis error occurred
		s.logger.Error("Redis error fetching product by slug", "key", cacheKey, "error", err)
		// Proceed to fetch from DB below
	}
	// If err was redis.Nil (cache miss) or unmarshalling failed, fetch from DB
	// ---

	s.logger.Debug("Product by slug cache miss, fetching from database", "slug", slug)

	// Fetch from database using the existing query
	// Assuming you have a query like db.GetProductWithDiscountInfoBySlugRow(slug)
	dbProduct, err := s.querier.GetProductWithDiscountInfoBySlug(ctx, slug) // Use the actual query name
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("product not found")
		}
		return nil, fmt.Errorf("failed to fetch product from database: %w", err)
	}

	// Map the database product (with discount info) to the application model
	product := s.toProductModelWithDiscount(db.GetProductWithDiscountInfoRow(dbProduct)) // Pass the row struct directly, not a call to GetProductWithDiscountInfoRow

	// --- Store the result in cache ---
	productJSON, err := json.Marshal(product)
	if err != nil {
		s.logger.Error("Failed to marshal product for caching by slug", "slug", slug, "error", err)
		// Still return the product fetched from the DB
	} else {
		// Cache for 30 minutes (adjust TTL as needed)
		if err := s.cache.Set(ctx, cacheKey, productJSON, ProductCacheTTL).Err(); err != nil {
			s.logger.Error("Failed to cache product by slug", "key", cacheKey, "error", err)
		} else {
			s.logger.Debug("Product cached by slug", "slug", slug, "key", cacheKey)
		}
	}

	return product, nil
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
	dbProducts, err := s.querier.GetProductsWithDiscountInfo(ctx, db.GetProductsWithDiscountInfoParams{
		Limit:  int32(limit),
		Offset: int32(offset),
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
		result[i] = s.toProductModelWithDiscount(db.GetProductWithDiscountInfoRow(p))
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

func (s *ProductService) ListCategories(ctx context.Context, page, limit int) ([]*models.Category, error) {
	if limit == 0 {
		limit = 20
	}
	if page == 0 {
		page = 1
	}
	offset := (page - 1) * limit

	dbCategories, err := s.querier.ListCategories(ctx, db.ListCategoriesParams{
		Limit:  20,
		Offset: int32(offset),
	})
	if err != nil {
		return nil, err
	}

	result := make([]*models.Category, len(dbCategories))
	for i, c := range dbCategories {
		result[i] = s.toCategoryModel(c)
	}

	return result, nil
}

// UpdateProduct updates an existing product and invalidates its cache entries.
func (s *ProductService) UpdateProduct(ctx context.Context, id uuid.UUID, req models.UpdateProductRequest) (*models.Product, error) {
	// Fetch the *existing* product to get its current values (including slug) for potential cache invalidation
	existingDbProduct, err := s.querier.GetProduct(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("product not found")
		}
		return nil, fmt.Errorf("failed to fetch existing product for cache invalidation: %w", err)
	}

	// --- Perform the actual update logic (keeping existing validation and parameter preparation) ---
	var finalImageUrls []string
	if req.ImageUrls != nil {
		finalImageUrls = *req.ImageUrls
	} else {
		if err := json.Unmarshal(existingDbProduct.ImageUrls, &finalImageUrls); err != nil {
			return nil, fmt.Errorf("failed to unmarshal existing image URLs: %w", err)
		}
	}

	params, err := prepareUpdateProductParams(existingDbProduct, req, finalImageUrls)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare update parameters: %w", err)
	}

	if req.CategoryID != nil {
		_, err := s.querier.GetCategory(ctx, *req.CategoryID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, errors.New("category not found")
			}
			return nil, err
		}
	}

	// If Name is being updated, generate a new slug
	if req.Name != nil && *req.Name != existingDbProduct.Name { // Check if name actually changed
		newBaseSlug := utils.GenerateSlug(*req.Name)
		newFinalSlug := s.ensureUniqueSlug(ctx, newBaseSlug) // Use the helper again
		params.Slug = newFinalSlug                           // Update the slug in params
	} else {
		// If name didn't change, keep the existing slug
		params.Slug = existingDbProduct.Slug
	}

	updatedDbProduct, err := s.querier.UpdateProduct(ctx, params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("product not found") // Should ideally not happen if GetProduct succeeded
		}
		if strings.Contains(err.Error(), "duplicate key value violates unique constraint") {
			if strings.Contains(err.Error(), "slug") {
				return nil, errors.New("product slug already exists")
			}
		}
		return nil, fmt.Errorf("failed to update product in database: %w", err)
	}

	updatedProduct := s.toProductModel(updatedDbProduct)

	// --- Invalidate Cache Entries ---
	// Invalidate the entry for the product ID
	cacheKeyByID := fmt.Sprintf(CacheKeyProductByID, id.String())
	if err := s.cache.Del(ctx, cacheKeyByID).Err(); err != nil {
		s.logger.Error("Failed to invalidate product cache by ID on update", "key", cacheKeyByID, "error", err)
	} else {
		s.logger.Debug("Product cache invalidated by ID on update", "id", id, "key", cacheKeyByID)
	}

	// Invalidate the entry for the OLD slug if it changed
	oldSlug := existingDbProduct.Slug
	newSlug := updatedProduct.Slug // Get the new slug from the *updated* product model
	if oldSlug != newSlug {
		cacheKeyByOldSlug := fmt.Sprintf(CacheKeyProductBySlug, oldSlug)
		if err := s.cache.Del(ctx, cacheKeyByOldSlug).Err(); err != nil {
			s.logger.Error("Failed to invalidate product cache by old slug on update", "slug", oldSlug, "key", cacheKeyByOldSlug, "error", err)
		} else {
			s.logger.Debug("Product cache invalidated by old slug on update", "slug", oldSlug, "key", cacheKeyByOldSlug)
		}
	}

	// Always invalidate the entry for the NEW slug (in case it's used elsewhere or if slug didn't change)
	cacheKeyByNewSlug := fmt.Sprintf(CacheKeyProductBySlug, newSlug)
	if err := s.cache.Del(ctx, cacheKeyByNewSlug).Err(); err != nil {
		s.logger.Error("Failed to invalidate product cache by new slug on update", "slug", newSlug, "key", cacheKeyByNewSlug, "error", err)
	} else {
		s.logger.Debug("Product cache invalidated by new slug on update", "slug", newSlug, "key", cacheKeyByNewSlug)
	}
	// ---

	return updatedProduct, nil
}

// UpdateProductWithUpload updates a product, replacing its images if new ones are provided.
// It also cleans up the old images from storage after the update succeeds.
func (s *ProductService) UpdateProductWithUpload(ctx context.Context, productID uuid.UUID, req models.UpdateProductRequest, imageFileHeaders []*multipart.FileHeader,
) (*models.Product, error) {
	// Step 1: Fetch the existing product to get its current image URLs for potential cleanup
	// Also get the old slug for cache invalidation
	existingDbProduct, err := s.querier.GetProduct(ctx, productID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("product not found")
		}
		return nil, fmt.Errorf("failed to get existing product: %w", err)
	}

	// Store the old slug for cache invalidation later
	oldSlug := existingDbProduct.Slug

	// Step 2: Determine the final image URLs based on input
	var finalImageUrls []string
	var uploadedUrlsForCleanup []string // Track newly uploaded URLs in case DB update fails

	if len(imageFileHeaders) > 0 {
		// If new files are provided, REPLACE ALL existing images with the new ones ("Replace All" strategy).
		for _, fileHeader := range imageFileHeaders {
			file, err := fileHeader.Open()
			if err != nil {
				return nil, fmt.Errorf("failed to open uploaded file %s: %w", fileHeader.Filename, err)
			}

			url, err := s.storer.UploadFile(file, fileHeader)
			file.Close() // Ensure file is closed after processing
			if err != nil {
				return nil, fmt.Errorf("failed to upload image %s: %w", fileHeader.Filename, err)
			}
			finalImageUrls = append(finalImageUrls, url)
			uploadedUrlsForCleanup = append(uploadedUrlsForCleanup, url) // Track for potential cleanup if DB fails
		}
	} else {
		// If no new files, keep the existing ones
		if err := json.Unmarshal(existingDbProduct.ImageUrls, &finalImageUrls); err != nil {
			return nil, fmt.Errorf("failed to unmarshal existing image URLs: %w", err)
		}
	}

	// Step 3: Prepare parameters for the database update
	params, err := prepareUpdateProductParams(existingDbProduct, req, finalImageUrls)
	if err != nil {
		// If parameters preparation failed, and we uploaded files, consider cleaning them up
		// (though unlikely unless spec highlight marshalling fails)
		// For now, let's assume prepareUpdateProductParams doesn't fail due to file issues.
		return nil, fmt.Errorf("failed to prepare update parameters: %w", err)
	}

	// Handle category validation if needed
	if req.CategoryID != nil {
		_, err := s.querier.GetCategory(ctx, *req.CategoryID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, errors.New("category not found")
			}
			return nil, err
		}
	}

	// Handle slug generation if name changed
	if req.Name != nil && *req.Name != existingDbProduct.Name {
		newBaseSlug := utils.GenerateSlug(*req.Name)
		newFinalSlug := s.ensureUniqueSlug(ctx, newBaseSlug)
		params.Slug = newFinalSlug
	} else {
		params.Slug = existingDbProduct.Slug
	}

	// Step 4: Perform the database update
	updatedDbProduct, err := s.querier.UpdateProduct(ctx, params)
	if err != nil {
		// DB update failed. Clean up any newly uploaded files.
		if len(uploadedUrlsForCleanup) > 0 {
			slog.Warn("Cleaning up uploaded files after DB update failure", "product_id", productID, "urls", uploadedUrlsForCleanup)
			for _, url := range uploadedUrlsForCleanup {
				if delErr := s.storer.DeleteFile(url); delErr != nil {
					slog.Error("Failed to clean up uploaded file after DB failure", "url", url, "error", delErr)
					// Log error but don't return it, as the original DB error is more important
				}
			}
		}
		// Handle potential DB constraint errors (e.g., unique slug violation)
		if strings.Contains(err.Error(), "duplicate key value violates unique constraint") && strings.Contains(err.Error(), "slug") {
			return nil, errors.New("product slug already exists")
		}
		return nil, fmt.Errorf("failed to update product in database: %w", err)
	}

	// Step 5: DB update succeeded. Now, delete the OLD images that are no longer referenced.
	// Unmarshal the old image URLs from the existing product record.
	var oldImageUrls []string
	if err := json.Unmarshal(existingDbProduct.ImageUrls, &oldImageUrls); err != nil {
		// Log the error but continue, as the product update itself was successful.
		slog.Error("Failed to unmarshal old image URLs for cleanup after successful update", "product_id", productID, "error", err)
		// Do NOT return here, the product update is complete.
	} else {
		// Iterate through old URLs and delete them using the storer, skipping those still in the new list.
		for _, oldUrl := range oldImageUrls {
			// Use slices.Contains to check if the old URL is in the new list.
			if !slices.Contains(finalImageUrls, oldUrl) {
				if err := s.storer.DeleteFile(oldUrl); err != nil {
					slog.Error("Failed to delete old image file during update", "url", oldUrl, "product_id", productID, "error", err)
				} else {
					slog.Debug("Deleted old image file during product update", "url", oldUrl, "product_id", productID)
				}
			} else {
				slog.Debug("Keeping image file during product update (still referenced)", "url", oldUrl, "product_id", productID)
			}
		}
	}

	// Step 6: Return the updated product model
	updatedProduct := s.toProductModel(updatedDbProduct)

	// --- CACHE INVALIDATION (Added) ---
	// Invalidate the entry for the product ID
	cacheKeyByID := fmt.Sprintf(CacheKeyProductByID, productID.String())
	if err := s.cache.Del(ctx, cacheKeyByID).Err(); err != nil {
		s.logger.Error("Failed to invalidate product cache by ID on update with upload", "key", cacheKeyByID, "error", err)
	} else {
		s.logger.Debug("Product cache invalidated by ID on update with upload", "id", productID, "key", cacheKeyByID)
	}

	// Get the new slug from the updated product model
	newSlug := updatedProduct.Slug

	// Invalidate the entry for the OLD slug if it changed
	if oldSlug != newSlug {
		cacheKeyByOldSlug := fmt.Sprintf(CacheKeyProductBySlug, oldSlug)
		if err := s.cache.Del(ctx, cacheKeyByOldSlug).Err(); err != nil {
			s.logger.Error("Failed to invalidate product cache by old slug on update with upload", "slug", oldSlug, "key", cacheKeyByOldSlug, "error", err)
		} else {
			s.logger.Debug("Product cache invalidated by old slug on update with upload", "slug", oldSlug, "key", cacheKeyByOldSlug)
		}
	}

	// Always invalidate the entry for the NEW slug (in case it's used elsewhere or if slug didn't change)
	cacheKeyByNewSlug := fmt.Sprintf(CacheKeyProductBySlug, newSlug)
	if err := s.cache.Del(ctx, cacheKeyByNewSlug).Err(); err != nil {
		s.logger.Error("Failed to invalidate product cache by new slug on update with upload", "slug", newSlug, "key", cacheKeyByNewSlug, "error", err)
	} else {
		s.logger.Debug("Product cache invalidated by new slug on update with upload", "slug", newSlug, "key", cacheKeyByNewSlug)
	}
	// ---

	return updatedProduct, nil
}

func coalesceUUIDPtr(newVal *uuid.UUID, existingVal uuid.UUID) uuid.UUID {
	if newVal != nil {
		return *newVal
	}
	return existingVal
}

func coalesceString(newVal *string, existingVal string) string {
	if newVal != nil {
		return *newVal
	}
	return existingVal
}

func coalesceStringPtr(newVal *string, existingVal *string) *string {
	if newVal != nil {
		return newVal
	}
	return existingVal
}

func coalesceInt64(newVal *int64, existingVal int64) int64 {
	if newVal != nil {
		return *newVal
	}
	return existingVal
}
func coalesceInt32(newVal *int, existingVal int32) int32 {
	if newVal != nil {
		return int32(*newVal)
	}
	return existingVal
}

// DeleteProduct soft-deletes a product and cleans up its associated image files.
// It also invalidates the product's cache entries.
func (s *ProductService) DeleteProduct(ctx context.Context, id uuid.UUID) error {
	// Step 1: Fetch the existing product *before* deletion to get its slug for cache invalidation.
	existingDbProduct, err := s.querier.GetProduct(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("product not found")
		}
		return fmt.Errorf("failed to get product for deletion/cleanup/cache invalidation: %w", err)
	}

	// Step 2: Perform the soft-delete in the database.
	err = s.querier.DeleteProduct(ctx, id)
	if err != nil {
		return err // Return DB error directly if deletion fails
	}

	// Step 3: DB deletion succeeded. Now, delete the associated image files.
	var imageUrlsToDelete []string
	if err := json.Unmarshal(existingDbProduct.ImageUrls, &imageUrlsToDelete); err != nil {
		// Log the error but continue, as the product deletion itself was successful.
		slog.Error("Failed to unmarshal image URLs for cleanup after successful deletion", "product_id", id, "error", err)
		// Do NOT return here, the product deletion is complete.
	} else {
		// Iterate through the URLs and delete them using the storer.
		for _, url := range imageUrlsToDelete {
			if err := s.storer.DeleteFile(url); err != nil {
				slog.Error("Failed to delete image file during product deletion", "url", url, "product_id", id, "error", err)
				// Log error but don't return it, as the product deletion itself was successful.
			} else {
				slog.Debug("Deleted image file during product deletion", "url", url, "product_id", id)
			}
		}
	}

	// --- Invalidate Cache Entries ---
	// Invalidate the entry for the product ID
	cacheKeyByID := fmt.Sprintf(CacheKeyProductByID, id.String())
	if err := s.cache.Del(ctx, cacheKeyByID).Err(); err != nil {
		s.logger.Error("Failed to invalidate product cache by ID on delete", "key", cacheKeyByID, "error", err)
	} else {
		s.logger.Debug("Product cache invalidated by ID on delete", "id", id, "key", cacheKeyByID)
	}

	// Invalidate the entry for the product slug
	cacheKeyBySlug := fmt.Sprintf(CacheKeyProductBySlug, existingDbProduct.Slug)
	if err := s.cache.Del(ctx, cacheKeyBySlug).Err(); err != nil {
		s.logger.Error("Failed to invalidate product cache by slug on delete", "slug", existingDbProduct.Slug, "key", cacheKeyBySlug, "error", err)
	} else {
		s.logger.Debug("Product cache invalidated by slug on delete", "slug", existingDbProduct.Slug, "key", cacheKeyBySlug)
	}
	// ---

	return nil
}

func (s *ProductService) SearchProducts(ctx context.Context, filter models.ProductFilter, specFilterKey, specFilterValue string) (*models.PaginatedResponse, error) {
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
	includeDiscountedOnly := false
	if filter.IncludeDiscountedOnly != nil {
		includeDiscountedOnly = *filter.IncludeDiscountedOnly
	}
	specFilter := ""
	if filter.SpecFilter != nil {
		specFilter = *filter.SpecFilter
	}

	applySpecFilter := specFilter != ""

	// Use the existing SearchProducts query
	dbProducts, err := s.querier.SearchProductsWithDiscounts(ctx, db.SearchProductsWithDiscountsParams{
		Query:                 filter.Query,
		CategoryID:            categoryID,
		Brand:                 filter.Brand,
		MinPrice:              minPrice,
		MaxPrice:              maxPrice,
		IncludeDiscountedOnly: includeDiscountedOnly,
		InStockOnly:           inStockOnly,
		ApplySpecFilter:       applySpecFilter,
		SpecFilterKey:         specFilterKey,
		SpecFilterValue:       &specFilterValue,
		PageLimit:             int32(limit),
		PageOffset:            int32(offset),
	})
	if err != nil {
		return nil, err
	}

	// Get total count for pagination using CountProducts with same filters
	total, err := s.countSearchProducts(ctx, filter, specFilterKey, specFilterValue)
	if err != nil {
		return nil, err
	}

	result := make([]*models.Product, len(dbProducts))
	for i, p := range dbProducts {
		result[i] = s.toProductModelWithDiscount(db.GetProductWithDiscountInfoRow(p))
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
func (s *ProductService) countSearchProducts(ctx context.Context, filter models.ProductFilter, specFilterKey, SpecFilterValue string) (int64, error) {
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
	includeDiscountedOnly := false
	if filter.IncludeDiscountedOnly != nil {
		includeDiscountedOnly = *filter.IncludeDiscountedOnly
	}

	specFilter := ""
	if filter.SpecFilter != nil {
		specFilter = *filter.SpecFilter
	}

	applySpecFilter := specFilter != ""

	count, err := s.querier.CountProducts(ctx, db.CountProductsParams{
		Query:                 filter.Query,
		CategoryID:            categoryID,
		Brand:                 filter.Brand,
		MinPrice:              minPrice,
		MaxPrice:              maxPrice,
		InStockOnly:           inStockOnly,
		IncludeDiscountedOnly: includeDiscountedOnly,
		ApplySpecFilter:       applySpecFilter,
		SpecFilterKey:         specFilterKey,
		SpecFilterValue:       &SpecFilterValue,
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
		product.ImageURLs = imageUrls
	}

	var specHighlights map[string]any
	if err := json.Unmarshal(dbProduct.SpecHighlights, &specHighlights); err == nil {
		product.SpecHighlights = specHighlights
	}

	return product
}

// toProductModelWithDiscount converts the SQLC-generated GetProductWithDiscountInfoRow to the application model Product.
// This version includes discount information calculated by the view.
func (s *ProductService) toProductModelWithDiscount(dbRow db.GetProductWithDiscountInfoRow) *models.Product {
	product := &models.Product{
		ID:           dbRow.ID,
		CategoryID:   dbRow.CategoryID,
		Name:         dbRow.Name,
		CategoryName: &dbRow.CategoryName,
		Slug:         dbRow.Slug,
		// Use OriginalPriceCents from the query result for the base price in the model
		PriceCents:    dbRow.OriginalPriceCents,
		StockQuantity: int(dbRow.StockQuantity), // Convert int32 to int
		NumRatings:    dbRow.NumRatings,
		Status:        dbRow.Status,
		Brand:         dbRow.Brand,
		CreatedAt:     dbRow.CreatedAt.Time, // Convert pgtype.Timestamptz to time.Time
		UpdatedAt:     dbRow.UpdatedAt.Time, // Convert pgtype.Timestamptz to time.Time
		// Initialize discount fields
		DiscountedPriceCents: &dbRow.DiscountedPriceCents,
		HasActiveDiscount:    dbRow.HasActiveDiscount, // Map boolean directly
		// Map the new breakdown fields from the view
		TotalCalculatedFixedDiscountCents:  &dbRow.VpcdTotalFixedDiscountCents,
		CalculatedCombinedPercentageFactor: &dbRow.VpcdCombinedPercentageFactor,
		// Set single discount details to nil as they are less meaningful with stacking
		DiscountCode:  nil,
		DiscountType:  nil,
		DiscountValue: nil,
	}

	// Calculate EffectiveDiscountPercentage based on Original and Discounted prices
	// Formula: ((OriginalPrice - DiscountedPrice) / OriginalPrice) * 100
	if dbRow.OriginalPriceCents > 0 && dbRow.DiscountedPriceCents < dbRow.OriginalPriceCents {
		original := float64(dbRow.OriginalPriceCents)
		discounted := float64(dbRow.DiscountedPriceCents)
		effectivePct := ((original - discounted) / original) * 100.0
		// Round to a reasonable number of decimal places (e.g., 2)
		effectivePct = math.Round(effectivePct*100) / 100
		product.EffectiveDiscountPercentage = &effectivePct
	}

	avgRating, err := dbRow.AvgRating.Float64Value()
	if err == nil {
		product.AvgRating = avgRating.Float64
	}

	// Handle optional fields from the base product info
	if dbRow.Description != nil {
		product.Description = dbRow.Description
	}
	if dbRow.ShortDescription != nil {
		product.ShortDescription = dbRow.ShortDescription
	}
	if dbRow.DeletedAt.Valid {
		deletedAt := dbRow.DeletedAt.Time // Convert pgtype.Timestamptz to time.Time
		product.DeletedAt = &deletedAt
	}

	// Unmarshal JSON fields (ImageUrls, SpecHighlights are []byte from the query result)
	var imageUrls []string
	if err := json.Unmarshal(dbRow.ImageUrls, &imageUrls); err == nil {
		product.ImageURLs = imageUrls
	} else {
		// Log error or handle failure to unmarshal
		// slog.Warn("Failed to unmarshal ImageUrls", "product_id", dbRow.ID, "error", err)
		product.ImageURLs = []string{} // Fallback to empty slice
	}

	var specHighlights map[string]interface{} // Use interface{} to match models.Product
	if err := json.Unmarshal(dbRow.SpecHighlights, &specHighlights); err == nil {
		product.SpecHighlights = specHighlights
	} else {
		// Log error or handle failure to unmarshal
		// slog.Warn("Failed to unmarshal SpecHighlights", "product_id", dbRow.ID, "error", err)
		product.SpecHighlights = map[string]interface{}{} // Fallback to empty map
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
func prepareUpdateProductParams(
	existingDbProduct db.Product,
	updates models.UpdateProductRequest,
	newImageUrls []string,
) (db.UpdateProductParams, error) {
	imageUrlsJSON, err := json.Marshal(newImageUrls)
	if err != nil {
		return db.UpdateProductParams{}, errors.New("failed to marshal updated image URLs")
	}

	params := db.UpdateProductParams{
		ProductID:        existingDbProduct.ID,
		CategoryID:       coalesceUUIDPtr(updates.CategoryID, existingDbProduct.CategoryID),
		Name:             coalesceString(updates.Name, existingDbProduct.Name),
		Description:      coalesceStringPtr(updates.Description, existingDbProduct.Description),
		ShortDescription: coalesceStringPtr(updates.ShortDescription, existingDbProduct.ShortDescription),
		PriceCents:       coalesceInt64(updates.PriceCents, existingDbProduct.PriceCents),
		StockQuantity:    coalesceInt32(updates.StockQuantity, existingDbProduct.StockQuantity),
		Status:           coalesceString(updates.Status, existingDbProduct.Status),
		Brand:            coalesceString(updates.Brand, existingDbProduct.Brand),
		ImageUrls:        imageUrlsJSON,
		SpecHighlights:   existingDbProduct.SpecHighlights,
	}

	if updates.SpecHighlights != nil {
		newSpecHighlightsJSON, err := json.Marshal(*updates.SpecHighlights)
		if err != nil {
			return params, errors.New("failed to marshal updated spec highlights")
		}
		params.SpecHighlights = newSpecHighlightsJSON
	}

	return params, nil
}

// ensureUniqueSlug generates a unique slug based on the base slug.
// It checks the database and appends a suffix if necessary.
func (s *ProductService) ensureUniqueSlug(ctx context.Context, baseSlug string) string {
	slugToTry := baseSlug
	counter := 0

	for {
		// Check if the slug already exists
		exists, err := s.checkSlugExists(ctx, slugToTry)
		if err != nil {
			slog.Error("Error checking slug existence", "slug", slugToTry, "error", err)
			panic(err) // Or return "", err if you want to handle it upstream
		}

		if !exists {
			return slugToTry // Found a unique slug
		}

		// Slug exists, increment counter and try again
		counter++
		slugToTry = fmt.Sprintf("%s-%d", baseSlug, counter)
	}
}

func (s *ProductService) checkSlugExists(ctx context.Context, slug string) (bool, error) {
	exists, err := s.querier.CheckSlugExists(ctx, slug) // Assumes CheckSlugExists is generated
	if err != nil {
		return false, err
	}
	return exists, nil
}
func calculateDiscountPercentage(originalPrice, finalPrice int64) int64 {
	if originalPrice == 0 {
		return 0 // Avoid division by zero
	}
	discount := ((originalPrice - finalPrice) / originalPrice) * 100
	return discount
}
