package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"math"

	"github.com/MihoZaki/DzTech/internal/db"
	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/MihoZaki/DzTech/internal/utils"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
)

// CategoryService handles business logic for categories.
type CategoryService struct {
	querier db.Querier
	cache   *redis.Client // Optional, if you want to cache categories later
	logger  *slog.Logger
}

// NewCategoryService creates a new instance of CategoryService.
func NewCategoryService(querier db.Querier, cache *redis.Client, logger *slog.Logger) *CategoryService {
	return &CategoryService{
		querier: querier,
		cache:   cache,
		logger:  logger,
	}
}

// CreateCategory creates a new category, generating a unique slug.
func (s *CategoryService) CreateCategory(ctx context.Context, req models.CreateCategoryRequest) (*models.Category, error) {

	// --- Generate Slug ---
	baseSlug := utils.GenerateSlug(req.Name)
	finalSlug := s.ensureUniqueSlug(ctx, baseSlug)
	// ---

	// Prepare parameters for the query
	params := db.CreateCategoryParams{
		Name: req.Name,
		Slug: finalSlug, // Use the generated slug
		Type: req.Type,
	}

	// Execute the query to create the category
	dbCategory, err := s.querier.CreateCategory(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to create category in database: %w", err)
	}

	// Map the created database category to the application model
	createdCategory := s.toCategoryModel(dbCategory)

	s.logger.Info("Category created successfully", "category_id", createdCategory.ID, "name", createdCategory.Name, "slug", createdCategory.Slug)
	return createdCategory, nil
}

// GetCategory retrieves a category by its ID.
func (s *CategoryService) GetCategory(ctx context.Context, id uuid.UUID) (*models.Category, error) {
	dbCategory, err := s.querier.GetCategory(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("category not found")
		}
		return nil, fmt.Errorf("failed to fetch category: %w", err)
	}

	category := s.toCategoryModel(dbCategory)

	return category, nil
}

// GetCategoryBySlug retrieves a category by its slug.
func (s *CategoryService) GetCategoryBySlug(ctx context.Context, slug string) (*models.Category, error) {
	dbCategory, err := s.querier.GetCategoryBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("category not found")
		}
		return nil, fmt.Errorf("failed to fetch category: %w", err)
	}

	category := s.toCategoryModel(dbCategory)

	return category, nil
}

// ListCategories retrieves a paginated list of categories.
func (s *CategoryService) ListCategories(ctx context.Context, page, limit int) (*models.PaginatedResponse, error) {
	if page == 0 {
		page = 1
	}
	if limit == 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100 // Enforce a maximum limit
	}
	offset := (page - 1) * limit

	// Prepare query parameters
	params := db.ListCategoriesParams{
		Limit:  int32(limit),
		Offset: int32(offset),
	}

	dbCategories, err := s.querier.ListCategories(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to list categories from database: %w", err)
	}

	// Map database results to application models
	result := make([]*models.Category, len(dbCategories))
	for i, dbCat := range dbCategories {
		result[i] = s.toCategoryModel(dbCat)
	}

	// Get total count for pagination (you'll need a count query)
	total, err := s.getCountForList(ctx) // Placeholder function, implement count query
	if err != nil {
		return nil, fmt.Errorf("failed to count categories for pagination: %w", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	response := &models.PaginatedResponse{
		Data:       result,
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}

	return response, nil
}

// getCountForList is a helper to get the total count matching ListCategories filters.
func (s *CategoryService) getCountForList(ctx context.Context) (int64, error) {
	count, err := s.querier.CountCategories(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to count categories: %w", err)
	}
	return count, nil

}

// UpdateCategory updates an existing category, regenerating slug if name changes.
func (s *CategoryService) UpdateCategory(ctx context.Context, id uuid.UUID, req models.UpdateCategoryRequest) (*models.Category, error) {
	// Fetch the existing category to validate and get current values (including current slug)
	existingDBCat, err := s.querier.GetCategory(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("category not found")
		}
		return nil, fmt.Errorf("failed to fetch existing category: %w", err)
	}

	// Prepare update parameters, using existing values if not provided in request
	name := CoalesceString(req.Name, existingDBCat.Name)
	categoryType := CoalesceString(req.Type, existingDBCat.Type)

	// --- Handle Slug Regeneration if Name Changes ---
	slug := existingDBCat.Slug                              // Default to existing slug
	if req.Name != nil && *req.Name != existingDBCat.Name { // Check if name actually changed
		newBaseSlug := utils.GenerateSlug(*req.Name)
		newFinalSlug := s.ensureUniqueSlug(ctx, newBaseSlug) // Use the helper again
		slug = newFinalSlug                                  // Update the slug in params
	}
	// ---

	// Prepare the query parameters
	params := db.UpdateCategoryParams{
		ID:   id, // The ID of the category to update
		Name: name,
		Slug: slug, // Use the potentially new slug or the old one
		Type: categoryType,
	}

	// Execute the update query
	updatedDBCat, err := s.querier.UpdateCategory(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to update category in database: %w", err)
	}

	// Map the updated database category to the application model
	updatedCategory := s.toCategoryModel(updatedDBCat)

	s.logger.Info("Category updated successfully", "category_id", updatedCategory.ID, "name", updatedCategory.Name, "slug", updatedCategory.Slug)
	return updatedCategory, nil
}

// DeleteCategory soft-deletes a category by its ID.
func (s *CategoryService) DeleteCategory(ctx context.Context, id uuid.UUID) error {
	// Execute the delete query (soft delete)
	err := s.querier.DeleteCategory(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete category from database: %w", err)
	}

	s.logger.Info("Category soft-deleted successfully", "category_id", id)
	return nil
}

// --- Helper Functions ---

// Add the Category model conversion function
func (s *CategoryService) toCategoryModel(dbCategory db.Category) *models.Category {
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

func CoalesceUUIDPtr(a *uuid.UUID, b uuid.UUID) uuid.UUID {
	if a != nil {
		return *a
	}
	return b
}

// ensureUniqueSlug generates a unique slug based on the base slug.
// It checks the database and appends a suffix if necessary.
func (s *CategoryService) ensureUniqueSlug(ctx context.Context, baseSlug string) string {
	slugToTry := baseSlug
	counter := 0

	for {
		// Check if the slug already exists for categories
		exists, err := s.checkSlugExists(ctx, slugToTry)
		if err != nil {
			s.logger.Error("Error checking slug existence for category", "slug", slugToTry, "error", err)
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

// checkSlugExists checks if a slug already exists for a category (excluding the current one if updating).
func (s *CategoryService) checkSlugExists(ctx context.Context, slug string) (bool, error) {
	// Assumes CheckCategorySlugExists is generated in db.Querier
	exists, err := s.querier.CheckCategorySlugExists(ctx, slug)
	if err != nil {
		return false, err
	}
	return exists, nil
}
