package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/MihoZaki/DzTech/internal/db"
	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/google/uuid"

	"github.com/jackc/pgx/v5"
)

type CartService struct {
	querier    db.Querier
	productSvc *ProductService // Need product details for cart items
	logger     *slog.Logger
}

func NewCartService(querier db.Querier, productSvc *ProductService, logger *slog.Logger) *CartService {
	return &CartService{
		querier:    querier,
		productSvc: productSvc,
		logger:     logger,
	}
}

// GetCartForContext retrieves the cart for the given user ID or session ID.
// It ensures the cart exists, fetching or creating it as necessary.
// GetCartForContext retrieves the cart for the given user ID or session ID.
// It ensures the cart exists, fetching or creating it as necessary.
func (s *CartService) GetCartForContext(ctx context.Context, userID *uuid.UUID, sessionID string) (*models.CartSummary, error) {
	if userID == nil && sessionID == "" {
		return nil, fmt.Errorf("either userID or sessionID must be provided")
	}

	var cartID uuid.UUID
	var cartUserID uuid.UUID
	var cartSessionID *string
	var cartCreatedAt, cartUpdatedAt time.Time

	// Determine if user is authenticated or a guest
	if userID != nil {
		dbCart, err := s.getOrCreateUserCart(ctx, *userID)
		if err != nil {
			s.logger.Error("Error getting/creating user cart", "error", err, "user_id", *userID)
			return nil, err
		}
		cartID = dbCart.ID
		cartUserID = dbCart.UserID
		cartSessionID = dbCart.SessionID
		cartCreatedAt = dbCart.CreatedAt.Time
		cartUpdatedAt = dbCart.UpdatedAt.Time
	} else {
		dbCart, err := s.getOrCreateGuestCart(ctx, sessionID)
		if err != nil {
			s.logger.Error("Error getting/creating guest cart", "error", err, "session_id", sessionID)
			return nil, err
		}
		cartID = dbCart.ID
		cartUserID = dbCart.UserID       // Will be nil for guest carts
		cartSessionID = dbCart.SessionID // Will be &sessionID for guest carts
		cartCreatedAt = dbCart.CreatedAt.Time
		cartUpdatedAt = dbCart.UpdatedAt.Time
	}

	// Fetch items for the cart with product details
	dbItemsWithProduct, err := s.querier.GetCartWithItemsAndProducts(ctx, cartID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		s.logger.Error("Error fetching cart items with product details", "error", err, "cart_id", cartID)
		return nil, fmt.Errorf("failed to retrieve cart items: %w", err)
	}

	// Calculate totals and build the summary model
	var totalItems, totalQuantity int
	var totalValueCents int64
	items := make([]models.CartItemSummary, 0, len(dbItemsWithProduct))

	for _, itemRow := range dbItemsWithProduct {
		// Only process items where the product still exists and is active
		if itemRow.ProductName != nil && itemRow.ProductPriceCents != nil {
			qty := int(*itemRow.CartItemQuantity) // Quantity is a pointer because of emit_pointers_for_null_types
			priceCents := *itemRow.ProductPriceCents

			totalItems++
			totalQuantity += qty
			totalValueCents += int64(qty) * priceCents

			// Decode the image URLs JSONB array from []byte to []string
			var imageUrls []string
			if itemRow.ProductImageUrls != nil {
				err := json.Unmarshal(itemRow.ProductImageUrls, &imageUrls)
				if err != nil {
					s.logger.Warn("Failed to decode image URLs for product in cart", "product_id", itemRow.CartItemProductID, "error", err)
					// Set an empty slice on error
					imageUrls = []string{}
				}
			} else {
				imageUrls = []string{} // Default to empty slice if image_urls is null in DB
			}

			productLite := &models.ProductLite{
				ID:            itemRow.CartItemProductID,
				Name:          *itemRow.ProductName,
				PriceCents:    priceCents,
				StockQuantity: int(*itemRow.ProductStockQuantity),
				ImageUrls:     imageUrls, // Now properly decoded
				Brand:         *itemRow.ProductBrand,
			}

			itemSummary := models.CartItemSummary{
				ID:       itemRow.CartItemID,
				CartID:   itemRow.CartItemCartID,
				Product:  productLite,
				Quantity: qty,
			}
			items = append(items, itemSummary)
		} else {
			// If the product was deleted or became inactive since being added to the cart,
			// we could log this or handle it differently.
			// For now, we just skip it in the summary, but the item remains in the DB until explicitly removed.
			s.logger.Debug("Skipping cart item with missing/inactive product", "item_id", itemRow.CartItemID, "product_id", itemRow.CartItemProductID)
		}
	}

	return &models.CartSummary{
		ID:         cartID,
		UserID:     cartUserID,
		SessionID:  cartSessionID,
		CreatedAt:  cartCreatedAt,
		UpdatedAt:  cartUpdatedAt,
		Items:      items,
		TotalItems: totalItems,
		TotalQty:   totalQuantity,
		TotalValue: totalValueCents,
	}, nil
}

