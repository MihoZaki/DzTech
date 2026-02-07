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
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrOrderNotFound = errors.New("order not found")
)

// OrderService handles business logic for orders.
type OrderService struct {
	querier        db.Querier
	pool           *pgxpool.Pool   // Add pool for transactions
	cartService    *CartService    // Required for checkout logic
	productService *ProductService // Required for fetching product details/prices during checkout
	logger         *slog.Logger
}

func NewOrderService(querier db.Querier, pool *pgxpool.Pool, cartService *CartService, productService *ProductService, logger *slog.Logger) *OrderService {
	return &OrderService{
		querier:        querier,
		pool:           pool, // Store the pool
		cartService:    cartService,
		productService: productService,
		logger:         logger,
	}
}

// CreateOrder creates a new order from the items in the user's cart.
func (s *OrderService) CreateOrder(ctx context.Context, req models.CreateOrderFromCartRequest, userID uuid.UUID) (*models.OrderWithItems, error) {
	cartSummary, err := s.cartService.GetCartForContext(ctx, &userID, "")
	if err != nil {
		return nil, fmt.Errorf("failed to fetch current cart state for user %s: %w", userID, err)
	}

	s.logger.Debug("successfully fetched cart summary", "summary cart id", cartSummary.ID)
	cartItemsMap := make(map[uuid.UUID]int) // product_id -> quantity
	for _, item := range cartSummary.Items {
		if item.Product != nil {
			cartItemsMap[item.Product.ID] = item.Quantity
		}
	}
	for _, reqItem := range req.Items {
		cartQty, exists := cartItemsMap[reqItem.ProductID]
		if !exists {
			return nil, fmt.Errorf("product %s in request is not present in the current cart", reqItem.ProductID)
		}
		if cartQty != reqItem.Quantity {
			return nil, fmt.Errorf("quantity mismatch for product %s: requested %d, cart has %d", reqItem.ProductID, reqItem.Quantity, cartQty)
		}
	}

	deliveryFrees, err := s.querier.GetDeliveryServiceByID(ctx, req.DeliveryServiceID)

	if err != nil {
		return nil, fmt.Errorf("failed to fetch current delivery service for user %s: %w", userID, err)
	}
	totalAmountCents := cartSummary.TotalValue + deliveryFrees.BaseCostCents

	createOrderParams := db.CreateOrderParams{
		UserID:            userID,
		UserFullName:      req.ShippingAddress.FullName,
		Status:            "pending",
		TotalAmountCents:  totalAmountCents,
		PaymentMethod:     "Cash on Delivery",
		Province:          req.ShippingAddress.Province,
		City:              req.ShippingAddress.City,
		PhoneNumber1:      req.ShippingAddress.PhoneNumber1,
		PhoneNumber2:      req.ShippingAddress.PhoneNumber2,
		Notes:             req.Notes,
		DeliveryServiceID: req.DeliveryServiceID,
	}

	numItems := len(req.Items)
	if numItems == 0 {
		return nil, fmt.Errorf("cannot create order from an empty cart/request")
	}

	orderItemProductIDs := make([]uuid.UUID, numItems)
	orderItemProductNames := make([]string, numItems)
	orderItemPricesCents := make([]int64, numItems)
	orderItemQuantities := make([]int32, numItems)

	for i, reqItem := range req.Items {
		var cartItem *models.CartItemSummary
		for _, item := range cartSummary.Items {
			if item.Product != nil && item.Product.ID == reqItem.ProductID {
				cartItem = &item
				break
			}
		}
		if cartItem == nil {
			return nil, fmt.Errorf("validated cart item for product %s not found in summary", reqItem.ProductID)
		}

		orderItemProductIDs[i] = reqItem.ProductID
		orderItemProductNames[i] = cartItem.Product.Name // Use name from summary for consistency
		orderItemPricesCents[i] = cartItem.Product.FinalPriceCents
		orderItemQuantities[i] = int32(reqItem.Quantity)
	}

	bulkOrderItemsParams := db.InsertOrderItemsBulkParams{
		OrderID:      uuid.Nil, // Will be set after the order is created
		ProductIds:   orderItemProductIDs,
		ProductNames: orderItemProductNames,
		PricesCents:  orderItemPricesCents, // Use the discounted prices
		Quantities:   orderItemQuantities,
	}

	queries, ok := s.querier.(*db.Queries)
	if !ok {
		return nil, errors.New("querier type assertion to *db.Queries failed, cannot create transactional querier")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction for order creation: %w", err)
	}
	defer func() {
		if err := tx.Rollback(ctx); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
			s.logger.Error("Error during transaction rollback", "error", err)
		}
	}()

	txQuerier := queries.WithTx(tx)

	dbOrder, err := txQuerier.CreateOrder(ctx, createOrderParams)
	if err != nil {
		return nil, fmt.Errorf("failed to create order record in transaction: %w", err)
	}

	orderID := dbOrder.ID

	bulkOrderItemsParams.OrderID = orderID

	err = txQuerier.InsertOrderItemsBulk(ctx, bulkOrderItemsParams)
	if err != nil {
		return nil, fmt.Errorf("failed to create order items in transaction: %w", err)
	}
	err = tx.Commit(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to commit order creation transaction: %w", err)
	}

	err = s.cartService.ClearCart(ctx, &userID, "")
	if err != nil {
		s.logger.Error("CRITICAL: Failed to clear user's cart after successful order creation",
			"cart_id", cartSummary.ID, "user_id", userID, "order_id", orderID, "error", err)
	}

	createdOrderWithItems, err := s.GetOrder(ctx, orderID) // Use the existing GetOrder method
	if err != nil {
		s.logger.Error("CRITICAL: Failed to fetch newly created order", "order_id", orderID, "error", err)
		return nil, fmt.Errorf("order created successfully, but failed to fetch details: %w", err)
	}

	return createdOrderWithItems, nil
}

