package services

import (
	"context"
	"encoding/json"
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
func (s *OrderService) CreateOrder(ctx context.Context, req models.CreateOrderRequest) (*models.OrderWithItems, error) {
	dbCart, err := s.querier.GetCartByID(ctx, req.CartID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("specified cart not found")
		}
		return nil, fmt.Errorf("failed to fetch cart: %w", err)
	}

	if dbCart.UserID != req.UserID {
		return nil, errors.New("access denied: cart does not belong to the specified user")
	}
	cartItemsWithProducts, err := s.querier.GetCartWithItemsAndProducts(ctx, req.CartID) // Use req.CartID
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("cannot create order from an empty cart")
		}
		return nil, fmt.Errorf("failed to fetch items from the specified cart: %w", err)
	}

	var totalAmountCents int64 = 0
	orderItemsToCreate := make([]db.CreateOrderItemParams, len(cartItemsWithProducts))

	for i, itemRow := range cartItemsWithProducts {
		if itemRow.ProductName == nil || itemRow.ProductPriceCents == nil {
			return nil, fmt.Errorf("product associated with item %s in cart has been removed, cannot proceed", itemRow.CartItemID)
		}
		dbProduct, err := s.querier.GetProduct(ctx, itemRow.CartItemProductID) // Use itemRow.CartItemProductID
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, fmt.Errorf("product %s in cart not found during checkout, cannot proceed", itemRow.CartItemProductID)
			}
			return nil, fmt.Errorf("failed to fetch product %s details during checkout for snapshot: %w", itemRow.CartItemProductID, err)
		}

		cartItemQuantity := int(*itemRow.CartItemQuantity)

		if dbProduct.StockQuantity < int32(cartItemQuantity) {
			return nil, fmt.Errorf("insufficient stock for product %s (requested: %d, available: %d) at checkout time", dbProduct.Name, cartItemQuantity, dbProduct.StockQuantity)
		}

		itemSubtotalCents := dbProduct.PriceCents * int64(cartItemQuantity)
		totalAmountCents += itemSubtotalCents

		orderItemsToCreate[i] = db.CreateOrderItemParams{
			OrderID:     uuid.Nil, // Will be set after the main order is created within the transaction
			ProductID:   dbProduct.ID,
			ProductName: dbProduct.Name,          // Snapshotted name from Querier at checkout
			PriceCents:  dbProduct.PriceCents,    // Snapshotted price from Querier at checkout
			Quantity:    int32(cartItemQuantity), // Quantity from the cart item row
		}
	}

	queries, ok := s.querier.(*db.Queries)
	if !ok {
		return nil, errors.New("querier type assertion to *db.Queries failed, cannot create transactional querier")
	}
	tx, err := s.pool.Begin(ctx) // Use s.pool
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction for order creation: %w", err)
	}

	defer func() {
		if err := tx.Rollback(ctx); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
			s.logger.Error("Error during transaction rollback", "error", err)
		}
	}()

	txQuerier := queries.WithTx(tx) // <-- Use the concrete type's method

	shippingAddressBytes, err := json.Marshal(req.ShippingAddress) // req.ShippingAddress includes PhoneNumber
	if err != nil {
		return nil, fmt.Errorf("failed to marshal shipping address: %w", err)
	}
	billingAddressBytes, err := json.Marshal(req.BillingAddress) // req.BillingAddress includes PhoneNumber
	if err != nil {
		return nil, fmt.Errorf("failed to marshal billing address: %w", err)
	}

	createOrderParams := db.CreateOrderParams{
		UserID:            req.UserID,
		Status:            "pending", // Default status upon creation
		TotalAmountCents:  totalAmountCents,
		PaymentMethod:     "Cash on Delivery", // Fixed for COD system
		ShippingAddress:   shippingAddressBytes,
		BillingAddress:    billingAddressBytes,
		Notes:             req.Notes,
		DeliveryServiceID: req.DeliveryServiceID, // Include the delivery service ID from the request
	}

	dbOrder, err := txQuerier.CreateOrder(ctx, createOrderParams) // Use txQuerier
	if err != nil {
		return nil, fmt.Errorf("failed to create order record in transaction: %w", err)
	}

	orderID := dbOrder.ID
	for i := range orderItemsToCreate {
		orderItemsToCreate[i].OrderID = orderID                         // Set the actual OrderID now that the order exists in the transaction
		_, err := txQuerier.CreateOrderItem(ctx, orderItemsToCreate[i]) // Use txQuerier
		if err != nil {
			return nil, fmt.Errorf("failed to create order item in transaction: %w", err)
		}
	}

	err = tx.Commit(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to commit order creation transaction: %w", err)
	}

	err = s.querier.ClearCart(ctx, req.CartID)
	if err != nil {
		s.logger.Error("CRITICAL: Failed to clear user's cart after successful order creation",
			"cart_id", req.CartID, "user_id", req.UserID, "order_id", orderID, "error", err)
		// return nil, fmt.Errorf("order created successfully, but failed to clear cart afterwards: %w", err)
	}

	createdOrderWithItems, err := s.GetOrder(ctx, orderID)
	if err != nil {
		s.logger.Error("CRITICAL: Failed to fetch newly created order", "order_id", orderID, "error", err)
		return nil, fmt.Errorf("order created successfully, but failed to fetch details: %w", err)
	}

	return createdOrderWithItems, nil
}