// getOrCreateUserCart fetches the cart for a user, creating one if it doesn't exist.
// Returns the database row struct (GetCartByUserIDRow).
func (s *CartService) getOrCreateUserCart(ctx context.Context, userID uuid.UUID) (db.Cart, error) {
	cart, err := s.querier.GetCartByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Cart doesn't exist, create one using the specific query for users
			newCart, err := s.querier.CreateUserCart(ctx, userID) // Pass userID directly as argument
			if err != nil {
				return db.Cart{}, fmt.Errorf("failed to create cart for user %s: %w", userID, err)
			}
			s.logger.Debug("Created new cart for user", "user_id", userID, "cart_id", newCart.ID)
			return newCart, nil // Return the struct returned by CreateUserCart
		}
		return db.Cart{}, fmt.Errorf("failed to get cart for user %s: %w", userID, err)
	}
	// Return the existing cart row, cast appropriately if necessary
	// Assuming GetCartByUserIDRow fields can be mapped to db.Cart if needed, or return the GetCartByUserIDRow directly if that's what GetCartByUserID returns.
	// However, GetCartByUserID returns GetCartByUserIDRow. We need to convert this potentially.
	// Let's assume the return type of CreateUserCart (db.Cart) is the canonical representation for a single cart row.
	// The GetCartByUserIDRow has the same fields essentially.
	// For consistency with the creation function's return, let's map GetCartByUserIDRow -> db.Cart
	return db.Cart{
		ID:        cart.ID,
		UserID:    cart.UserID,    // Should be the userID passed in
		SessionID: cart.SessionID, // Should be nil/NULL
		CreatedAt: cart.CreatedAt,
		UpdatedAt: cart.UpdatedAt,
	}, nil
}

// getOrCreateGuestCart fetches the cart for a session, creating one if it doesn't exist.
// Uses the new CreateGuestCart query.
// Returns the database row struct (Cart, which is the struct used for the RETURNING clause).
func (s *CartService) getOrCreateGuestCart(ctx context.Context, sessionID string) (db.Cart, error) {
	cart, err := s.querier.GetCartBySessionID(ctx, &sessionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Cart doesn't exist, create one using the specific query for guests
			newCart, err := s.querier.CreateGuestCart(ctx, &sessionID) // Pass sessionID as a pointer to string
			if err != nil {
				return db.Cart{}, fmt.Errorf("failed to create cart for session %s: %w", sessionID, err)
			}
			s.logger.Debug("Created new cart for session", "session_id", sessionID, "cart_id", newCart.ID)
			return newCart, nil // Return the struct returned by CreateGuestCart
		}
		return db.Cart{}, fmt.Errorf("failed to get cart for session %s: %w", sessionID, err)
	}
	// Return the existing cart row, mapped appropriately.
	// Assuming GetCartBySessionIDRow fields can be mapped to db.Cart.
	// GetCartBySessionID returns GetCartBySessionIDRow.
	return db.Cart{
		ID:        cart.ID,
		UserID:    cart.UserID,    // Should be nil/NULL
		SessionID: cart.SessionID, // Should be &sessionID
		CreatedAt: cart.CreatedAt,
		UpdatedAt: cart.UpdatedAt,
	}, nil
}

