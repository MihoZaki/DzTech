package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/MihoZaki/DzTech/internal/db"
	"github.com/MihoZaki/DzTech/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// AdminUserService handles business logic for admin user management operations.
type AdminUserService struct {
	querier db.Querier
	logger  *slog.Logger
}

// NewAdminUserService creates a new instance of AdminUserService.
func NewAdminUserService(querier db.Querier, logger *slog.Logger) *AdminUserService {
	return &AdminUserService{
		querier: querier,
		logger:  logger,
	}
}

// ListUsers retrieves a list of users, optionally filtered by active status and paginated.
func (s *AdminUserService) ListUsers(ctx context.Context, activeOnly bool, limit, offset int) ([]models.AdminUserListItem, error) {
	if limit <= 0 {
		limit = 20 // Default limit
	}
	if offset < 0 {
		offset = 0 // Default offset
	}

	params := db.ListUsersWithListDetailsParams{ // Use the new query's params struct
		ActiveOnly: activeOnly,
		PageOffset: int32(offset),
		PageLimit:  int32(limit),
	}

	dbUsers, err := s.querier.ListUsersWithListDetails(ctx, params) // Use the new query method
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}

	apiUsers := make([]models.AdminUserListItem, len(dbUsers))
	for i, dbUser := range dbUsers {
		apiUsers[i] = s.toAdminUserListItemModelFromListRow(dbUser) // Use the new helper
	}

	return apiUsers, nil
}

// GetUser retrieves a specific user's details for admin view.
func (s *AdminUserService) GetUser(ctx context.Context, id uuid.UUID) (*models.AdminUserListItem, error) {
	dbUser, err := s.querier.GetUserWithDetails(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to fetch user details: %w", err)
	}

	apiUser := s.toAdminUserListItemModel(dbUser)
	return apiUser, nil
}

// toAdminUserListItemModel converts a DB row (from GetUserWithDetails) to the API list item model.
// Handles the interface{} type for LastOrderDate.
func (s *AdminUserService) toAdminUserListItemModel(dbUser db.GetUserWithDetailsRow) *models.AdminUserListItem {
	// Determine activity status
	activityStatus := "Active"
	if dbUser.DeletedAt.Valid {
		activityStatus = "Inactive"
	}

	// Determine name (use full name if available, fall back to email prefix)
	name := dbUser.Email // Default to email
	if dbUser.FullName != nil && *dbUser.FullName != "" {
		name = *dbUser.FullName
	}

	lastOrderDate := s.interfaceToTimePtr(dbUser.LastOrderDate)

	return &models.AdminUserListItem{
		ID:               dbUser.ID,
		Name:             name,
		Email:            dbUser.Email,
		RegistrationDate: dbUser.RegistrationDate.Time, // Use the alias from the query
		LastOrderDate:    lastOrderDate,
		OrderCount:       dbUser.TotalOrderCount,
		ActivityStatus:   activityStatus,
	}
}

// toAdminUserListItemModelFromListRow converts a DB row (from ListUsersWithListDetailsRow) to the API list item model.
// Handles the interface{} type for LastOrderDate.
func (s *AdminUserService) toAdminUserListItemModelFromListRow(dbUser db.ListUsersWithListDetailsRow) models.AdminUserListItem {
	// Determine activity status based on deleted_at (pgtype.Timestamptz)
	activityStatus := s.getActivityStatus(dbUser.DeletedAt)

	// Determine name (use full name if available, fall back to email)
	name := dbUser.Email
	if dbUser.FullName != nil && *dbUser.FullName != "" {
		name = *dbUser.FullName
	}

	// Convert last order date from interface{} to *time.Time
	lastOrderDate := s.interfaceToTimePtr(dbUser.LastOrderDate)

	// Convert registration date (pgtype.Timestamptz) to time.Time
	registrationDate := dbUser.RegistrationDate.Time

	return models.AdminUserListItem{
		ID:               dbUser.ID,
		Name:             name,
		Email:            dbUser.Email,
		RegistrationDate: registrationDate,
		LastOrderDate:    lastOrderDate,
		OrderCount:       dbUser.TotalOrderCount,
		ActivityStatus:   activityStatus,
	}
}

// Helper function to convert interface{} (from SQLC MAX/MIN potentially returning NULL as interface{}) to *time.Time
func (s *AdminUserService) interfaceToTimePtr(v interface{}) *time.Time {
	if v != nil {
		if t, ok := v.(time.Time); ok {
			return &t
		}
		// Log if the type assertion fails
		s.logger.Warn("Failed to assert value to time.Time in interfaceToTimePtr", "value_type", fmt.Sprintf("%T", v))
	}
	return nil
}

// Helper function to determine activity status from pgtype.Timestamptz (deleted_at)
func (s *AdminUserService) getActivityStatus(deletedAt pgtype.Timestamptz) string {
	if deletedAt.Valid {
		return "Inactive"
	}
	return "Active"
}

// --- Error Definitions ---
var (
	ErrUserNotFound = errors.New("user not found")
)