func (s *OrderService) GetOrder(ctx context.Context, orderID uuid.UUID) (*models.OrderWithItems, error) {
	rows, err := s.querier.GetOrderByIDWithItems(ctx, orderID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrOrderNotFound
		}
		return nil, fmt.Errorf("failed to fetch order with items from DB: %w", err)
	}

	if len(rows) == 0 {
		return nil, ErrOrderNotFound
	}
	firstRow := rows[0]

	var order models.Order
	order.ID = firstRow.ID
	order.UserID = firstRow.UserID
	order.Status = firstRow.Status
	order.TotalAmountCents = firstRow.TotalAmountCents
	order.PaymentMethod = firstRow.PaymentMethod
	order.Notes = firstRow.Notes
	order.DeliveryServiceID = firstRow.DeliveryServiceID
	order.CreatedAt = firstRow.CreatedAt.Time
	order.UpdatedAt = firstRow.UpdatedAt.Time
	if firstRow.CompletedAt.Valid {
		order.CompletedAt = &firstRow.CompletedAt.Time
	}
	if firstRow.CancelledAt.Valid {
		order.CancelledAt = &firstRow.CancelledAt.Time
	}

	if err := json.Unmarshal(firstRow.ShippingAddress, &order.ShippingAddress); err != nil {
		s.logger.Error("Failed to unmarshal shipping address for order", "order_id", firstRow.ID, "error", err)
		order.ShippingAddress = models.LocalAddress{}
	}
	if err := json.Unmarshal(firstRow.BillingAddress, &order.BillingAddress); err != nil {
		s.logger.Error("Failed to unmarshal billing address for order", "order_id", firstRow.ID, "error", err)
		order.BillingAddress = models.LocalAddress{} // Assign empty as fallback
	}

	var orderItems []models.OrderItem
	for _, row := range rows {
		if row.ItemID != uuid.Nil {
			if row.ItemProductName == nil || row.ItemPriceCents == nil || row.ItemQuantity == nil || row.ItemSubtotalCents == nil {
				s.logger.Warn("Order item row has NULL critical fields, skipping", "order_id", order.ID, "item_row_id", row.ItemID)
				continue // Skip this item row
			}
			item := models.OrderItem{
				ID:            row.ItemID,
				OrderID:       row.ItemOrderID, // Should match order.ID
				ProductID:     row.ItemProductID,
				ProductName:   *row.ItemProductName,   // Safe to dereference due to check above
				PriceCents:    *row.ItemPriceCents,    // Safe to dereference
				Quantity:      int(*row.ItemQuantity), // Safe to dereference, cast int32->int
				SubtotalCents: *row.ItemSubtotalCents, // Safe to dereference
			}
			orderItems = append(orderItems, item)
		}
	}

	orderWithItems := &models.OrderWithItems{
		Order: order,
		Items: orderItems,
	}

	return orderWithItems, nil
}

// dbOrderToModelOrder converts a db.Order to a models.Order.
// This function handles the conversion of JSONB address fields ([]byte) to Go structs (LocalAddress).
func (s *OrderService) dbOrderToModelOrder(dbOrder db.Order) models.Order {
	var order models.Order
	order.ID = dbOrder.ID
	order.UserID = dbOrder.UserID
	order.Status = dbOrder.Status
	order.TotalAmountCents = dbOrder.TotalAmountCents
	order.PaymentMethod = dbOrder.PaymentMethod
	order.Notes = dbOrder.Notes
	order.DeliveryServiceID = dbOrder.DeliveryServiceID // Add this field
	order.CreatedAt = dbOrder.CreatedAt.Time
	order.UpdatedAt = dbOrder.UpdatedAt.Time
	if dbOrder.CompletedAt.Valid {
		order.CompletedAt = &dbOrder.CompletedAt.Time
	}
	if dbOrder.CancelledAt.Valid {
		order.CancelledAt = &dbOrder.CancelledAt.Time
	}

	if err := json.Unmarshal(dbOrder.ShippingAddress, &order.ShippingAddress); err != nil {
		s.logger.Error("Failed to unmarshal shipping address for order", "order_id", dbOrder.ID, "error", err)
		order.ShippingAddress = models.LocalAddress{}
	}
	if err := json.Unmarshal(dbOrder.BillingAddress, &order.BillingAddress); err != nil {
		s.logger.Error("Failed to unmarshal billing address for order", "order_id", dbOrder.ID, "error", err)
		order.BillingAddress = models.LocalAddress{}
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

	// Convert DB models to API models ([]db.Order -> []models.Order)
	// This includes unmarshalling JSONB address fields.
	apiOrders := make([]models.Order, len(dbOrders))
	for i, dbOrder := range dbOrders {
		apiOrders[i] = s.dbOrderToModelOrder(dbOrder) // Use the helper function
	}

	return apiOrders, nil
}

func (s *OrderService) ListAllOrders(ctx context.Context, userIDFilter uuid.UUID, statusFilter string, page, limit int) ([]models.Order, error) {
	if limit <= 0 {
		limit = 20 // Default limit
	}
	if page <= 0 {
		page = 1 // Default page
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
		apiOrders[i] = s.dbOrderToModelOrder(dbOrder) // Use the helper function
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
			// Call the new SQLC-generated query
			// It will succeed only if the stock is sufficient
			updatedProduct, err := txQuerier.DecrementStockIfSufficient(ctx, db.DecrementStockIfSufficientParams{
				ProductID:       item.ProductID,
				DecrementAmount: item.Quantity, // item.Quantity is int32
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
