package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"time"

	"github.com/MihoZaki/DzTech/internal/db"
	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/redis/go-redis/v9"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// DiscountService handles business logic for discounts.
type DiscountService struct {
	querier db.Querier
	cache   *redis.Client
	logger  *slog.Logger
}

// NewDiscountService creates a new instance of DiscountService.
func NewDiscountService(querier db.Querier, cache *redis.Client, logger *slog.Logger) *DiscountService {
	return &DiscountService{
		querier: querier,
		cache:   cache,
		logger:  logger,
	}
}

const (
	CacheKeyDiscountByID   = "discount:id:%s"   // Format: discount:id:{uuid_string}
	CacheKeyDiscountByCode = "discount:code:%s" // Format: discount:code:{code_string}
	DiscountCacheTTL       = 1 * time.Hour      // Define TTL for discount cache entries
)

// CreateDiscount creates a new discount rule.
func (s *DiscountService) CreateDiscount(ctx context.Context, req models.CreateDiscountRequest) (*models.Discount, error) {
	// Validate DiscountValue based on DiscountType
	if req.DiscountType == models.DiscountTypePercentage && req.DiscountValue > 100 {
		return nil, errors.New("percentage discount value cannot exceed 100")
	}

	// Check if code already exists
	_, err := s.querier.GetDiscountByCode(ctx, req.Code)
	if err == nil {
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		// An unexpected DB error occurred while checking existence
		return nil, fmt.Errorf("failed to check for existing discount code: %w", err)
	}
	// The DB UNIQUE constraint will ultimately enforce global uniqueness.

	// Prepare parameters for the query, converting from models to db types
	params := db.CreateDiscountParams{
		Code:               req.Code,
		Description:        req.Description, // *string maps directly
		DiscountType:       string(req.DiscountType),
		DiscountValue:      req.DiscountValue,
		MinOrderValueCents: req.MinOrderValueCents,          // *int64 maps directly
		MaxUses:            Int32PtrFromIntPtr(req.MaxUses), // Helper to convert *int to *int32
		ValidFrom:          ToPgTimestamptz(req.ValidFrom),  // Helper to convert time.Time to pgtype.Timestamptz
		ValidUntil:         ToPgTimestamptz(req.ValidUntil),
		IsActive:           req.IsActive,
	}

	// Execute the query to create the discount
	dbDiscount, err := s.querier.CreateDiscount(ctx, params)
	if err != nil {
		// Check if the error is due to UNIQUE constraint violation (duplicate code)
		if IsUniqueViolation(err, "discounts_code_key") { // Helper to check error code
			return nil, fmt.Errorf("discount with code '%s' already exists", req.Code)
		}
		return nil, fmt.Errorf("failed to create discount in database: %w", err)
	}

	// Map the created database discount to the application model
	createdDiscount := s.mapDbDiscountToModel(dbDiscount)

	s.logger.Info("Discount created successfully", "discount_id", createdDiscount.ID, "code", createdDiscount.Code)
	return createdDiscount, nil
}

// GetDiscount retrieves a discount by its ID, utilizing caching.
func (s *DiscountService) GetDiscount(ctx context.Context, id uuid.UUID) (*models.Discount, error) {
	cacheKey := fmt.Sprintf(CacheKeyDiscountByID, id.String())

	// --- Try to get from cache first ---
	cachedData, err := s.cache.Get(ctx, cacheKey).Result()
	if err == nil {
		// Cache hit - deserialize and return
		var discount models.Discount
		if err := json.Unmarshal([]byte(cachedData), &discount); err != nil {
			s.logger.Error("Failed to unmarshal cached discount", "key", cacheKey, "error", err)
			// Proceed to fetch from DB below
		} else {
			s.logger.Debug("Discount fetched from cache", "id", id)
			return &discount, nil
		}
	} else if !errors.Is(err, redis.Nil) {
		// Some other Redis error occurred
		s.logger.Error("Redis error fetching discount by ID", "key", cacheKey, "error", err)
		// Proceed to fetch from DB below
	}

	s.logger.Debug("Discount cache miss, fetching from database", "id", id)

	// Fetch from database using the existing query
	dbDiscount, err := s.querier.GetDiscountByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("discount not found")
		}
		return nil, fmt.Errorf("failed to fetch discount from database: %w", err)
	}

	// Map the database discount to the application model
	discount := s.mapDbDiscountToModel(dbDiscount)

	// --- Store the result in cache ---
	discountJSON, err := json.Marshal(discount)
	if err != nil {
		s.logger.Error("Failed to marshal discount for caching", "id", id, "error", err)
		// Still return the discount fetched from the DB
	} else {
		// Cache for 1 hour (adjust TTL as needed)
		if err := s.cache.Set(ctx, cacheKey, discountJSON, DiscountCacheTTL).Err(); err != nil {
			s.logger.Error("Failed to cache discount", "key", cacheKey, "error", err)
		} else {
			s.logger.Debug("Discount cached", "id", id, "key", cacheKey)
		}
	}

	return discount, nil
}

