// internal/services/review_service.go

package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/MihoZaki/DzTech/internal/db"
	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn" // Import pgconn for error handling
	"github.com/jackc/pgx/v5/pgxpool"
)

// ReviewService handles business logic for reviews.
type ReviewService struct {
	querier db.Querier
	pool    *pgxpool.Pool // Need for transactions
	logger  *slog.Logger
}

func NewReviewService(querier db.Querier, pool *pgxpool.Pool, logger *slog.Logger) *ReviewService {
	return &ReviewService{
		querier: querier,
		pool:    pool,
		logger:  logger,
	}
}

// CreateReview creates a new review for a product by a user and updates product stats.
func (s *ReviewService) CreateReview(ctx context.Context, userID uuid.UUID, req models.CreateReviewRequest) (*models.Review, error) {
	queries, ok := s.querier.(*db.Queries)
	if !ok {
		return nil, errors.New("querier type assertion to *db.Queries failed, cannot create transactional querier")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction for review creation: %w", err)
	}
	defer func() {
		if err := tx.Rollback(ctx); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
			s.logger.Error("Error during review creation transaction rollback", "error", err)
		}
	}()

	txQuerier := queries.WithTx(tx)

	dbReview, err := txQuerier.CreateReview(ctx, db.CreateReviewParams{
		UserID:    userID,
		ProductID: req.ProductID,
		Rating:    int32(req.Rating), // Convert API int (1-5) to DB int32
	})
	if err != nil {

		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			if pgErr.Code == "23505" { // PostgreSQL unique violation error code
				return nil, fmt.Errorf("user has already reviewed this product")
			}
		}

		return nil, fmt.Errorf("failed to create review in transaction: %w", err)
	}

	// This happens within the same transaction to ensure consistency
	err = s.updateProductReviewStats(ctx, txQuerier, req.ProductID)
	if err != nil {
		return nil, fmt.Errorf("failed to update product review stats in transaction: %w", err)
	}

	// Step 7: Commit the transaction if both steps (create review, update stats) succeeded
	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit review creation transaction: %w", err)
	}

	// Step 8: Convert the database review model to the API review model
	apiReview := &models.Review{
		ID:        dbReview.ID,
		UserID:    dbReview.UserID,
		ProductID: dbReview.ProductID,
		Rating:    int(dbReview.Rating), // Convert DB int32 back to API int
		CreatedAt: dbReview.CreatedAt.Time,
		UpdatedAt: dbReview.UpdatedAt.Time,
	}

	// Step 9: Return the created review
	return apiReview, nil
}

func (s *ReviewService) updateProductReviewStats(ctx context.Context, querier db.Querier, productID uuid.UUID) error {
	stats, err := querier.CalculateReviewStatsForProduct(ctx, productID)
	if err != nil {
		return fmt.Errorf("failed to calculate review stats for product %s: %w", productID, err)
	}

	// The CalculateReviewStatsForProductRow fields are:
	// - AvgRating pgtype.Numeric (can be NULL if no reviews)
	// - NumRatings int32 (will be 0 if no reviews)
	//
	// The UpdateProductReviewStatsParams fields are
	// - AvgRating pgtype.Numeric (matches)
	// - NumRatings *int32 (mismatch if products.num_ratings is NOT NULL, but COUNT always returns int32)
	// - ProductID uuid.UUID (matches)

	updateParams := db.UpdateProductReviewStatsParams{
		AvgRating:  stats.AvgRating,
		NumRatings: &stats.NumRatings,
		ProductID:  productID,
	}

	err = querier.UpdateProductReviewStats(ctx, updateParams)
	if err != nil {
		return fmt.Errorf("failed to update review stats in products table for product %s: %w", productID, err)
	}

	s.logger.Debug("Updated review stats for product",
		"product_id", productID,
		"new_avg_rating", stats.AvgRating, // Only print value if Valid
		"new_avg_rating_valid", stats.AvgRating.Valid,
		"new_num_ratings", stats.NumRatings)

	return nil
}

// UpdateReview updates an existing review by the user and recalculates product stats.
func (s *ReviewService) UpdateReview(ctx context.Context, reviewID uuid.UUID, userID uuid.UUID, req models.UpdateReviewRequest) (*models.Review, error) {
	queries, ok := s.querier.(*db.Queries)
	if !ok {
		return nil, errors.New("querier type assertion to *db.Queries failed, cannot create transactional querier")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction for review update: %w", err)
	}
	defer func() {
		if err := tx.Rollback(ctx); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
			s.logger.Error("Error during review update transaction rollback", "error", err)
		}
	}()

	txQuerier := queries.WithTx(tx)

	fetchedReview, err := txQuerier.GetReviewByIDAndUser(ctx, db.GetReviewByIDAndUserParams{
		ID:     reviewID,
		UserID: userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("review not found or does not belong to user")
		}
		return nil, fmt.Errorf("failed to fetch review for update: %w", err)
	}

	dbReview, err := txQuerier.UpdateReview(ctx, db.UpdateReviewParams{
		Rating: int32(req.Rating), // Convert API int (1-5) to DB int32
		ID:     reviewID,          // Use the review ID from the path
		UserID: userID,            // Verify ownership again in the query
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update review in transaction: %w", err)
	}

	err = s.updateProductReviewStats(ctx, txQuerier, fetchedReview.ProductID) // Use ProductID from fetched review
	if err != nil {
		return nil, fmt.Errorf("failed to update product review stats in transaction: %w", err)
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit review update transaction: %w", err)
	}
	apiReview := &models.Review{
		ID:        dbReview.ID,
		UserID:    dbReview.UserID,
		ProductID: dbReview.ProductID,
		Rating:    int(dbReview.Rating), // Convert DB int32 back to API int
		CreatedAt: dbReview.CreatedAt.Time,
		UpdatedAt: dbReview.UpdatedAt.Time,
	}

	return apiReview, nil
}

