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
)

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

// GetDeliveryService retrieves a delivery service by its ID.
func (s *DeliveryServiceService) GetDeliveryService(ctx context.Context, id uuid.UUID, activeOnly bool) (*models.DeliveryService, error) {
	dbDeliveryService, err := s.querier.GetDeliveryService(ctx, db.GetDeliveryServiceParams{
		ID:           id,
		ActiveFilter: activeOnly, // Assuming the query parameter is named active_filter
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDeliveryServiceNotFound // Define this error
		}
		return nil, fmt.Errorf("failed to fetch delivery service: %w", err)
	}

	apiDeliveryService := s.toDeliveryServiceModel(dbDeliveryService)
	return &apiDeliveryService, nil
}

// ListDeliveryServices retrieves a list of delivery services.
func (s *DeliveryServiceService) ListDeliveryServices(ctx context.Context, activeOnly bool, limit, offset int) ([]models.DeliveryService, error) {
	if limit <= 0 {
		limit = 20 // Default limit
	}
	if offset < 0 {
		offset = 0 // Default offset
	}

	params := db.ListDeliveryServicesParams{
		ActiveFilter: activeOnly, // Assuming the query parameter is named active_filter
		PageLimit:    int32(limit),
		PageOffset:   int32(offset),
	}

	dbDeliveryServices, err := s.querier.ListDeliveryServices(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to list delivery services: %w", err)
	}

	apiDeliveryServices := make([]models.DeliveryService, len(dbDeliveryServices))
	for i, dbDS := range dbDeliveryServices {
		apiDeliveryServices[i] = s.toDeliveryServiceModel(dbDS)
	}

	return apiDeliveryServices, nil
}

// UpdateDeliveryService updates an existing delivery service.
func (s *DeliveryServiceService) UpdateDeliveryService(ctx context.Context, id uuid.UUID, req models.UpdateDeliveryServiceRequest) (*models.DeliveryService, error) {

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
	err := s.querier.DeleteDeliveryService(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete delivery service: %w", err)
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