// GetDiscountsByProductID retrieves active discounts applicable to a specific product.
func (s *DiscountService) GetDiscountsByProductID(ctx context.Context, productID uuid.UUID) ([]*models.Discount, error) {
	// Execute the query to get discounts for the product ID
	dbDiscounts, err := s.querier.GetDiscountsByProductID(ctx, productID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch discounts for product (ID: %s) from database: %w", productID, err)
	}

	result := make([]*models.Discount, len(dbDiscounts))
	for i, dbDisc := range dbDiscounts {
		result[i] = s.mapDbDiscountToModel(dbDisc)
	}

	return result, nil
}

// UpdateDiscount updates an existing discount rule.
// UpdateDiscount updates an existing discount rule and invalidates its cache.
func (s *DiscountService) UpdateDiscount(ctx context.Context, id uuid.UUID, req models.UpdateDiscountRequest) (*models.Discount, error) {
	// Fetch the existing discount to get its current values (including code) for potential cache invalidation
	existingDBDisc, err := s.querier.GetDiscountByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("discount not found")
		}
		return nil, fmt.Errorf("failed to fetch existing discount: %w", err)
	}

	// Prepare update parameters, using existing values if not provided in request
	code := CoalesceString(req.Code, existingDBDisc.Code)
	// ... (prepare other parameters like description, discountType, etc., as before) ...
	description := CoalesceStringPtr(req.Description, existingDBDisc.Description)
	discountTypeStr := CoalesceString((*string)(req.DiscountType), existingDBDisc.DiscountType)
	discountValue := CoalesceInt64(req.DiscountValue, existingDBDisc.DiscountValue)
	minOrderValueCents := CoalesceInt64Ptr(req.MinOrderValueCents, existingDBDisc.MinOrderValueCents)
	maxUses := CoalesceInt32Ptr(Int32PtrFromIntPtr(req.MaxUses), existingDBDisc.MaxUses)
	validFrom := CoalesceTime(req.ValidFrom, existingDBDisc.ValidFrom.Time)
	validUntil := CoalesceTime(req.ValidUntil, existingDBDisc.ValidUntil.Time)
	isActive := CoalesceBool(req.IsActive, existingDBDisc.IsActive)

	// Validate DiscountValue based on DiscountType if it's being updated
	currentType := models.DiscountType(discountTypeStr)
	if req.DiscountType != nil || req.DiscountValue != nil {
		newValue := discountValue
		if req.DiscountType != nil {
			currentType = *req.DiscountType
		}
		if currentType == models.DiscountTypePercentage && newValue > 100 {
			return nil, errors.New("percentage discount value cannot exceed 100")
		}
	}

	// Check if the new code (if being updated) already exists for a *different* discount
	if req.Code != nil && *req.Code != existingDBDisc.Code {
		_, err := s.querier.GetDiscountByCode(ctx, *req.Code)
		if err == nil {
			return nil, fmt.Errorf("discount with code '%s' already exists", *req.Code)
		}
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("failed to check for existing discount code: %w", err)
		}
		// If err is pgx.ErrNoRows, it means the new code is unique, proceed.
	}

	// Prepare the query parameters
	params := db.UpdateDiscountParams{
		ID:                 id,
		Code:               code,
		Description:        description,
		DiscountType:       discountTypeStr,
		DiscountValue:      discountValue,
		MinOrderValueCents: minOrderValueCents,
		MaxUses:            maxUses,
		ValidFrom:          ToPgTimestamptz(validFrom),
		ValidUntil:         ToPgTimestamptz(validUntil),
		IsActive:           isActive,
	}

	// Execute the update query
	updatedDBDisc, err := s.querier.UpdateDiscount(ctx, params)
	if err != nil {
		if IsUniqueViolation(err, "discounts_code_key") {
			return nil, fmt.Errorf("discount with code '%s' already exists", params.Code)
		}
		return nil, fmt.Errorf("failed to update discount in database: %w", err)
	}

	// Map the updated database discount to the application model
	updatedDiscount := s.mapDbDiscountToModel(updatedDBDisc)

	// --- Invalidate Cache Entries ---
	// Invalidate the entry for the discount ID
	cacheKeyByID := fmt.Sprintf(CacheKeyDiscountByID, id.String())
	if err := s.cache.Del(ctx, cacheKeyByID).Err(); err != nil {
		s.logger.Error("Failed to invalidate discount cache by ID", "key", cacheKeyByID, "error", err)
	} else {
		s.logger.Debug("Discount cache invalidated by ID", "id", id, "key", cacheKeyByID)
	}

	// Invalidate the entry for the OLD code if it changed
	oldCode := existingDBDisc.Code
	newCode := updatedDiscount.Code
	if oldCode != newCode {
		cacheKeyByOldCode := fmt.Sprintf(CacheKeyDiscountByCode, oldCode)
		if err := s.cache.Del(ctx, cacheKeyByOldCode).Err(); err != nil {
			s.logger.Error("Failed to invalidate discount cache by old code", "code", oldCode, "key", cacheKeyByOldCode, "error", err)
		} else {
			s.logger.Debug("Discount cache invalidated by old code", "code", oldCode, "key", cacheKeyByOldCode)
		}
	}

	// Always invalidate the entry for the NEW code (in case it's used elsewhere or if code didn't change)
	cacheKeyByNewCode := fmt.Sprintf(CacheKeyDiscountByCode, newCode)
	if err := s.cache.Del(ctx, cacheKeyByNewCode).Err(); err != nil {
		s.logger.Error("Failed to invalidate discount cache by new code", "code", newCode, "key", cacheKeyByNewCode, "error", err)
	} else {
		s.logger.Debug("Discount cache invalidated by new code", "code", newCode, "key", cacheKeyByNewCode)
	}
	// ---

	s.logger.Info("Discount updated successfully", "discount_id", updatedDiscount.ID, "code", updatedDiscount.Code)
	return updatedDiscount, nil
}