// GetOrder retrieves an order by its ID along with its associated items.
// It aggregates the results from the GetOrderWithItems query which returns multiple rows.
func (s *OrderService) GetOrder(ctx context.Context, orderID uuid.UUID) (*models.OrderWithItems, error) {
	rows, err := s.querier.GetOrderWithItems(ctx, orderID)
	errorOrderNotFound := errors.New("order not found")
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("%w: order with id %s not found", errorOrderNotFound, orderID)
		}
		return nil, fmt.Errorf("failed to fetch order with items from DB: %w", err)
	}

	if len(rows) == 0 {
		return nil, fmt.Errorf("%w: order with id %s not found (no rows returned)", errorOrderNotFound, orderID)
	}

	// Aggregate rows into OrderWithItems structure
	var order *models.Order
	items := make([]models.OrderItem, 0)

	for _, row := range rows {
		// Process the order header data (only needs to be done once, ideally from the first row where item fields might be NULL)
		if order == nil {
			// Initialize the main Order object from the first row's order fields
			order = &models.Order{
				ID:                row.ID,
				UserID:            row.UserID,
				UserFullName:      row.UserFullName,
				Status:            row.Status,
				TotalAmountCents:  row.TotalAmountCents,
				PaymentMethod:     row.PaymentMethod,
				Province:          row.Province,
				City:              row.City,
				PhoneNumber1:      row.PhoneNumber1,
				PhoneNumber2:      row.PhoneNumber2,
				DeliveryServiceID: row.DeliveryServiceID,
				Notes:             row.Notes,
				CreatedAt:         row.CreatedAt.Time,
				UpdatedAt:         row.UpdatedAt.Time,
				CompletedAt:       nil, // Initialize, will set if not null
				CancelledAt:       nil, // Initialize, will set if not null
			}
			// Set nullable timestamps
			if row.CompletedAt.Valid {
				order.CompletedAt = &row.CompletedAt.Time
			}
			if row.CancelledAt.Valid {
				order.CancelledAt = &row.CancelledAt.Time
			}
		}

		// Process the item data if the item fields are not null (i.e., if an order item exists in this row)
		// Check if item_id is not null (assuming ItemID is a UUID and will be uuid.Nil if NULL from the LEFT JOIN)
		// However, checking ItemID for uuid.Nil might not be reliable if uuid.Nil is a valid ID.
		// A better check is if row.ItemProductName is not nil, or if any of the item-specific fields (other than IDs potentially) are not null.
		// Since ProductName is text, checking for nil is a good indicator.
		if row.ItemProductName != nil { // If this is nil, the LEFT JOIN found no item for this order row iteration
			item := models.OrderItem{
				ID:            row.ItemID,
				OrderID:       row.ItemOrderID,
				ProductID:     row.ItemProductID,
				ProductName:   *row.ItemProductName,   // Safe to dereference if we checked for nil above
				PriceCents:    *row.ItemPriceCents,    // Safe to dereference if we checked for nil above
				Quantity:      *row.ItemQuantity,      // Safe to dereference if we checked for nil above
				SubtotalCents: *row.ItemSubtotalCents, // Safe to dereference if we checked for nil above
				CreatedAt:     row.ItemCreatedAt.Time,
				UpdatedAt:     row.ItemUpdatedAt.Time,
			}
			items = append(items, item)
		}
	}

	// Ensure we got the order header data
	if order == nil {
		// This should not happen if the query returned rows for an existing order.
		// Indicates a potential issue with the query or data.
		return nil, fmt.Errorf("internal error: no order header data found in query results for order %s", orderID)
	}

	return &models.OrderWithItems{
		Order: *order, // Dereference the pointer we created
		Items: items,
	}, nil
}