// DeleteReview deletes an existing review by the user and recalculates product stats.
func (s *ReviewService) DeleteReview(ctx context.Context, reviewID uuid.UUID, userID uuid.UUID) error {

	queries, ok := s.querier.(*db.Queries)
	if !ok {
		return errors.New("querier type assertion to *db.Queries failed, cannot create transactional querier")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction for review deletion: %w", err)
	}

	defer func() {
		if err := tx.Rollback(ctx); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
			s.logger.Error("Error during review deletion transaction rollback", "error", err)
		}
	}()

	txQuerier := queries.WithTx(tx)

	reviewToDelete, err := txQuerier.GetReviewByIDAndUser(ctx, db.GetReviewByIDAndUserParams{
		ID:     reviewID,
		UserID: userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {

			return fmt.Errorf("review not found or does not belong to user")
		}

		return fmt.Errorf("failed to fetch review for deletion: %w", err)
	}

	_, err = txQuerier.DeleteReview(ctx, db.DeleteReviewParams{
		ID:     reviewID,
		UserID: userID,
	})
	if err != nil {
		return fmt.Errorf("failed to delete review in transaction: %w", err)
	}

	err = s.updateProductReviewStats(ctx, txQuerier, reviewToDelete.ProductID)
	if err != nil {
		return fmt.Errorf("failed to update product review stats in transaction: %w", err)
	}

	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit review deletion transaction: %w", err)
	}

	return nil
}

// GetReviewsByProductID fetches reviews for a specific product.
func (s *ReviewService) GetReviewsByProductID(ctx context.Context, productID uuid.UUID, page, limit int) (*models.GetReviewsByProductResponse, error) {
	if limit <= 0 {
		limit = 20 // Default limit
	}
	if page <= 0 {
		page = 1 // Default page
	}
	offset := (page - 1) * limit

	dbReviews, err := s.querier.GetReviewsByProductID(ctx, db.GetReviewsByProductIDParams{
		ProductID:  productID,
		PageOffset: int32(offset),
		PageLimit:  int32(limit),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch reviews for product: %w", err)
	}

	reviewListItems := make([]models.ReviewListItem, len(dbReviews))
	for i, r := range dbReviews {
		reviewListItems[i] = models.ReviewListItem{
			ID:           r.ID,
			UserID:       r.UserID,       // Include if needed, or omit
			ReviewerName: r.ReviewerName, // Map the new field
			ProductID:    r.ProductID,    // This will be the same as the input productID
			Rating:       int(r.Rating),  // Cast DB int32 back to API int
			CreatedAt:    r.CreatedAt.Time,
			UpdatedAt:    r.UpdatedAt.Time,
		}
	}

	return &models.GetReviewsByProductResponse{
		Reviews: reviewListItems,
		Page:    page,
		Limit:   limit,
	}, nil
}

// GetReviewsByUserID fetches reviews submitted by a specific user.
// This method does not update product stats, just reads reviews.
func (s *ReviewService) GetReviewsByUserID(ctx context.Context, userID uuid.UUID, page, limit int) (*models.GetReviewsByUserResponse, error) {
	if limit <= 0 {
		limit = 20 // Default limit
	}
	if page <= 0 {
		page = 1 // Default page
	}
	offset := (page - 1) * limit

	dbReviews, err := s.querier.GetReviewsByUserID(ctx, db.GetReviewsByUserIDParams{
		UserID:     userID,
		PageOffset: int32(offset),
		PageLimit:  int32(limit),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch reviews by user: %w", err)
	}

	reviewByUserListItems := make([]models.ReviewByUserListItem, len(dbReviews))
	for i, r := range dbReviews {
		reviewByUserListItems[i] = models.ReviewByUserListItem{
			ID:          r.ID,
			UserID:      r.UserID, // Include if needed, or omit
			ProductID:   r.ProductID,
			ProductName: r.ProductName, // Map the new field
			Rating:      int(r.Rating), // Cast DB int32 back to API int
			CreatedAt:   r.CreatedAt.Time,
			UpdatedAt:   r.UpdatedAt.Time,
		}
	}

	return &models.GetReviewsByUserResponse{
		Reviews: reviewByUserListItems,
		Page:    page,
		Limit:   limit,
	}, nil
}