// DeleteDiscount deletes a discount by its ID and invalidates its cache.
func (s *DiscountService) DeleteDiscount(ctx context.Context, id uuid.UUID) error {
	// Fetch the discount first to get its code for cache invalidation
	dbDiscount, err := s.querier.GetDiscountByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("discount not found")
		}
		return fmt.Errorf("failed to fetch discount for cache invalidation: %w", err)
	}

	// Execute the delete query
	err = s.querier.DeleteDiscount(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete discount from database: %w", err)
	}

	// --- Invalidate Cache Entries ---
	// Invalidate the entry for the discount ID
	cacheKeyByID := fmt.Sprintf(CacheKeyDiscountByID, id.String())
	if err := s.cache.Del(ctx, cacheKeyByID).Err(); err != nil {
		s.logger.Error("Failed to invalidate discount cache by ID on delete", "key", cacheKeyByID, "error", err)
	} else {
		s.logger.Debug("Discount cache invalidated by ID on delete", "id", id, "key", cacheKeyByID)
	}

	// Invalidate the entry for the discount code
	cacheKeyByCode := fmt.Sprintf(CacheKeyDiscountByCode, dbDiscount.Code)
	if err := s.cache.Del(ctx, cacheKeyByCode).Err(); err != nil {
		s.logger.Error("Failed to invalidate discount cache by code on delete", "code", dbDiscount.Code, "key", cacheKeyByCode, "error", err)
	} else {
		s.logger.Debug("Discount cache invalidated by code on delete", "code", dbDiscount.Code, "key", cacheKeyByCode)
	}
	// ---

	s.logger.Info("Discount deleted successfully", "discount_id", id, "code", dbDiscount.Code)
	return nil
}