// dbOrderToModelOrder converts a db.Order (generated by SQLC based on new schema) to a models.Order.
// This function now primarily ensures the struct types match, as most fields are direct mappings.
// It handles the conversion of pgtype.Timestamptz to time.Time and nullable timestamps.
func (s *OrderService) dbOrderToModelOrder(dbOrder db.Order) models.Order {
	var order models.Order
	order.ID = dbOrder.ID
	order.UserID = dbOrder.UserID
	order.UserFullName = dbOrder.UserFullName
	order.Status = dbOrder.Status
	order.TotalAmountCents = dbOrder.TotalAmountCents
	order.PaymentMethod = dbOrder.PaymentMethod
	order.Province = dbOrder.Province
	order.City = dbOrder.City
	order.PhoneNumber1 = dbOrder.PhoneNumber1
	order.PhoneNumber2 = dbOrder.PhoneNumber2
	order.DeliveryServiceID = dbOrder.DeliveryServiceID
	order.Notes = dbOrder.Notes
	order.CreatedAt = dbOrder.CreatedAt.Time
	order.UpdatedAt = dbOrder.UpdatedAt.Time
	if dbOrder.CompletedAt.Valid {
		order.CompletedAt = &dbOrder.CompletedAt.Time
	}
	if dbOrder.CancelledAt.Valid {
		order.CancelledAt = &dbOrder.CancelledAt.Time
	}

	return order
}

// ListUserOrders retrieves a paginated list of orders for a specific user, optionally filtered by status.
// It excludes cancelled orders.
func (s *OrderService) ListUserOrders(ctx context.Context, userID uuid.UUID, statusFilter string, page, limit int) ([]models.Order, error) {
	if limit <= 0 {
		limit = 20 // Default limit
	}
	if page <= 0 {
		page = 1 // Default page
	}
	offset := (page - 1) * limit

	params := db.ListUserOrdersParams{
		UserID:       userID,
		FilterStatus: statusFilter,
		PageOffset:   int32(offset),
		PageLimit:    int32(limit),
	}

	dbOrders, err := s.querier.ListUserOrders(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to list user orders from DB: %w", err)
	}

	apiOrders := make([]models.Order, len(dbOrders))
	for i, dbOrder := range dbOrders {
		apiOrders[i] = s.dbOrderToModelOrder(dbOrder)
	}

	return apiOrders, nil
}

func (s *OrderService) ListAllOrders(ctx context.Context, userIDFilter uuid.UUID, statusFilter string, page, limit int) ([]models.Order, error) {
	if limit <= 0 {
		limit = 20
	}
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	// Prepare parameters for the ListAllOrders query
	params := db.ListAllOrdersParams{
		FilterUserID: userIDFilter,
		FilterStatus: statusFilter,
		PageOffset:   int32(offset),
		PageLimit:    int32(limit),
	}

	dbOrders, err := s.querier.ListAllOrders(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to list all orders from DB: %w", err)
	}
	apiOrders := make([]models.Order, len(dbOrders))
	for i, dbOrder := range dbOrders {
		apiOrders[i] = s.dbOrderToModelOrder(dbOrder)
	}

	return apiOrders, nil
}

// Valid status transitions
// Assuming states: pending, confirmed, shipped, delivered, cancelled
// Basic rules:
// pending -> confirmed
// confirmed -> shipped
// shipped -> delivered
// Any -> cancelled (maybe only from pending/confirmed?)
// Prevent going backwards from delivered/cancelled

// isValidStatusTransition checks if a status change is allowed.
func isValidStatusTransition(current, requested string) bool {
	switch current {
	case "pending":
		return requested == "confirmed" || requested == "cancelled"
	case "confirmed":
		return requested == "shipped" || requested == "cancelled"
	case "shipped":
		return requested == "delivered"
	case "delivered", "cancelled":
		return false
	default:
		return false
	}
}