// AddItemToCart adds an item to the specified user's or guest's cart.
// If the item already exists in the cart, it updates the quantity.
func (s *CartService) AddItemToCart(ctx context.Context, userID *uuid.UUID, sessionID string, productID uuid.UUID, quantity int) (*db.CreateCartItemRow, error) {
	if quantity <= 0 {
		return nil, fmt.Errorf("quantity must be greater than 0")
	}
	// Validate product exists and get its details (including stock)
	// Note: We might not need the full product details here if the DB query handles stock checks,
	// but validating existence is good.
	product, err := s.productSvc.GetProduct(ctx, productID) // We don't strictly need the returned product struct here for existence check if the DB query handles it robustly
	if err != nil {
		return nil, fmt.Errorf("failed to validate product %s: %w", productID, err)
	}

	if product.StockQuantity < quantity {
		return nil, fmt.Errorf("requested quantity %d exceeds available stock %d for product %s", quantity, product.StockQuantity, productID)
	}
	// Determine the cart ID based on user or session
	var cartID uuid.UUID
	if userID != nil {
		userCart, err := s.getOrCreateUserCart(ctx, *userID)
		if err != nil {
			return nil, fmt.Errorf("failed to get user cart: %w", err)
		}
		cartID = userCart.ID
	} else {
		guestCart, err := s.getOrCreateGuestCart(ctx, sessionID)
		if err != nil {
			return nil, fmt.Errorf("failed to get guest cart: %w", err)
		}
		cartID = guestCart.ID
	}

	// Attempt to create or update the cart item using the SQL query
	// The query CreateCartItem handles ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = ...
	// and also enforces stock limits during the update.
	params := db.CreateCartItemParams{
		CartID:    cartID,
		ProductID: productID,
		Quantity:  int32(quantity),
	}
	// The CreateCartItem query is designed to handle the upsert and stock check atomically.
	updatedOrCreatedItem, err := s.querier.CreateCartItem(ctx, params)
	if err != nil {
		// The DB query should handle stock violations during the INSERT/UPDATE.
		// Depending on how strictly the DB constraint is defined, this might manifest differently.
		// For now, let the error propagate. The handler can decide how to respond.
		s.logger.Info("the update failure is due to", "dbErr", err)
		return nil, fmt.Errorf("failed to add item to cart: %w", err)
	}

	return &updatedOrCreatedItem, nil
}

// AddBulkItems adds multiple items to the user's or guest's cart efficiently in a single database call.
// It performs upserts and checks stock availability for all items in the batch atomically in the DB.
// It determines the cart based on userID (authenticated) or sessionID (guest).
func (s *CartService) AddBulkItems(ctx context.Context, userID *uuid.UUID, sessionID string, items []models.BulkAddItemRequest_Item) error {
	if len(items) == 0 {
		return fmt.Errorf("cannot add empty item list to cart")
	}

	// Determine the cart ID based on user or session (mirroring AddItemToCart logic)
	var cartID uuid.UUID
	if userID != nil {
		userCart, err := s.getOrCreateUserCart(ctx, *userID)
		if err != nil {
			return fmt.Errorf("failed to get user cart: %w", err)
		}
		cartID = userCart.ID
	} else if sessionID != "" {
		guestCart, err := s.getOrCreateGuestCart(ctx, sessionID)
		if err != nil {
			return fmt.Errorf("failed to get guest cart: %w", err)
		}
		cartID = guestCart.ID
	} else {
		return fmt.Errorf("either userID or sessionID must be provided to add items to cart")
	}

	// Validate items before preparing DB parameters
	for _, item := range items {
		if item.Quantity <= 0 {
			return fmt.Errorf("quantity for product %s must be greater than 0", item.ProductID)
		}
	}

	// Prepare slices for the SQLC query parameters (AddCartItemsBulkParams)
	productIDs := make([]uuid.UUID, len(items))
	quantities := make([]int32, len(items))

	for i, item := range items {
		productIDs[i] = item.ProductID
		quantities[i] = int32(item.Quantity) // Cast int to int32 as required by AddCartItemsBulkParams
	}

	// Call the generated SQLC query which handles upserts and stock checks atomically
	params := db.AddCartItemsBulkParams{
		CartID:     cartID, // Use the fetched or created cart ID
		ProductIds: productIDs,
		Quantities: quantities,
	}
	err := s.querier.AddCartItemsBulk(ctx, params)
	if err != nil {
		s.logger.Error("Failed to add bulk items to cart in DB", "error", err, "user_id", userID, "session_id", sessionID, "items", items)
		return fmt.Errorf("failed to add items to cart: %w", err)
	}

	s.logger.Debug("Successfully added bulk items to cart", "user_id", userID, "session_id", sessionID, "num_items", len(items))
	return nil
}