// GetDiscountByCode retrieves a discount by its unique code, utilizing caching.
// You would add similar logic here as GetDiscount, but with CacheKeyDiscountByCode.
// This is a placeholder for the concept.
func (s *DiscountService) GetDiscountByCode(ctx context.Context, code string) (*models.Discount, error) {
	cacheKey := fmt.Sprintf(CacheKeyDiscountByCode, code)

	// --- Try to get from cache first ---
	cachedData, err := s.cache.Get(ctx, cacheKey).Result()
	if err == nil {
		// Cache hit - deserialize and return
		var discount models.Discount
		if err := json.Unmarshal([]byte(cachedData), &discount); err != nil {
			s.logger.Error("Failed to unmarshal cached discount by code", "key", cacheKey, "error", err)
			// Proceed to fetch from DB below
		} else {
			s.logger.Debug("Discount fetched from cache by code", "code", code)
			return &discount, nil
		}
	} else if !errors.Is(err, redis.Nil) {
		// Some other Redis error occurred
		s.logger.Error("Redis error fetching discount by code", "key", cacheKey, "error", err)
		// Proceed to fetch from DB below
	}

	s.logger.Debug("Discount by code cache miss, fetching from database", "code", code)

	// Fetch from database using the existing query
	dbDiscount, err := s.querier.GetDiscountByCode(ctx, code)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("discount not found")
		}
		return nil, fmt.Errorf("failed to fetch discount from database: %w", err)
	}

	// Map the database discount to the application model
	discount := s.mapDbDiscountToModel(dbDiscount)

	// --- Store the result in cache ---
	discountJSON, err := json.Marshal(discount)
	if err != nil {
		s.logger.Error("Failed to marshal discount for caching by code", "code", code, "error", err)
		// Still return the discount fetched from the DB
	} else {
		// Cache for 1 hour (adjust TTL as needed)
		if err := s.cache.Set(ctx, cacheKey, discountJSON, DiscountCacheTTL).Err(); err != nil {
			s.logger.Error("Failed to cache discount by code", "key", cacheKey, "error", err)
		} else {
			s.logger.Debug("Discount cached by code", "code", code, "key", cacheKey)
		}
	}

	return discount, nil
}