// UpdateOrderStatus updates the status of an order.
// It validates the transition and may perform stock deduction if transitioning to a reserved state.
func (s *OrderService) UpdateOrderStatus(ctx context.Context, orderID uuid.UUID, req models.UpdateOrderStatusRequest) (*models.Order, error) {
	// 1. Fetch the current order details
	currentOrder, err := s.querier.GetOrder(ctx, orderID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrOrderNotFound
		}
		return nil, fmt.Errorf("failed to fetch current order state: %w", err)
	}

	// 2. Validate the requested status transition
	if !isValidStatusTransition(currentOrder.Status, req.Status) {
		return nil, fmt.Errorf("invalid status transition: %s -> %s", currentOrder.Status, req.Status)
	}

	// 3. Determine if stock deduction is needed based on the transition
	needsStockDeduction := (currentOrder.Status == "pending" && req.Status == "confirmed")

	queries, ok := s.querier.(*db.Queries)
	if !ok {
		return nil, errors.New("querier type assertion to *db.Queries failed, cannot create transactional querier")
	}
	var updatedOrder db.Order
	if needsStockDeduction {
		// 4. Begin transaction for stock deduction and status update
		tx, err := s.pool.Begin(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to begin transaction for status update and stock deduction: %w", err)
		}
		defer func() {
			if err := tx.Rollback(ctx); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
				s.logger.Error("Error during transaction rollback in UpdateOrderStatus", "error", err)
			}
		}()

		txQuerier := queries.WithTx(tx) // Use the concrete type's WithTx method via the interface variable

		// 5. Fetch order items within the transaction
		orderItems, err := txQuerier.GetOrderItemsByOrderID(ctx, orderID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch order items for stock deduction: %w", err)
		}

		// 6. Perform stock deduction for each item within the transaction using the new query
		for _, item := range orderItems {

			updatedProduct, err := txQuerier.DecrementStockIfSufficient(ctx, db.DecrementStockIfSufficientParams{
				ProductID:       item.ProductID,
				DecrementAmount: item.Quantity,
			})

			if err != nil {
				// Check if the error is due to no rows being affected (insufficient stock)
				// The exact error type might vary, but pgx usually returns pgx.ErrNoRows if RETURNING is used and no row matches
				if errors.Is(err, pgx.ErrNoRows) {
					// This means the WHERE condition (stock >= decrement_amount) failed for this product
					// Rollback happens via defer
					return nil, fmt.Errorf("insufficient stock for product %s (ID: %s) during confirmation", item.ProductName, item.ProductID)
				}
				// Some other database error occurred
				// Rollback happens via defer
				return nil, fmt.Errorf("failed to update stock for product %s (ID: %s) during confirmation: %w", item.ProductName, item.ProductID, err)
			}
			// Optionally log the new stock level if needed
			s.logger.Debug("Stock decremented for product during order confirmation",
				"product_id", item.ProductID, "new_stock", updatedProduct.StockQuantity)
		}

		// 7. Update the order status within the same transaction
		updatedOrder, err = txQuerier.UpdateOrderStatus(ctx, db.UpdateOrderStatusParams{
			Status:  req.Status,
			OrderID: orderID,
		})
		if err != nil {
			// Rollback happens via defer
			return nil, fmt.Errorf("failed to update order status in transaction: %w", err)
		}

		// 8. Commit the transaction
		if err := tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("failed to commit transaction for status update and stock deduction: %w", err)
		}

	} else {
		// 9. If no stock deduction needed, update status directly in a simple transaction or just the querier
		// For consistency and to ensure atomicity of the status change itself, use a transaction.
		tx, err := s.pool.Begin(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to begin transaction for status update: %w", err)
		}
		defer func() {
			if err := tx.Rollback(ctx); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
				s.logger.Error("Error during transaction rollback in UpdateOrderStatus (simple update)", "error", err)
			}
		}()

		txQuerier := queries.WithTx(tx)

		updatedOrder, err = txQuerier.UpdateOrderStatus(ctx, db.UpdateOrderStatusParams{
			Status:  req.Status,
			OrderID: orderID,
		})
		if err != nil {
			// Rollback happens via defer
			return nil, fmt.Errorf("failed to update order status: %w", err)
		}

		if err := tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("failed to commit transaction for status update: %w", err)
		}
	}

	// 10. Convert the updated db.Order to models.Order using the helper
	updOrder := s.dbOrderToModelOrder(updatedOrder)

	// 11. Return the updated order details
	return &updOrder, nil
}

// Valid cancellation rules
// Allow cancelling from 'pending' or 'confirmed'
// Do NOT allow cancelling from 'shipped', 'delivered', or 'cancelled'

