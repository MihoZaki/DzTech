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
	"github.com/jackc/pgx/v5/pgconn"
)

var ErrDeliveryServiceInUse = errors.New("delivery service cannot be deleted: it is currently in use by one or more orders")

// DeliveryServiceService handles business logic for delivery services.
type DeliveryServiceService struct {
	querier db.Querier
	logger  *slog.Logger
}

// NewDeliveryServiceService creates a new instance of DeliveryServiceService.
func NewDeliveryServiceService(querier db.Querier, logger *slog.Logger) *DeliveryServiceService {
	return &DeliveryServiceService{
		querier: querier,
		logger:  logger,
	}
}

// GetDeliveryServiceByID retrieves a delivery service by its ID, regardless of active status.
// Suitable for admin operations.
func (s *DeliveryServiceService) GetDeliveryServiceByID(ctx context.Context, id uuid.UUID) (*models.DeliveryService, error) {
	dbDeliveryService, err := s.querier.GetDeliveryServiceByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDeliveryServiceNotFound
		}
		return nil, fmt.Errorf("failed to fetch delivery service by ID: %w", err)
	}

	apiDeliveryService := s.toDeliveryServiceModel(dbDeliveryService)
	return &apiDeliveryService, nil
}

// GetActiveDeliveryServices retrieves all delivery services that are currently active.
// Suitable for user-facing contexts like checkout.
func (s *DeliveryServiceService) GetActiveDeliveryServices(ctx context.Context) ([]models.DeliveryService, error) {
	dbDeliveryServices, err := s.querier.GetActiveDeliveryServices(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch active delivery services: %w", err)
	}

	apiDeliveryServices := make([]models.DeliveryService, len(dbDeliveryServices))
	for i, dbDS := range dbDeliveryServices {
		apiDeliveryServices[i] = s.toDeliveryServiceModel(dbDS)
	}

	return apiDeliveryServices, nil
}

// ListAllDeliveryServices retrieves a list of delivery services, optionally filtered by active status.
// Suitable for admin operations.
func (s *DeliveryServiceService) ListAllDeliveryServices(ctx context.Context, activeOnly bool, limit, offset int) ([]models.DeliveryService, error) {
	if limit <= 0 {
		limit = 20 // Default limit
	}
	if offset < 0 {
		offset = 0 // Default offset
	}

	params := db.ListAllDeliveryServicesParams{
		ActiveFilter: activeOnly, // Pass the filter to the query
		PageLimit:    int32(limit),
		PageOffset:   int32(offset),
	}

	dbDeliveryServices, err := s.querier.ListAllDeliveryServices(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to list delivery services: %w", err)
	}

	apiDeliveryServices := make([]models.DeliveryService, len(dbDeliveryServices))
	for i, dbDS := range dbDeliveryServices {
		apiDeliveryServices[i] = s.toDeliveryServiceModel(dbDS)
	}

	return apiDeliveryServices, nil
}

// CreateDeliveryService creates a new delivery service.
func (s *DeliveryServiceService) CreateDeliveryService(ctx context.Context, req models.CreateDeliveryServiceRequest) (*models.DeliveryService, error) {
	var estimatedDays *int32
	if req.EstimatedDays != nil {
		converted := int32(*req.EstimatedDays)
		estimatedDays = &converted
	} else {
		estimatedDays = nil
	}
	params := db.CreateDeliveryServiceParams{
		Name:          req.Name,
		Description:   req.Description,
		BaseCostCents: req.BaseCostCents,
		EstimatedDays: estimatedDays,
		IsActive:      req.IsActive,
	}

	dbDeliveryService, err := s.querier.CreateDeliveryService(ctx, params)
	if err != nil {
		// Check for unique_violation on 'name' if needed for specific error handling
		return nil, fmt.Errorf("failed to create delivery service: %w", err)
	}

	apiDeliveryService := s.toDeliveryServiceModel(dbDeliveryService)
	return &apiDeliveryService, nil
}

// UpdateDeliveryService updates an existing delivery service.
func (s *DeliveryServiceService) UpdateDeliveryService(ctx context.Context, id uuid.UUID, req models.UpdateDeliveryServiceRequest) (*models.DeliveryService, error) {
	// First, check if the delivery service exists (regardless of active status)
	_, err := s.querier.GetDeliveryServiceByID(ctx, id) // Use the dedicated GetByID query
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDeliveryServiceNotFound
		}
		return nil, fmt.Errorf("failed to check existence of delivery service before update: %w", err)
	}

	var estimatedDays *int32
	if req.EstimatedDays != nil {
		converted := int32(*req.EstimatedDays)
		estimatedDays = &converted
	} else {
		estimatedDays = nil
	}

	params := db.UpdateDeliveryServiceParams{
		ID:            id,
		Name:          req.Name,
		Description:   req.Description,
		BaseCostCents: req.BaseCostCents,
		EstimatedDays: estimatedDays,
		IsActive:      req.IsActive,
	}

	dbDeliveryService, err := s.querier.UpdateDeliveryService(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to update delivery service: %w", err)
	}

	apiDeliveryService := s.toDeliveryServiceModel(dbDeliveryService)
	return &apiDeliveryService, nil
}

// DeleteDeliveryService deletes a delivery service (hard delete example).
// Consider soft deletion by updating is_active if required.
func (s *DeliveryServiceService) DeleteDeliveryService(ctx context.Context, id uuid.UUID) error {
	// First, check if the delivery service exists (regardless of active status)
	_, err := s.querier.GetDeliveryServiceByID(ctx, id) // Use the dedicated GetByID query
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrDeliveryServiceNotFound
		}
		return fmt.Errorf("failed to check existence of delivery service before delete: %w", err)
	}

	err = s.querier.DeleteDeliveryService(ctx, id)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			// Check for foreign key constraint violation
			if pgErr.Code == "23503" && pgErr.ConstraintName == "orders_delivery_service_id_fkey" {
				// The delivery service is referenced by the 'orders' table
				return ErrDeliveryServiceInUse
			}
		}
		return fmt.Errorf("failed to delete delivery service from DB: %w", err)
	}
	return nil
}

// --- Helper Functions ---

func (s *DeliveryServiceService) toDeliveryServiceModel(dbDS db.DeliveryService) models.DeliveryService {
	return models.DeliveryService{
		ID:            dbDS.ID,
		Name:          dbDS.Name,
		Description:   dbDS.Description,
		BaseCostCents: dbDS.BaseCostCents,
		EstimatedDays: dbDS.EstimatedDays,
		IsActive:      dbDS.IsActive,
		CreatedAt:     dbDS.CreatedAt.Time,
		UpdatedAt:     dbDS.UpdatedAt.Time,
	}
}

var (
	ErrDeliveryServiceNotFound = errors.New("delivery service not found")
)