// ListDiscounts retrieves a paginated list of discounts based on filters.
func (s *DiscountService) ListDiscounts(ctx context.Context, req models.ListDiscountsRequest) (*models.DiscountListResponse, error) {
	page := req.Page
	if page == 0 {
		page = 1
	}
	limit := req.Limit
	if limit == 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100 // Enforce a maximum limit
	}
	offset := (page - 1) * limit

	// Prepare query parameters for ListDiscounts
	// Use the generated db.ListDiscountsParams which includes IsActive, FromDate, UntilDate, PageOffset, PageLimit
	listParams := db.ListDiscountsParams{
		IsActive:   req.IsActive != nil && *req.IsActive, // Convert *bool to bool for sqlc arg (default false if nil)
		FromDate:   pgtype.Timestamptz{},                 // Initialize pgtype struct
		UntilDate:  pgtype.Timestamptz{},                 // Initialize pgtype struct
		PageOffset: int32(offset),
		PageLimit:  int32(limit),
	}

	// Set FromDate and UntilDate if provided in the request
	if req.ValidFrom != nil {
		listParams.FromDate = ToPgTimestamptz(*req.ValidFrom)
		// Note: The generated ListDiscountsParams struct likely uses pgtype.Timestamptz directly.
		// The ToPgTimestamptz helper ensures Valid=true.
	}
	if req.ValidUntil != nil {
		listParams.UntilDate = ToPgTimestamptz(*req.ValidUntil)
	}

	dbDiscounts, err := s.querier.ListDiscounts(ctx, listParams)
	if err != nil {
		return nil, fmt.Errorf("failed to list discounts from database: %w", err)
	}

	// Map database results to application models
	result := make([]models.Discount, len(dbDiscounts))
	for i, dbDisc := range dbDiscounts {
		result[i] = *s.mapDbDiscountToModel(dbDisc)
	}

	// Get total count for pagination using the new CountDiscounts query
	// Prepare parameters for CountDiscounts, matching the filters used in ListDiscounts
	countParams := db.CountDiscountsParams{
		IsActive:  req.IsActive != nil && *req.IsActive, // Use the same IsActive filter
		FromDate:  pgtype.Timestamptz{},                 // Initialize pgtype struct
		UntilDate: pgtype.Timestamptz{},                 // Initialize pgtype struct
	}

	// Set FromDate and UntilDate for the count query if provided in the request
	if req.ValidFrom != nil {
		countParams.FromDate = ToPgTimestamptz(*req.ValidFrom)
	}
	if req.ValidUntil != nil {
		countParams.UntilDate = ToPgTimestamptz(*req.ValidUntil)
	}

	total, err := s.querier.CountDiscounts(ctx, countParams)
	if err != nil {
		return nil, fmt.Errorf("failed to count discounts for pagination: %w", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	response := &models.DiscountListResponse{
		Data:       result,
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}

	return response, nil
}

// getCountForList is a helper to get the total count matching ListDiscounts filters.
// This now uses the CountDiscounts query and handles date filters.
func (s *DiscountService) getCountForList(ctx context.Context, req models.ListDiscountsRequest) (int64, error) {
	// Prepare parameters for CountDiscounts, matching the filters used in ListDiscounts
	countParams := db.CountDiscountsParams{
		IsActive:  req.IsActive != nil && *req.IsActive, // Use the same IsActive filter
		FromDate:  pgtype.Timestamptz{},                 // Initialize pgtype struct
		UntilDate: pgtype.Timestamptz{},                 // Initialize pgtype struct
	}

	// Set FromDate and UntilDate for the count query if provided in the request
	if req.ValidFrom != nil {
		countParams.FromDate = ToPgTimestamptz(*req.ValidFrom)
	}
	if req.ValidUntil != nil {
		countParams.UntilDate = ToPgTimestamptz(*req.ValidUntil)
	}

	count, err := s.querier.CountDiscounts(ctx, countParams)
	if err != nil {
		return 0, fmt.Errorf("failed to count discounts: %w", err)
	}
	return count, nil
}

// LinkDiscountToProduct associates a discount with a specific product.
func (s *DiscountService) LinkDiscountToProduct(ctx context.Context, discountID, productID uuid.UUID) error {
	// Validate that the discount exists
	_, err := s.querier.GetDiscountByID(ctx, discountID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("discount not found")
		}
		return fmt.Errorf("failed to verify discount: %w", err)
	}

	// Execute the link query
	err = s.querier.LinkProductToDiscount(ctx, db.LinkProductToDiscountParams{
		ProductID:  productID,
		DiscountID: discountID,
	})
	if err != nil {
		// Check for unique violation if linking fails due to existing link
		if IsUniqueViolation(err, "product_discounts_product_id_discount_id_key") {
			return fmt.Errorf("discount %s is already linked to product %s", discountID, productID)
		}
		return fmt.Errorf("failed to link discount to product: %w", err)
	}

	// --- Invalidate Product Cache ---
	// The product's discount status has changed, so its cache entry is stale.
	productCacheKeyByID := fmt.Sprintf(CacheKeyProductByID, productID.String())
	if err := s.cache.Del(ctx, productCacheKeyByID).Err(); err != nil {
		s.logger.Error("Failed to invalidate product cache by ID after linking discount", "product_id", productID, "discount_id", discountID, "key", productCacheKeyByID, "error", err)
		// Depending on your tolerance for stale data, you might choose to return the error here
		// or just log it and proceed. For now, let's just log.
	} else {
		s.logger.Debug("Product cache invalidated by ID after linking discount", "product_id", productID, "discount_id", discountID, "key", productCacheKeyByID)
	}

	s.logger.Info("Discount linked to product", "discount_id", discountID, "product_id", productID)
	return nil
}

// UnlinkDiscountFromProduct removes the association between a discount and a specific product.
func (s *DiscountService) UnlinkDiscountFromProduct(ctx context.Context, discountID, productID uuid.UUID) error {
	// Execute the unlink query
	err := s.querier.UnlinkProductFromDiscount(ctx, db.UnlinkProductFromDiscountParams{
		ProductID:  productID,
		DiscountID: discountID,
	})
	if err != nil {
		return fmt.Errorf("failed to unlink discount from product: %w", err)
	}

	// --- Invalidate Product Cache ---
	// The product's discount status has changed, so its cache entry is stale.
	productCacheKeyByID := fmt.Sprintf(CacheKeyProductByID, productID.String())
	if err := s.cache.Del(ctx, productCacheKeyByID).Err(); err != nil {
		s.logger.Error("Failed to invalidate product cache by ID after unlinking discount", "product_id", productID, "discount_id", discountID, "key", productCacheKeyByID, "error", err)
		// Log only, don't fail the unlink operation itself.
	} else {
		s.logger.Debug("Product cache invalidated by ID after unlinking discount", "product_id", productID, "discount_id", discountID, "key", productCacheKeyByID)
	}
	s.logger.Info("Discount unlinked from product", "discount_id", discountID, "product_id", productID)
	return nil
}