// canCancelOrder checks if an order can be cancelled based on its current status.
func canCancelOrder(currentStatus string) bool {
	switch currentStatus {
	case "pending", "confirmed":
		return true
	case "shipped", "delivered", "cancelled":
		return false
	default:
		return false
	}
}

// CancelOrder cancels an order.
// It validates if cancellation is allowed and may perform stock release if the order was confirmed.
func (s *OrderService) CancelOrder(ctx context.Context, orderID uuid.UUID) (*models.Order, error) {
	// 1. Fetch the current order details
	currentOrder, err := s.querier.GetOrder(ctx, orderID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrOrderNotFound
		}
		return nil, fmt.Errorf("failed to fetch current order state: %w", err)
	}

	// 2. Validate if cancellation is allowed based on the current status
	if !canCancelOrder(currentOrder.Status) {
		return nil, fmt.Errorf("order cannot be cancelled from status '%s'", currentOrder.Status)
	}

	// 3. Determine if stock release is needed based on the current status
	needsStockRelease := (currentOrder.Status == "confirmed") // Add other statuses if they also deducted stock

	queries, ok := s.querier.(*db.Queries)
	if !ok {
		return nil, errors.New("querier type assertion to *db.Queries failed, cannot create transactional querier")
	}
	var updatedOrder db.Order
	if needsStockRelease {
		// 4. Begin transaction for stock release and cancellation
		tx, err := s.pool.Begin(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to begin transaction for cancellation and stock release: %w", err)
		}
		defer func() {
			if err := tx.Rollback(ctx); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
				s.logger.Error("Error during transaction rollback in CancelOrder", "error", err)
			}
		}()

		txQuerier := queries.WithTx(tx)

		// 5. Fetch order items within the transaction
		orderItems, err := txQuerier.GetOrderItemsByOrderID(ctx, orderID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch order items for stock release: %w", err)
		}

		// 6. Perform stock release for each item within the transaction using the new query
		for _, item := range orderItems {
			// Call the new SQLC-generated query to increment stock
			updatedProduct, err := txQuerier.IncrementStock(ctx, db.IncrementStockParams{
				ProductID:       item.ProductID,
				IncrementAmount: item.Quantity, // item.Quantity is int32
			})

			if err != nil {
				// Some database error occurred during stock increment
				// Rollback happens via defer
				return nil, fmt.Errorf("failed to release stock for product %s (ID: %s) during cancellation: %w", item.ProductName, item.ProductID, err)
			}
			// Optionally log the new stock level if needed
			s.logger.Debug("Stock incremented for product during order cancellation",
				"product_id", item.ProductID, "new_stock", updatedProduct.StockQuantity)
		}

		// 7. Execute the cancellation within the same transaction
		updatedOrder, err = txQuerier.CancelOrder(ctx, orderID) // Use the existing CancelOrder query
		if err != nil {
			// Rollback happens via defer
			return nil, fmt.Errorf("failed to cancel order in transaction: %w", err)
		}

		// 8. Commit the transaction
		if err := tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("failed to commit transaction for cancellation and stock release: %w", err)
		}

	} else {
		// 9. If no stock release needed, execute cancellation directly in a simple transaction
		// For consistency and to ensure atomicity of the cancellation itself, use a transaction.
		tx, err := s.pool.Begin(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to begin transaction for cancellation: %w", err)
		}
		defer func() {
			if err := tx.Rollback(ctx); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
				s.logger.Error("Error during transaction rollback in CancelOrder (simple cancellation)", "error", err)
			}
		}()

		txQuerier := queries.WithTx(tx)

		updatedOrder, err = txQuerier.CancelOrder(ctx, orderID) // Use the existing CancelOrder query
		if err != nil {
			// Rollback happens via defer
			return nil, fmt.Errorf("failed to cancel order: %w", err)
		}

		if err := tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("failed to commit transaction for cancellation: %w", err)
		}
	}

	// 10. Convert the updated db.Order to models.Order using the helper
	updOrder := s.dbOrderToModelOrder(updatedOrder)

	// 11. Return the updated order details
	return &updOrder, nil
}

type StatusTransitionError struct {
	CurrentStatus   string
	RequestedStatus string
	Msg             string
}

func (e *StatusTransitionError) Error() string {
	return fmt.Sprintf("invalid status transition: %s -> %s: %s", e.CurrentStatus, e.RequestedStatus, e.Msg)
}

type CannotCancelError struct {
	CurrentStatus string
	Msg           string
}

func (e *CannotCancelError) Error() string {
	return fmt.Sprintf("cannot cancel order in status '%s': %s", e.CurrentStatus, e.Msg)
}