// UpdateItemQuantityInCart updates the quantity of an item in the specified user's or guest's cart.
func (s *CartService) UpdateItemQuantityInCart(ctx context.Context, userID *uuid.UUID, sessionID string, itemID uuid.UUID, newQuantity int) (*db.UpdateCartItemQuantityRow, error) {
	if newQuantity <= 0 {
		return nil, fmt.Errorf("quantity must be greater than 0")
	}

	// Fetch the existing cart item to get its CartID and ProductID
	existingItem, err := s.querier.GetCartItemByID(ctx, itemID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("cart item with ID %s not found", itemID)
		}
		return nil, fmt.Errorf("failed to fetch cart item %s: %w", itemID, err)
	}

	// Verify the item belongs to the correct cart (associated with the given userID or sessionID).
	// This is crucial for security: a user shouldn't be able to update an item in another user's or guest's cart.
	// We need to determine the expected cart ID based on userID/sessionID.
	var expectedCartID uuid.UUID
	if userID != nil {
		userCart, err := s.getOrCreateUserCart(ctx, *userID) // Use getOrCreate to ensure cart exists/get ID
		if err != nil {
			return nil, fmt.Errorf("failed to get user cart: %w", err)
		}
		expectedCartID = userCart.ID
	} else {
		guestCart, err := s.getOrCreateGuestCart(ctx, sessionID) // Use getOrCreate to ensure cart exists/get ID
		if err != nil {
			return nil, fmt.Errorf("failed to get guest cart: %w", err)
		}
		expectedCartID = guestCart.ID
	}

	// Check if the item's CartID matches the expected CartID derived from the user/session context.
	if existingItem.CartID != expectedCartID {
		return nil, fmt.Errorf("access denied: cart item %s does not belong to the specified cart", itemID)
	}

	// Call the query to update the quantity, which includes stock validation.
	params := db.UpdateCartItemQuantityParams{
		NewQuantity: int32(newQuantity),
		ItemID:      itemID,
	}
	updatedItem, err := s.querier.UpdateCartItemQuantity(ctx, params)
	if err != nil {
		// Check for stock violation errors propagated from the DB query
		if strings.Contains(strings.ToLower(err.Error()), "stock") || strings.Contains(strings.ToLower(err.Error()), "check") {
			return nil, fmt.Errorf("failed to update quantity: %w", err) // Propagate DB error or customize message
		}
		return nil, fmt.Errorf("failed to update item quantity: %w", err)
	}

	return &updatedItem, nil
}

// RemoveItemFromCart removes a specific item from the user's or guest's cart.
func (s *CartService) RemoveItemFromCart(ctx context.Context, userID *uuid.UUID, sessionID string, itemID uuid.UUID) error {
	// Fetch the existing cart item to get its CartID (for the future make it into a func DRY style)
	existingItem, err := s.querier.GetCartItemByID(ctx, itemID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("cart item with ID %s not found", itemID)
		}
		return fmt.Errorf("failed to fetch cart item %s: %w", itemID, err)
	}

	// Verify the item belongs to the correct cart (associated with the given userID or sessionID).
	// This is crucial for security: a user shouldn't be able to delete an item from another user's or guest's cart.
	// We need to determine the expected cart ID based on userID/sessionID.
	var expectedCartID uuid.UUID
	if userID != nil {
		userCart, err := s.getOrCreateUserCart(ctx, *userID) // Use getOrCreate to ensure cart exists/get ID
		if err != nil {
			return fmt.Errorf("failed to get user cart: %w", err)
		}
		expectedCartID = userCart.ID
	} else {
		guestCart, err := s.getOrCreateGuestCart(ctx, sessionID) // Use getOrCreate to ensure cart exists/get ID
		if err != nil {
			return fmt.Errorf("failed to get guest cart: %w", err)
		}
		expectedCartID = guestCart.ID
	}

	// Check if the item's CartID matches the expected CartID derived from the user/session context.
	if existingItem.CartID != expectedCartID {
		return fmt.Errorf("access denied: cart item %s does not belong to the specified cart", itemID)
	}

	// Call the query to soft-delete the item.
	err = s.querier.DeleteCartItem(ctx, itemID)
	if err != nil {
		slog.Debug("Deletion fail", "item_id", itemID, "cart_id", expectedCartID)
		return fmt.Errorf("failed to remove item %s from cart: %w", itemID, err)
	}
	slog.Debug("Deletion success", "item_id", itemID, "cart_id", expectedCartID)
	return nil
}

// ClearCart removes all items from the specified user's or guest's cart by soft-deleting them.
func (s *CartService) ClearCart(ctx context.Context, userID *uuid.UUID, sessionID string) error {
	// Determine the cart ID based on user or session
	var cartID uuid.UUID
	if userID != nil {
		userCart, err := s.getOrCreateUserCart(ctx, *userID)
		if err != nil {
			return fmt.Errorf("failed to get user cart: %w", err)
		}
		cartID = userCart.ID
	} else {
		guestCart, err := s.getOrCreateGuestCart(ctx, sessionID)
		if err != nil {
			return fmt.Errorf("failed to get guest cart: %w", err)
		}
		cartID = guestCart.ID
	}

	// Call the query to soft-delete all items in the cart.
	err := s.querier.ClearCart(ctx, cartID)
	if err != nil {
		return fmt.Errorf("failed to clear cart %s: %w", cartID, err)
	}

	return nil
}