// LinkDiscountToCategory associates a discount with a specific category.
func (s *DiscountService) LinkDiscountToCategory(ctx context.Context, discountID, categoryID uuid.UUID) error {
	// Validate that the discount exists
	_, err := s.querier.GetDiscountByID(ctx, discountID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("discount not found")
		}
		return fmt.Errorf("failed to verify discount: %w", err)
	}

	// Validate that the category exists (you'd need a category query/service method)
	// Example: _, err = s.categoryService.GetCategory(ctx, categoryID)
	// if err != nil { return fmt.Errorf("failed to verify category: %w", err) }

	// Execute the link query
	err = s.querier.LinkCategoryToDiscount(ctx, db.LinkCategoryToDiscountParams{
		CategoryID: categoryID,
		DiscountID: discountID,
	})
	if err != nil {
		// Check for unique violation if linking fails due to existing link
		if IsUniqueViolation(err, "category_discounts_category_id_discount_id_key") {
			return fmt.Errorf("discount %s is already linked to category %s", discountID, categoryID)
		}
		return fmt.Errorf("failed to link discount to category: %w", err)
	}

	s.logger.Info("Discount linked to category", "discount_id", discountID, "category_id", categoryID)
	return nil
}

// UnlinkDiscountFromCategory removes the association between a discount and a specific category.
func (s *DiscountService) UnlinkDiscountFromCategory(ctx context.Context, discountID, categoryID uuid.UUID) error {
	// Execute the unlink query
	err := s.querier.UnlinkCategoryFromDiscount(ctx, db.UnlinkCategoryFromDiscountParams{
		CategoryID: categoryID,
		DiscountID: discountID,
	})
	if err != nil {
		return fmt.Errorf("failed to unlink discount from category: %w", err)
	}

	s.logger.Info("Discount unlinked from category", "discount_id", discountID, "category_id", categoryID)
	return nil
}

// --- Helper Functions ---

// mapDbDiscountToModel converts the generated db.Discount to the service-level models.Discount.
func (s *DiscountService) mapDbDiscountToModel(dbDisc db.Discount) *models.Discount {
	modelDisc := &models.Discount{
		ID:                 dbDisc.ID,
		Code:               dbDisc.Code,
		DiscountType:       models.DiscountType(dbDisc.DiscountType),
		DiscountValue:      dbDisc.DiscountValue,
		MinOrderValueCents: *dbDisc.MinOrderValueCents, // Assumes it's not null based on DB schema default
		CurrentUses:        int(*dbDisc.CurrentUses),   // Assumes it's not null based on DB schema default
		ValidFrom:          dbDisc.ValidFrom.Time,
		ValidUntil:         dbDisc.ValidUntil.Time,
		IsActive:           dbDisc.IsActive,
		CreatedAt:          dbDisc.CreatedAt.Time,
		UpdatedAt:          dbDisc.UpdatedAt.Time,
	}

	// Handle nullable fields
	if dbDisc.Description != nil {
		modelDisc.Description = dbDisc.Description
	}
	if dbDisc.MaxUses != nil {
		maxUses := int(*dbDisc.MaxUses)
		modelDisc.MaxUses = &maxUses
	}

	return modelDisc
}

// ToPgTimestamptz converts time.Time to pgtype.Timestamptz with Valid=true.
func ToPgTimestamptz(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t, Valid: true}
}

// Int32PtrFromIntPtr converts *int to *int32.
func Int32PtrFromIntPtr(i *int) *int32 {
	if i == nil {
		return nil
	}
	val := int32(*i)
	return &val
}

// Coalesce functions to pick the first non-nil value or a default
func CoalesceString(a *string, b string) string {
	if a != nil {
		return *a
	}
	return b
}

func CoalesceStringPtr(a *string, b *string) *string {
	if a != nil {
		return a
	}
	return b
}

func CoalesceInt64(a *int64, b int64) int64 {
	if a != nil {
		return *a
	}
	return b
}

func CoalesceInt64Ptr(a *int64, b *int64) *int64 {
	if a != nil {
		return a
	}
	return b
}

func CoalesceInt32Ptr(a *int32, b *int32) *int32 {
	if a != nil {
		return a
	}
	return b
}

func CoalesceTime(a *time.Time, b time.Time) time.Time {
	if a != nil {
		return *a
	}
	return b
}

func CoalesceBool(a *bool, b bool) bool {
	if a != nil {
		return *a
	}
	return b
}

// IsUniqueViolation checks if the error is a PostgreSQL unique_violation (error code 23505).
// You might have a utility function for this already.
func IsUniqueViolation(err error, constraintName string) bool {
	return false // Placeholder - implement with pgconn
}
