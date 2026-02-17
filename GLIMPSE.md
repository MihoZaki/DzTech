Directory Structure:
└── ApiDocs.md
└── Endpoints.md
└── Readme.md
└── backup.sql
├── cmd/
  ├── server/
    └── main.go
├── db/
  └── database.go
  └── migrate.go
└── delivery.json
└── devbox.json
├── internal/
  ├── config/
    └── config.go
  ├── db/
    └── analytics.sql.go
    └── calculate_discounts.sql.go
    └── cart.sql.go
    └── db.go
    └── delivery_services.sql.go
    └── discounts.sql.go
    └── models.go
    └── multi_discounts.sql.go
    └── order.sql.go
    └── products.sql.go
    └── products_view.sql.go
    └── querier.go
    ├── queries/
      └── analytics.sql
      └── calculate_discounts.sql
      └── cart.sql
      └── delivery_services.sql
      └── discounts.sql
      └── multi_discounts.sql
      └── order.sql
      └── products.sql
      └── products_view.sql
      └── refresh_token.sql
      └── review.sql
      └── user.sql
    └── refresh_token.sql.go
    └── review.sql.go
    └── user.sql.go
  ├── handlers/
    └── admin_user_handler.go
    └── auth.go
    └── cart.go
    └── delivery_options.go
    └── delivery_service.go
    └── discount.go
    └── helper.go
    └── order.go
    └── product.go
    └── review.go
  ├── middleware/
    └── middleware.go
  ├── models/
    └── admin_user.go
    └── auth.go
    └── cart.go
    └── context.go
    └── delivery_service.go
    └── discount.go
    └── order.go
    └── product.go
    └── review.go
    └── user.go
    └── validation.go
  ├── router/
    └── router.go
  ├── server/
    └── server.go
  ├── services/
    └── admin_user_service.go
    └── auth_service.go
    └── cart_service.go
    └── delivery_service.go
    └── discount_service.go
    └── errors.go
    └── order_service.go
    └── product_service.go
    └── refresh_payload.json
    └── review_service.go
    └── user_service.go
  ├── storage/
    └── storage.go
  ├── utils/
    └── errors.go
    └── roundup.go
    └── slug.go
└── justfile
├── migrations/
  └── 00001_init_db.sql
  └── 00002_create_users_table.sql
  └── 00003_create_products_and_categories_tables.sql
  └── 00004_create_cart_table.sql
  └── 00005_create_delivery_service_table.sql
  └── 00006_create_order_table.sql
  └── 00007_create_refresh_token_table.sql
  └── 00008_insert_test_data.sql
  └── 00009_create_discount_table.sql
  └── 00010_create_review_table.sql
  └── 00011_create_views_table.sql
└── orderPayload.json
└── progress.md
└── schema_only.sql
├── shared/
  └── types.go
  └── types.ts
└── sqlc.yaml

File Contents:

File: sqlc.yaml
================================================
version: "2"
sql:
  - engine: "postgresql"
    queries: "./internal/db/queries/"
    schema: "./migrations/"
    gen:
      go:
        package: "db"
        out: "./internal/db"
        sql_package: "pgx/v5"
        emit_json_tags: true
        emit_prepared_queries: false
        emit_pointers_for_null_types: true
        emit_interface: true
        emit_exact_table_names: false
        overrides:
        # Force ALL UUID types to use uuid.UUID
        - db_type: "uuid"
          go_type:
            import: "github.com/google/uuid"
            type: "UUID"
        - db_type: "uuid"
          nullable: true
          go_type:
            import: "github.com/google/uuid"
            type: "UUID"  # Still use UUID, handle nullability in the service layer
        - db_type: "uuid[]"
          go_type:
            import: "github.com/google/uuid"
            type: "[]UUID"


File: migrations/00001_init_db.sql
================================================
-- +goose Up
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS schema_migrations (
    version BIGINT PRIMARY KEY,
    is_applied BOOLEAN NOT NULL DEFAULT TRUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS schema_migrations;


File: db/migrate.go
================================================
package db

import (
	"database/sql"
	"fmt"
	"log/slog"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib" // Import for side effects - registers the pgx driver
	"github.com/pressly/goose/v3"
)

func RunMigrations() error {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return fmt.Errorf("DATABASE_URL environment variable is required")
	}

	// Create a *sql.DB for migrations using pgx driver
	sqlDB, err := sql.Open("pgx", dbURL)
	if err != nil {
		return fmt.Errorf("failed to create sql.DB for migrations: %w", err)
	}
	defer sqlDB.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}

	if err := goose.Up(sqlDB, "migrations"); err != nil {
		return err
	}

	slog.Info("Migrations completed successfully")
	return nil
}


File: cmd/server/main.go
================================================
package main

import (
	"log/slog"
	"os"

	"tech-store-backend/internal/config"
	"tech-store-backend/internal/server"
)

func main() {
	// Configure structured logging
handler := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug, // Or get from config/env var
	})
	logger := slog.New(handler)
	slog.SetDefault(logger) // Set the global logger

	// Load configuration
	cfg := config.LoadConfig()

	// Create and start server
	srv := server.New(cfg)

	if err := srv.Start(); err != nil {
		slog.Error("Server failed to start", "error", err)
		os.Exit(1)
	}
}


File: internal/db/cart.sql.go
================================================
// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.30.0
// source: cart.sql

package db

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

const addCartItemsBulk = `-- name: AddCartItemsBulk :execrows

INSERT INTO cart_items (cart_id, product_id, quantity, created_at, updated_at)
SELECT 
  $1, -- $1: The target cart ID
  input.product_id,
  input.quantity, -- Use the new requested quantity
  NOW(),
  NOW()
FROM (
  -- Prepare input data using UNNEST
  SELECT 
    UNNEST($2::uuid[]) as product_id, -- $2: Array of product IDs
    UNNEST($3::int[]) as quantity      -- $3: Array of corresponding quantities
) as input
INNER JOIN products p ON p.id = input.product_id
  AND p.stock_quantity >= input.quantity -- Ensure sufficient stock for the NEW quantity during INSERT
  AND p.status = 'active'
  AND p.deleted_at IS NULL
ON CONFLICT (cart_id, product_id)
DO UPDATE SET
  quantity = CASE
    -- If the existing row in cart_items was soft-deleted, check stock and set to NEW quantity
    WHEN cart_items.deleted_at IS NOT NULL THEN
      CASE
        -- Re-check stock against the NEW quantity being added via EXCLUDED (the values that would have been inserted)
        WHEN (SELECT stock_quantity FROM products WHERE id = EXCLUDED.product_id) >= EXCLUDED.quantity THEN
          EXCLUDED.quantity -- Set to the NEW quantity from the INSERT attempt (overwrites old soft-deleted quantity)
        ELSE
          -- If stock check fails for the new quantity, keep the old soft-deleted quantity.
          -- Alternatively, could raise an exception depending on desired behavior.
          cart_items.quantity
      END
    -- If the existing row was NOT soft-deleted, add the new quantity and check total against stock
    ELSE
      LEAST(
        cart_items.quantity + EXCLUDED.quantity, -- Add the new quantity
        (SELECT stock_quantity FROM products WHERE id = EXCLUDED.product_id) -- Cap at product's stock
      )
  END,
  -- Undelete the item if it was soft-deleted, otherwise leave its status unchanged
  deleted_at = CASE
    WHEN cart_items.deleted_at IS NOT NULL THEN NULL -- Undelete
    ELSE cart_items.deleted_at -- Keep as is
  END,
  updated_at = NOW()
`

type AddCartItemsBulkParams struct {
	CartID     uuid.UUID   `json:"cart_id"`
	ProductIds []uuid.UUID `json:"product_ids"`
	Quantities []int32     `json:"quantities"`
}

// Include deleted_at to see if undeletion happened
// Adds multiple items to a cart, handling upserts and soft deletes.
// Checks stock availability for each item during the insert/update process.
// Join with products table to validate existence, status, deletion, and stock for the INSERT
func (q *Queries) AddCartItemsBulk(ctx context.Context, arg AddCartItemsBulkParams) (int64, error) {
	result, err := q.db.Exec(ctx, addCartItemsBulk, arg.CartID, arg.ProductIds, arg.Quantities)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

const clearCart = `-- name: ClearCart :exec
UPDATE cart_items
SET deleted_at = NOW()
WHERE cart_id = $1
`

func (q *Queries) ClearCart(ctx context.Context, cartID uuid.UUID) error {
	_, err := q.db.Exec(ctx, clearCart, cartID)
	return err
}

const createCartItem = `-- name: CreateCartItem :one
INSERT INTO cart_items (cart_id, product_id, quantity, created_at, updated_at)
SELECT
    $1, -- $1
    $2, -- $2
    $3, -- $3
    NOW(),
    NOW()
FROM products
WHERE id = $2 -- Check product exists
    AND stock_quantity >= $3 -- Ensure enough stock for the INSERT
    AND status = 'active'
    AND deleted_at IS NULL
ON CONFLICT (cart_id, product_id)
DO UPDATE SET
    quantity = CASE
        WHEN cart_items.deleted_at IS NOT NULL THEN
            -- If the existing row was soft-deleted, check stock for the NEW requested quantity
            CASE
                WHEN (SELECT stock_quantity FROM products WHERE id = $2) >= $3 THEN
                    $3 -- Set to the NEW requested quantity if stock allows
                ELSE
                    -- Keep old quantity if stock check fails here
                    cart_items.quantity
            END
        ELSE
            -- If the existing row was NOT soft-deleted, add the new quantity and check total against stock
            LEAST(
                cart_items.quantity + $3, -- Add new quantity
                (SELECT stock_quantity FROM products WHERE id = $2) -- Cap at stock
            )
    END,
    deleted_at = CASE
        WHEN cart_items.deleted_at IS NOT NULL THEN NULL -- Undelete if it was soft-deleted
        ELSE cart_items.deleted_at -- Keep deleted_at if it wasn't soft-deleted
    END,
    updated_at = NOW()
RETURNING
    id,
    cart_id,
    product_id,
    quantity,
    created_at,
    updated_at,
    deleted_at
`

type CreateCartItemParams struct {
	CartID    uuid.UUID `json:"cart_id"`
	ProductID uuid.UUID `json:"product_id"`
	Quantity  int32     `json:"quantity"`
}

// Cart Item Management
func (q *Queries) CreateCartItem(ctx context.Context, arg CreateCartItemParams) (CartItem, error) {
	row := q.db.QueryRow(ctx, createCartItem, arg.CartID, arg.ProductID, arg.Quantity)
	var i CartItem
	err := row.Scan(
		&i.ID,
		&i.CartID,
		&i.ProductID,
		&i.Quantity,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.DeletedAt,
	)
	return i, err
}

const createGuestCart = `-- name: CreateGuestCart :one
INSERT INTO carts (session_id, created_at, updated_at, deleted_at) -- Only session_id in the INSERT
VALUES ($1, NOW(), NOW(), NULL) -- Uses sqlc.arg(session_id)
RETURNING id, user_id, session_id, created_at, updated_at, deleted_at
`

func (q *Queries) CreateGuestCart(ctx context.Context, sessionID *string) (Cart, error) {
	row := q.db.QueryRow(ctx, createGuestCart, sessionID)
	var i Cart
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.SessionID,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.DeletedAt,
	)
	return i, err
}

const createUserCart = `-- name: CreateUserCart :one
INSERT INTO carts (user_id, created_at, updated_at, deleted_at) -- Only user_id in the INSERT
VALUES ($1, NOW(), NOW(), NULL) -- Uses sqlc.arg(user_id)
RETURNING id, user_id, session_id, created_at, updated_at, deleted_at
`

// Cart Management
func (q *Queries) CreateUserCart(ctx context.Context, userID uuid.UUID) (Cart, error) {
	row := q.db.QueryRow(ctx, createUserCart, userID)
	var i Cart
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.SessionID,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.DeletedAt,
	)
	return i, err
}

const deleteCart = `-- name: DeleteCart :exec
UPDATE carts
SET deleted_at = NOW()
WHERE id = $1
`

func (q *Queries) DeleteCart(ctx context.Context, cartID uuid.UUID) error {
	_, err := q.db.Exec(ctx, deleteCart, cartID)
	return err
}

const deleteCartItem = `-- name: DeleteCartItem :exec
UPDATE cart_items
SET deleted_at = NOW()
WHERE id = $1
`

// Cart Cleanup
func (q *Queries) DeleteCartItem(ctx context.Context, itemID uuid.UUID) error {
	_, err := q.db.Exec(ctx, deleteCartItem, itemID)
	return err
}

const getCartByID = `-- name: GetCartByID :one
SELECT
    id,
    user_id,
    session_id,
    created_at,
    updated_at
FROM carts
WHERE id = $1 AND deleted_at IS NULL
`

type GetCartByIDRow struct {
	ID        uuid.UUID          `json:"id"`
	UserID    uuid.UUID          `json:"user_id"`
	SessionID *string            `json:"session_id"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
	UpdatedAt pgtype.Timestamptz `json:"updated_at"`
}

func (q *Queries) GetCartByID(ctx context.Context, cartID uuid.UUID) (GetCartByIDRow, error) {
	row := q.db.QueryRow(ctx, getCartByID, cartID)
	var i GetCartByIDRow
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.SessionID,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getCartBySessionID = `-- name: GetCartBySessionID :one
SELECT
    id,
    user_id,
    session_id,
    created_at,
    updated_at
FROM carts
WHERE session_id = $1 AND deleted_at IS NULL
`

type GetCartBySessionIDRow struct {
	ID        uuid.UUID          `json:"id"`
	UserID    uuid.UUID          `json:"user_id"`
	SessionID *string            `json:"session_id"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
	UpdatedAt pgtype.Timestamptz `json:"updated_at"`
}

func (q *Queries) GetCartBySessionID(ctx context.Context, sessionID *string) (GetCartBySessionIDRow, error) {
	row := q.db.QueryRow(ctx, getCartBySessionID, sessionID)
	var i GetCartBySessionIDRow
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.SessionID,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getCartByUserID = `-- name: GetCartByUserID :one
SELECT
    id,
    user_id,
    session_id,
    created_at,
    updated_at
FROM carts
WHERE user_id = $1 AND deleted_at IS NULL
`

type GetCartByUserIDRow struct {
	ID        uuid.UUID          `json:"id"`
	UserID    uuid.UUID          `json:"user_id"`
	SessionID *string            `json:"session_id"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
	UpdatedAt pgtype.Timestamptz `json:"updated_at"`
}

func (q *Queries) GetCartByUserID(ctx context.Context, userID uuid.UUID) (GetCartByUserIDRow, error) {
	row := q.db.QueryRow(ctx, getCartByUserID, userID)
	var i GetCartByUserIDRow
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.SessionID,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getCartItemByCartAndProduct = `-- name: GetCartItemByCartAndProduct :one
SELECT
    id,
    cart_id,
    product_id,
    quantity,
    created_at,
    updated_at
FROM cart_items
WHERE cart_id = $1 AND product_id = $2
`

type GetCartItemByCartAndProductParams struct {
	CartID    uuid.UUID `json:"cart_id"`
	ProductID uuid.UUID `json:"product_id"`
}

type GetCartItemByCartAndProductRow struct {
	ID        uuid.UUID          `json:"id"`
	CartID    uuid.UUID          `json:"cart_id"`
	ProductID uuid.UUID          `json:"product_id"`
	Quantity  int32              `json:"quantity"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
	UpdatedAt pgtype.Timestamptz `json:"updated_at"`
}

func (q *Queries) GetCartItemByCartAndProduct(ctx context.Context, arg GetCartItemByCartAndProductParams) (GetCartItemByCartAndProductRow, error) {
	row := q.db.QueryRow(ctx, getCartItemByCartAndProduct, arg.CartID, arg.ProductID)
	var i GetCartItemByCartAndProductRow
	err := row.Scan(
		&i.ID,
		&i.CartID,
		&i.ProductID,
		&i.Quantity,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getCartItemByID = `-- name: GetCartItemByID :one
SELECT
    id,
    cart_id,
    product_id,
    quantity,
    created_at,
    updated_at
FROM cart_items
WHERE id = $1
`

type GetCartItemByIDRow struct {
	ID        uuid.UUID          `json:"id"`
	CartID    uuid.UUID          `json:"cart_id"`
	ProductID uuid.UUID          `json:"product_id"`
	Quantity  int32              `json:"quantity"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
	UpdatedAt pgtype.Timestamptz `json:"updated_at"`
}

func (q *Queries) GetCartItemByID(ctx context.Context, itemID uuid.UUID) (GetCartItemByIDRow, error) {
	row := q.db.QueryRow(ctx, getCartItemByID, itemID)
	var i GetCartItemByIDRow
	err := row.Scan(
		&i.ID,
		&i.CartID,
		&i.ProductID,
		&i.Quantity,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getCartItemsCount = `-- name: GetCartItemsCount :one

SELECT COUNT(*) AS num_cart_items
FROM cart_items
WHERE cart_id = $1 AND deleted_at IS NULL
`

// Update the timestamp
// Counts the number of active (non-deleted) items in a specific cart.
func (q *Queries) GetCartItemsCount(ctx context.Context, cartID uuid.UUID) (int64, error) {
	row := q.db.QueryRow(ctx, getCartItemsCount, cartID)
	var num_cart_items int64
	err := row.Scan(&num_cart_items)
	return num_cart_items, err
}

const getCartItemsWithProductDetails = `-- name: GetCartItemsWithProductDetails :many
SELECT
    ci.id,
    ci.cart_id,
    ci.product_id,
    ci.quantity,
    ci.created_at,
    ci.updated_at,
    p.name as product_name,
    p.price_cents as product_price_cents,
    p.stock_quantity as product_stock_quantity,
    p.image_urls as product_image_urls,
    p.brand as product_brand
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
WHERE ci.cart_id = $1
    AND p.deleted_at IS NULL
    AND p.status = 'active'
ORDER BY ci.created_at DESC
`

type GetCartItemsWithProductDetailsRow struct {
	ID                   uuid.UUID          `json:"id"`
	CartID               uuid.UUID          `json:"cart_id"`
	ProductID            uuid.UUID          `json:"product_id"`
	Quantity             int32              `json:"quantity"`
	CreatedAt            pgtype.Timestamptz `json:"created_at"`
	UpdatedAt            pgtype.Timestamptz `json:"updated_at"`
	ProductName          string             `json:"product_name"`
	ProductPriceCents    int64              `json:"product_price_cents"`
	ProductStockQuantity int32              `json:"product_stock_quantity"`
	ProductImageUrls     []byte             `json:"product_image_urls"`
	ProductBrand         string             `json:"product_brand"`
}

// Enhanced Cart Data Retrieval
func (q *Queries) GetCartItemsWithProductDetails(ctx context.Context, cartID uuid.UUID) ([]GetCartItemsWithProductDetailsRow, error) {
	rows, err := q.db.Query(ctx, getCartItemsWithProductDetails, cartID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetCartItemsWithProductDetailsRow
	for rows.Next() {
		var i GetCartItemsWithProductDetailsRow
		if err := rows.Scan(
			&i.ID,
			&i.CartID,
			&i.ProductID,
			&i.Quantity,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.ProductName,
			&i.ProductPriceCents,
			&i.ProductStockQuantity,
			&i.ProductImageUrls,
			&i.ProductBrand,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getCartStats = `-- name: GetCartStats :one
SELECT
    COUNT(ci.id) as total_items,
    SUM(ci.quantity) FILTER (WHERE p.id IS NOT NULL) as total_quantity,
    SUM(ci.quantity * p.price_cents) FILTER (WHERE p.id IS NOT NULL) as total_value
FROM carts c
LEFT JOIN cart_items ci ON c.id = ci.cart_id
LEFT JOIN products p ON ci.product_id = p.id
WHERE c.id = $1
    AND p.deleted_at IS NULL
    AND p.status = 'active'
`

type GetCartStatsRow struct {
	TotalItems    int64 `json:"total_items"`
	TotalQuantity int64 `json:"total_quantity"`
	TotalValue    int64 `json:"total_value"`
}

func (q *Queries) GetCartStats(ctx context.Context, cartID uuid.UUID) (GetCartStatsRow, error) {
	row := q.db.QueryRow(ctx, getCartStats, cartID)
	var i GetCartStatsRow
	err := row.Scan(&i.TotalItems, &i.TotalQuantity, &i.TotalValue)
	return i, err
}

const getCartWithItemsAndProducts = `-- name: GetCartWithItemsAndProducts :many
SELECT
    c.id as cart_id,
    c.user_id as cart_user_id,
    c.session_id as cart_session_id,
    c.created_at as cart_created_at,
    c.updated_at as cart_updated_at,
    ci.id as cart_item_id,
    ci.cart_id as cart_item_cart_id,
    ci.product_id as cart_item_product_id,
    ci.quantity as cart_item_quantity,
    ci.created_at as cart_item_created_at,
    ci.updated_at as cart_item_updated_at,
    p.name as product_name,
    p.price_cents as product_price_cents,
    p.stock_quantity as product_stock_quantity,
    p.image_urls as product_image_urls,
    p.brand as product_brand
FROM carts c
LEFT JOIN cart_items ci ON c.id = ci.cart_id
LEFT JOIN products p ON ci.product_id = p.id
WHERE c.id = $1
    AND ci.deleted_at is Null
    AND (p.deleted_at IS NULL OR p.id IS NULL)
ORDER BY ci.created_at DESC
`

type GetCartWithItemsAndProductsRow struct {
	CartID               uuid.UUID          `json:"cart_id"`
	CartUserID           uuid.UUID          `json:"cart_user_id"`
	CartSessionID        *string            `json:"cart_session_id"`
	CartCreatedAt        pgtype.Timestamptz `json:"cart_created_at"`
	CartUpdatedAt        pgtype.Timestamptz `json:"cart_updated_at"`
	CartItemID           uuid.UUID          `json:"cart_item_id"`
	CartItemCartID       uuid.UUID          `json:"cart_item_cart_id"`
	CartItemProductID    uuid.UUID          `json:"cart_item_product_id"`
	CartItemQuantity     *int32             `json:"cart_item_quantity"`
	CartItemCreatedAt    pgtype.Timestamptz `json:"cart_item_created_at"`
	CartItemUpdatedAt    pgtype.Timestamptz `json:"cart_item_updated_at"`
	ProductName          *string            `json:"product_name"`
	ProductPriceCents    *int64             `json:"product_price_cents"`
	ProductStockQuantity *int32             `json:"product_stock_quantity"`
	ProductImageUrls     []byte             `json:"product_image_urls"`
	ProductBrand         *string            `json:"product_brand"`
}

func (q *Queries) GetCartWithItemsAndProducts(ctx context.Context, cartID uuid.UUID) ([]GetCartWithItemsAndProductsRow, error) {
	rows, err := q.db.Query(ctx, getCartWithItemsAndProducts, cartID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetCartWithItemsAndProductsRow
	for rows.Next() {
		var i GetCartWithItemsAndProductsRow
		if err := rows.Scan(
			&i.CartID,
			&i.CartUserID,
			&i.CartSessionID,
			&i.CartCreatedAt,
			&i.CartUpdatedAt,
			&i.CartItemID,
			&i.CartItemCartID,
			&i.CartItemProductID,
			&i.CartItemQuantity,
			&i.CartItemCreatedAt,
			&i.CartItemUpdatedAt,
			&i.ProductName,
			&i.ProductPriceCents,
			&i.ProductStockQuantity,
			&i.ProductImageUrls,
			&i.ProductBrand,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const syncGuestCartItemsToUserCart = `-- name: SyncGuestCartItemsToUserCart :exec
INSERT INTO cart_items (cart_id, product_id, quantity, created_at, updated_at)
SELECT
    $1, -- $1: The destination user's cart ID
    ci.product_id,
    ci.quantity, -- Quantity from the guest cart item
    NOW(), -- New created_at timestamp for the entry in the user's cart
    NOW()  -- New updated_at timestamp for the user's cart
FROM
    cart_items ci -- Primary table: items from the source guest cart
INNER JOIN products p ON p.id = ci.product_id -- Join with products table to validate and get stock info at INSERT time
    AND p.stock_quantity >= ci.quantity -- Ensure sufficient stock for the NEW quantity during INSERT
    AND p.status = 'active'
    AND p.deleted_at IS NULL
WHERE
    ci.cart_id = $2 -- Filter items from the specific guest cart
    AND ci.deleted_at IS NULL -- Only sync items not marked as deleted in the guest cart
ON CONFLICT (cart_id, product_id)
DO UPDATE SET
    -- In the UPDATE part (conflict resolution), handle merging with existing items in the user's cart
    quantity = CASE
        -- Scenario: The item exists in the user's cart but was soft-deleted.
        WHEN cart_items.deleted_at IS NOT NULL THEN
            CASE
                -- Re-check stock against the quantity being added from the guest cart (EXCLUDED.quantity).
                WHEN (SELECT stock_quantity FROM products WHERE id = EXCLUDED.product_id) >= EXCLUDED.quantity THEN
                    EXCLUDED.quantity -- Set to the guest cart's quantity (overwrites old soft-deleted quantity)
                ELSE
                    -- If stock check fails for the guest quantity, keep the old soft-deleted quantity.
                    cart_items.quantity
            END
        -- Scenario: The item exists in the user's cart and is NOT soft-deleted.
        ELSE
            -- Add the guest cart's quantity to the user's existing quantity.
            -- Use LEAST to cap the total at the product's available stock.
            LEAST(
                cart_items.quantity + EXCLUDED.quantity, -- Add guest quantity to existing quantity
                (SELECT stock_quantity FROM products WHERE id = EXCLUDED.product_id) -- Cap at product's stock
            )
    END,
    -- Handle the soft-delete state during the update.
    -- If the item was soft-deleted in the user's cart, undelete it.
    deleted_at = CASE
        WHEN cart_items.deleted_at IS NOT NULL THEN NULL -- Undelete if it was soft-deleted
        ELSE cart_items.deleted_at -- Keep existing state (likely NULL)
    END,
    updated_at = NOW()
`

type SyncGuestCartItemsToUserCartParams struct {
	TargetUserCartID  uuid.UUID `json:"target_user_cart_id"`
	SourceGuestCartID uuid.UUID `json:"source_guest_cart_id"`
}

// Merges items from a guest cart into a user's cart using upsert logic.
// Handles quantity updates, stock checks, and soft-delete state transitions (undeletion).
// This query performs the core merge operation efficiently in a single statement.
func (q *Queries) SyncGuestCartItemsToUserCart(ctx context.Context, arg SyncGuestCartItemsToUserCartParams) error {
	_, err := q.db.Exec(ctx, syncGuestCartItemsToUserCart, arg.TargetUserCartID, arg.SourceGuestCartID)
	return err
}

const updateCartItemQuantity = `-- name: UpdateCartItemQuantity :one
UPDATE cart_items ci
SET quantity = $1, updated_at = NOW()
FROM products p
WHERE ci.id = $2
    AND ci.product_id = p.id
    AND $1 > 0
    AND $1 <= p.stock_quantity  -- Stock validation
RETURNING
    ci.id,
    ci.cart_id,
    ci.product_id,
    ci.quantity,
    ci.created_at,
    ci.updated_at,
    p.name as product_name,
    p.price_cents as product_price_cents,
    p.stock_quantity as product_stock_quantity,
    p.image_urls as product_image_urls,
    p.brand as product_brand
`

type UpdateCartItemQuantityParams struct {
	NewQuantity int32     `json:"new_quantity"`
	ItemID      uuid.UUID `json:"item_id"`
}

type UpdateCartItemQuantityRow struct {
	ID                   uuid.UUID          `json:"id"`
	CartID               uuid.UUID          `json:"cart_id"`
	ProductID            uuid.UUID          `json:"product_id"`
	Quantity             int32              `json:"quantity"`
	CreatedAt            pgtype.Timestamptz `json:"created_at"`
	UpdatedAt            pgtype.Timestamptz `json:"updated_at"`
	ProductName          string             `json:"product_name"`
	ProductPriceCents    int64              `json:"product_price_cents"`
	ProductStockQuantity int32              `json:"product_stock_quantity"`
	ProductImageUrls     []byte             `json:"product_image_urls"`
	ProductBrand         string             `json:"product_brand"`
}

func (q *Queries) UpdateCartItemQuantity(ctx context.Context, arg UpdateCartItemQuantityParams) (UpdateCartItemQuantityRow, error) {
	row := q.db.QueryRow(ctx, updateCartItemQuantity, arg.NewQuantity, arg.ItemID)
	var i UpdateCartItemQuantityRow
	err := row.Scan(
		&i.ID,
		&i.CartID,
		&i.ProductID,
		&i.Quantity,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.ProductName,
		&i.ProductPriceCents,
		&i.ProductStockQuantity,
		&i.ProductImageUrls,
		&i.ProductBrand,
	)
	return i, err
}


File: internal/db/queries/review.sql
================================================
-- name: CreateReview :one
-- Inserts a new review and returns its details.
-- NOTE: This query alone does not update the product's avg_rating/num_ratings.
INSERT INTO reviews (
    user_id, product_id, rating
) VALUES (
    $1, $2, $3
)
RETURNING id, user_id, product_id, rating, created_at, updated_at;

-- name: GetReviewByUserAndProduct :one
-- Retrieves a review by a specific user for a specific product.
SELECT id, user_id, product_id, rating, created_at, updated_at
FROM reviews
WHERE user_id = $1 AND product_id = $2 AND deleted_at IS NULL;

-- name: GetReviewByIDAndUser :one
-- Retrieves a specific review by its ID and verifies the user owns it.
SELECT id, user_id, product_id, rating, created_at, updated_at
FROM reviews
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: GetReviewsByProductID :many
-- Retrieves all reviews for a specific product, including the reviewer's name, potentially paginated.
SELECT 
    r.id,
    r.user_id,
    r.product_id,
    r.rating,
    r.created_at,
    r.updated_at,
    u.full_name AS reviewer_name 
FROM reviews r
JOIN users u ON r.user_id = u.id -- INNER JOIN to link review to user
WHERE r.product_id = sqlc.arg(product_id) AND r.deleted_at IS NULL
ORDER BY r.created_at DESC -- Or rating DESC, etc.
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);


-- name: GetReviewsByUserID :many
-- Retrieves all reviews submitted by a specific user, including the product name, potentially paginated.
SELECT 
    r.id,
    r.user_id,
    r.product_id,
    r.rating,
    r.created_at,
    r.updated_at,
    p.name AS product_name -- Join with products table to get the name
FROM reviews r
JOIN products p ON r.product_id = p.id -- INNER JOIN to link review to product
WHERE r.user_id = sqlc.arg(user_id) AND r.deleted_at IS NULL
ORDER BY r.created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: UpdateReview :one
-- Updates the rating of an existing review.
-- NOTE: This query alone does not update the product's avg_rating/num_ratings.
UPDATE reviews
SET rating = $1, updated_at = NOW()
WHERE id = $2 AND user_id = $3 -- Ensure user owns the review
RETURNING id, user_id, product_id, rating, created_at, updated_at;

-- name: DeleteReview :one
-- Soft deletes a review by setting deleted_at.
-- NOTE: This query alone does not update the product's avg_rating/num_ratings.
UPDATE reviews
SET deleted_at = NOW(), updated_at = NOW()
WHERE id = $1 AND user_id = $2 -- Ensure user owns the review
RETURNING id, user_id, product_id, rating, created_at, updated_at;

-- name: CalculateReviewStatsForProduct :one
-- Calculates the average rating and count of non-deleted reviews for a specific product.
-- Used to update the products table.
SELECT
    AVG(r.rating)::NUMERIC(3,2) AS avg_rating,
    COUNT(r.rating)::INTEGER AS num_ratings
FROM reviews r
WHERE r.product_id = sqlc.arg(product_id) AND r.deleted_at IS NULL;

-- name: UpdateProductReviewStats :exec
-- Updates the avg_rating and num_ratings fields in the products table for a specific product.
UPDATE products
SET
    avg_rating = sqlc.arg(avg_rating),
    num_ratings = sqlc.arg(num_ratings),
    updated_at = NOW() -- Optionally update the product's general updated_at too
WHERE id = sqlc.arg(product_id);


File: internal/db/queries/products.sql
================================================
-- name: GetProduct :one
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE id = sqlc.arg(product_id) AND deleted_at IS NULL;

-- name: GetProductBySlug :one
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE slug = sqlc.arg(slug) AND deleted_at IS NULL;

-- name: CheckSlugExists :one
-- Checks if a product slug already exists (excluding soft-deleted products).
SELECT EXISTS(SELECT 1 FROM products WHERE slug = $1 AND deleted_at IS NULL) AS exists;

-- name: ListProducts :many
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListProductsWithCategory :many
SELECT 
    sqlc.embed(p),
    c.name as category_name,
    c.slug as category_slug,
    c.type as category_type
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListProductsByCategory :many
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE category_id = sqlc.arg(category_id) AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListProductsWithCategoryDetail :many
SELECT 
    sqlc.embed(p),
    sqlc.embed(c)
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.category_id = sqlc.arg(category_id) AND p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);


-- name: SearchProductsWithDiscounts :many
-- Searches for products and includes pre-calculated discount information using the view.
-- Includes a flexible spec highlight filter for partial matching within values.
SELECT
    p.id,
    p.category_id,
    c.name AS category_name,
    p.name,
    p.slug,
    p.description,
    p.short_description,
    p.price_cents AS original_price_cents,
    p.stock_quantity,
    p.status,
    p.brand,
    p.image_urls,
    p.spec_highlights,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    p.avg_rating,
    p.num_ratings,
    vpcd.total_fixed_discount_cents::BIGINT,
    vpcd.combined_percentage_factor::FLOAT,
    COALESCE(vpcd.calculated_discounted_price_cents, p.price_cents) AS discounted_price_cents,
    -- Use the has_active_discount boolean directly from the view
    COALESCE(vpcd.has_active_discount, FALSE) AS has_active_discount
FROM
    products p
INNER JOIN categories c ON p.category_id = c.id -- Join with categories table
LEFT JOIN
    v_products_with_calculated_discounts vpcd ON p.id = vpcd.product_id
WHERE
    p.deleted_at IS NULL
    -- Main text search filter (name, description)
    AND (
        sqlc.arg(query)::TEXT = '' 
        OR p.name ILIKE '%' || sqlc.arg(query) || '%' 
        OR COALESCE(p.short_description, '') ILIKE '%' || sqlc.arg(query) || '%' 
        OR to_tsvector('english', p.name || ' ' || COALESCE(p.short_description, '')) @@ plainto_tsquery('english', sqlc.arg(query))
        OR p.spec_highlights::TEXT ILIKE '%' || sqlc.arg(query) || '%'
    )
    -- Spec highlight filter: Check if apply_spec_filter is true, then match the value for the given key
    AND (NOT sqlc.arg(apply_spec_filter)::BOOLEAN OR (sqlc.arg(spec_filter_key)::TEXT != '' AND p.spec_highlights ->> sqlc.arg(spec_filter_key) ILIKE '%' || sqlc.arg(spec_filter_value) || '%'))
    -- Category filter
    AND (sqlc.arg(category_id)::UUID = '00000000-0000-0000-0000-000000000000' OR p.category_id = sqlc.arg(category_id))
    -- Brand filter
    AND (sqlc.arg(brand)::TEXT = '' OR p.brand ILIKE '%' || sqlc.arg(brand) || '%')
    -- Price range filter
    AND (sqlc.arg(min_price)::BIGINT = 0 OR p.price_cents >= sqlc.arg(min_price))
    AND (sqlc.arg(max_price)::BIGINT = 0 OR p.price_cents <= sqlc.arg(max_price))
    -- Stock availability filter
    AND (
        (sqlc.arg(in_stock_only)::BOOLEAN = false AND sqlc.arg(in_stock_only) IS NOT NULL)
        OR (sqlc.arg(in_stock_only) = true AND p.stock_quantity > 0)
        OR (sqlc.arg(in_stock_only) = false AND p.stock_quantity <= 0)
    )
    -- Discount filter
    AND (sqlc.arg(include_discounted_only)::BOOLEAN = false OR vpcd.has_active_discount = TRUE)
ORDER BY
    p.created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);
-- name: SearchProductsWithCategory :many
SELECT 
    sqlc.embed(p),
    c.name as category_name,
    c.slug as category_slug,
    c.type as category_type
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.deleted_at IS NULL
  AND (sqlc.arg(query)::TEXT = '' OR p.name ILIKE '%' || sqlc.arg(query) || '%' OR COALESCE(p.short_description, '') ILIKE '%' || sqlc.arg(query) || '%' OR to_tsvector('english', p.name || ' ' || COALESCE(p.short_description, '')) @@ plainto_tsquery('english', sqlc.arg(query)))
  AND (sqlc.arg(category_id)::UUID = '00000000-0000-0000-0000-000000000000' OR p.category_id = sqlc.arg(category_id))
  AND (sqlc.arg(brand)::TEXT = '' OR p.brand ILIKE '%' || sqlc.arg(brand) || '%')
  AND (sqlc.arg(min_price)::BIGINT = 0 OR p.price_cents >= sqlc.arg(min_price))
  AND (sqlc.arg(max_price)::BIGINT = 0 OR p.price_cents <= sqlc.arg(max_price))
  AND ((sqlc.arg(in_stock_only)::BOOLEAN = false AND sqlc.arg(in_stock_only) IS NOT NULL) OR (sqlc.arg(in_stock_only) = true AND p.stock_quantity > 0) OR (sqlc.arg(in_stock_only) = false AND p.stock_quantity <= 0))
ORDER BY p.created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);


-- name: CreateProduct :one
INSERT INTO products (
    category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
) VALUES (
    sqlc.arg(category_id), 
    sqlc.arg(name), 
    sqlc.arg(slug), 
    sqlc.arg(description), 
    sqlc.arg(short_description), 
    sqlc.arg(price_cents), 
    sqlc.arg(stock_quantity), 
    sqlc.arg(status), 
    sqlc.arg(brand), 
    sqlc.arg(image_urls), 
    sqlc.arg(spec_highlights), 
    NOW(), -- created_at
    NOW()  -- updated_at
) 
RETURNING  id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at;

-- name: UpdateProduct :one
UPDATE products
SET
    category_id = COALESCE(sqlc.arg(category_id), category_id),
    name = COALESCE(sqlc.arg(name), name),
    slug = COALESCE(sqlc.arg(slug), slug),
    description = COALESCE(sqlc.arg(description), description),
    short_description = COALESCE(sqlc.arg(short_description), short_description),
    price_cents = COALESCE(sqlc.arg(price_cents), price_cents),
    stock_quantity = COALESCE(sqlc.arg(stock_quantity), stock_quantity),
    status = COALESCE(sqlc.arg(status), status),
    brand = COALESCE(sqlc.arg(brand), brand),
    image_urls = COALESCE(sqlc.arg(image_urls), image_urls),
    spec_highlights = COALESCE(sqlc.arg(spec_highlights), spec_highlights),
    updated_at = NOW()
WHERE id = sqlc.arg(product_id) AND deleted_at IS NULL
RETURNING  id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at;

-- name: DeleteProduct :exec
UPDATE products
SET deleted_at = NOW()
WHERE id = sqlc.arg(product_id);

-- name: GetCategory :one
SELECT id, name, slug, type, parent_id, created_at
FROM categories
WHERE id = sqlc.arg(category_id);

-- name: GetCategoryBySlug :one
SELECT id, name, slug, type, parent_id, created_at
FROM categories
WHERE slug = sqlc.arg(slug);

-- name: ListCategories :many
SELECT id, name, slug, type, parent_id, created_at
FROM categories
ORDER BY name;

-- name: CountProducts :one
SELECT COUNT(*) FROM products p
LEFT JOIN v_products_with_calculated_discounts vpcd ON p.id = vpcd.product_id
WHERE p.deleted_at IS NULL
    -- Main text search filter (name, description)
    AND (
        sqlc.arg(query)::TEXT = '' 
        OR p.name ILIKE '%' || sqlc.arg(query) || '%' 
        OR COALESCE(p.short_description, '') ILIKE '%' || sqlc.arg(query) || '%' 
        OR to_tsvector('english', p.name || ' ' || COALESCE(p.short_description, '')) @@ plainto_tsquery('english', sqlc.arg(query))
        OR p.spec_highlights::TEXT ILIKE '%' || sqlc.arg(query) || '%'
    )
    -- Spec highlight filter: Check if apply_spec_filter is true, then match the value for the given key
    AND (NOT sqlc.arg(apply_spec_filter)::BOOLEAN OR (sqlc.arg(spec_filter_key)::TEXT != '' AND p.spec_highlights ->> sqlc.arg(spec_filter_key) ILIKE '%' || sqlc.arg(spec_filter_value) || '%'))
    -- Category filter
    AND (sqlc.arg(category_id)::UUID = '00000000-0000-0000-0000-000000000000' OR p.category_id = sqlc.arg(category_id))
    -- Brand filter
    AND (sqlc.arg(brand)::TEXT = '' OR p.brand ILIKE '%' || sqlc.arg(brand) || '%')
    -- Price range filter
    AND (sqlc.arg(min_price)::BIGINT = 0 OR p.price_cents >= sqlc.arg(min_price))
    AND (sqlc.arg(max_price)::BIGINT = 0 OR p.price_cents <= sqlc.arg(max_price))
    -- Stock availability filter
    AND (
        (sqlc.arg(in_stock_only)::BOOLEAN = false AND sqlc.arg(in_stock_only) IS NOT NULL)
        OR (sqlc.arg(in_stock_only) = true AND p.stock_quantity > 0)
        OR (sqlc.arg(in_stock_only) = false AND p.stock_quantity <= 0)
    )
    -- Discount filter
    AND (sqlc.arg(include_discounted_only)::BOOLEAN = false OR vpcd.has_active_discount = TRUE);

-- name: CountAllProducts :one
SELECT COUNT(*) FROM products WHERE deleted_at IS NULL;


File: internal/handlers/cart.go
================================================
package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"tech-store-backend/internal/models"
	"tech-store-backend/internal/services"
	"tech-store-backend/internal/utils"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type CartHandler struct {
	cartService    *services.CartService
	productService *services.ProductService // Might be needed for future operations
	logger         *slog.Logger
}

func NewCartHandler(cartService *services.CartService, productService *services.ProductService, logger *slog.Logger) *CartHandler {
	return &CartHandler{
		cartService:    cartService,
		productService: productService,
		logger:         logger,
	}
}
func (h *CartHandler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.GetCart)                            // GET /cart
	r.Post("/items", h.AddItem)                      // POST /cart/items <- Add this line
	r.Patch("/items/{itemID}", h.UpdateItemQuantity) // PATCH /cart/items/{id}
	r.Post("/add-bulk", h.AddBulkItemsToCart)
	r.Delete("/items/{itemID}", h.RemoveItem) // DELETE /cart/items/{id} - Add this line
	r.Delete("/", h.ClearCart)                // DELETE /cart - Add this line
}

// getSessionIDFromCookie extracts the session ID from the "session_id" cookie.
// It logs if the cookie is missing but doesn't send an error response.
func (h *CartHandler) getSessionIDFromCookie(r *http.Request) (string, bool) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		h.logger.Debug("Session cookie not found in request", "error", err)
		return "", false
	}
	return cookie.Value, true
}

// setSessionIDCookie sets the "session_id" cookie in the response.
// It generates a new UUID if no session ID exists yet.
// It configures the cookie with HttpOnly and SameSite flags for security.
// Adjust Secure flag based on whether you are using HTTPS.
func (h *CartHandler) setSessionIDCookie(w http.ResponseWriter, sessionID string) {
	if sessionID == "" {
		// Generate a new session ID if none exists
		sessionID = uuid.New().String()
		h.logger.Debug("Generated new session ID for cookie", "session_id", sessionID)
	}

	cookie := &http.Cookie{
		Name:     "session_id",            // Name of the cookie
		Value:    sessionID,               // The session ID value
		Path:     "/",                     // Cookie is valid for the entire site
		HttpOnly: true,                    // Prevents JavaScript access (security)
		Secure:   false,                   // Set to true if using HTTPS in production
		SameSite: http.SameSiteStrictMode, // Mitigate CSRF (adjust if needed for cross-origin requests)
		MaxAge:   86400,                   // Cookie expires in 24 hours (86400 seconds)
		// Expires:  time.Now().Add(24 * time.Hour), // Alternative to MaxAge
	}

	http.SetCookie(w, cookie) // Add the cookie to the response headers
}

// GetCart retrieves the current user's or guest's cart.
// Expected Headers: Authorization (Bearer token) for authenticated users.
//
//	Session ID is retrieved from the "session_id" cookie for guest users.
//
// Response: 200 OK with CartSummary JSON. Sets "session_id" cookie if it didn't exist for guests.
//
//	400 Bad Request if neither auth nor session cookie is provided (for guests).
//	500 Internal Server Error if backend fails.
func (h *CartHandler) GetCart(w http.ResponseWriter, r *http.Request) {
	var userID *uuid.UUID
	var sessionID string

	// Extract user ID from context if authenticated
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user accessing cart", "user_id", user.ID)
		userID = &user.ID
		// sessionID remains empty for authenticated users
	} else {
		// Fall back to session ID from cookie for guest users
		var hasSessionCookie bool
		sessionID, hasSessionCookie = h.getSessionIDFromCookie(r)
		if !hasSessionCookie {
			// If no session cookie exists, we might still want to initialize a cart for a guest,
			// but we need a session ID. The service layer will generate one if needed.
			// The handler should then set the cookie.
			// For now, let's assume we want to allow the request to proceed to the service,
			// which will generate a session ID if necessary, and then we set the cookie here.
			sessionID = uuid.New().String()
			h.logger.Debug("No session cookie found, generated new session ID for guest cart request", "session_id", sessionID)
			// Do NOT set the cookie yet. We need to call the service first to ensure the cart exists/gets created.
			// The service might need to interact with the database based on the session ID.
		}
		h.logger.Debug("Guest user accessing cart", "session_id", sessionID)
	}

	// Call the service with the determined userID or sessionID
	cartSummary, err := h.cartService.GetCartForContext(r.Context(), userID, sessionID)
	if err != nil {
		// Log the specific error from the service
		if userID != nil {
			h.logger.Error("Failed to get user cart", "user_id", *userID, "error", err)
		} else {
			h.logger.Error("Failed to get guest cart", "session_id", sessionID, "error", err)
		}
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to retrieve cart.")
		return
	}

	// If the request was for a guest and we generated a new session ID (or just read an existing one),
	// ensure the cookie is set in the response.
	if userID == nil { // Only for guests
		if !h.hasSessionCookie(r) {
			h.setSessionIDCookie(w, sessionID) // Set the cookie with the session ID used
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cartSummary)
}

// AddItem adds an item to the current user's or guest's cart.
// Expected Headers: Authorization (Bearer token) for authenticated users.
//
//	Session ID is retrieved from the "session_id" cookie for guest users.
//
// Expected Body: JSON { "product_id": "uuid-string", "quantity": number }
// Response: 200 OK with updated CartItem JSON. Sets "session_id" cookie if it didn't exist for guests.
//
//	400 Bad Request if input is invalid, or neither auth nor session cookie is provided (for guests).
//	404 Not Found if product doesn't exist.
//	409 Conflict if requested quantity exceeds stock (handled by DB/service).
//	500 Internal Server Error if backend fails.
func (h *CartHandler) AddItem(w http.ResponseWriter, r *http.Request) {
	var userID *uuid.UUID
	var sessionID string

	// Extract user ID from context if authenticated
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user adding item to cart", "user_id", user.ID)
		userID = &user.ID
		// sessionID remains empty for authenticated users
	} else {
		// Fall back to session ID from cookie for guest users
		var hasSessionCookie bool
		sessionID, hasSessionCookie = h.getSessionIDFromCookie(r)
		if !hasSessionCookie {
			// Generate a new session ID if the cookie is missing for a guest request
			sessionID = uuid.New().String()
			h.logger.Debug("No session cookie found, generated new session ID for guest add item request", "session_id", sessionID)
		}
		h.logger.Debug("Guest user adding item to cart", "session_id", sessionID)
	}

	h.logger.Debug("Handling cart add item request")

	// Parse the request body
	var req models.AddItemRequest // Use the struct from models package
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Invalid JSON body.")
		h.logger.Debug("Failed to decode add item request body", "error", err)
		return
	}

	// Validate the request struct using the Validate method defined in models/cart.go
	err = req.Validate() // Call the Validate method on the received struct
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", fmt.Sprintf("Validation failed: %v", err))
		h.logger.Debug("Add item request validation failed", "request", req, "error", err)
		return
	}

	// Parse the product ID string into a UUID (validate tag already checked format)
	productID, err := uuid.Parse(req.ProductID)
	if err != nil {
		// This should theoretically not happen if validator worked correctly,
		// but good practice to handle it.
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Invalid product ID format after validation.")
		h.logger.Error("Unexpected parsing error after validation", "product_id_str", req.ProductID, "error", err)
		return
	}

	h.logger.Debug("Adding item to cart", "user_id", userID, "session_id", sessionID, "product_id", productID, "quantity", req.Quantity)

	// Call the service to add the item (passes userID if present, otherwise sessionID)
	updatedOrNewItem, err := h.cartService.AddItemToCart(r.Context(), userID, sessionID, productID, req.Quantity)
	if err != nil {
		// Log the specific error from the service
		h.logger.Error("Failed to add item to cart", "user_id", userID, "session_id", sessionID, "product_id", productID, "quantity", req.Quantity, "error", err)

		// Check for specific known errors like stock issues
		errMsg := strings.ToLower(err.Error())
		if strings.Contains(errMsg, "stock") || strings.Contains(errMsg, "check") {
			utils.SendErrorResponse(w, http.StatusConflict, "Conflict", "Requested quantity exceeds available stock or other constraint violated.")
			return
		}

		// Generic error for other failures
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to add item to cart.")
		return
	}

	// If the request was for a guest and we generated a new session ID, set the cookie.
	if userID == nil && !h.hasSessionCookie(r) { // Only for guests who didn't have a cookie initially
		h.setSessionIDCookie(w, sessionID)
	}

	// Successfully added/updated item
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedOrNewItem) // Encode the item returned by the service
}

// Helper to check if session cookie exists (used in AddItem, UpdateItemQuantity, RemoveItem, ClearCart)
func (h *CartHandler) hasSessionCookie(r *http.Request) bool {
	_, err := r.Cookie("session_id")
	return err == nil
}

// UpdateItemQuantity updates the quantity of an existing item in the current user's or guest's cart.
// Expected Headers: Authorization (Bearer token) for authenticated users.
//
//	Session ID is retrieved from the "session_id" cookie for guest users.
//
// Expected URL Param: itemID (UUID string)
// Expected Body: JSON { "quantity": number }
// Response: 200 OK with updated CartItem JSON. Sets "session_id" cookie if it didn't exist for guests.
//
//	400 Bad Request if input is invalid, session ID is missing, or item ID is invalid.
//	404 Not Found if the cart item doesn't exist.
//	403 Forbidden if the item doesn't belong to the user's/guest's cart.
//	409 Conflict if requested quantity exceeds stock (handled by DB/service).
//	500 Internal Server Error if backend fails.
func (h *CartHandler) UpdateItemQuantity(w http.ResponseWriter, r *http.Request) {
	var userID *uuid.UUID
	var sessionID string

	// Extract user ID from context if authenticated
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user updating item quantity in cart", "user_id", user.ID)
		userID = &user.ID
		// sessionID remains empty for authenticated users
	} else {
		// Fall back to session ID from cookie for guest users
		var hasSessionCookie bool
		sessionID, hasSessionCookie = h.getSessionIDFromCookie(r)
		if !hasSessionCookie {
			utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "A session ID cookie ('session_id') is required for guest carts.")
			h.logger.Debug("Missing session cookie for guest cart update item request and no authenticated user in context")
			return
		}
		h.logger.Debug("Guest user updating item quantity in cart", "session_id", sessionID)
	}

	itemID, err := ParseUUIDPathParam(w, r, "itemID")
	if err != nil {
		h.logger.Debug("Update item request failed to parse itemID", "error", err)
		return // Error response already sent by helper
	}

	h.logger.Debug("Handling cart update item request", "user_id", userID, "session_id", sessionID, "item_id", itemID)

	var req models.UpdateItemQuantityRequest // Use the struct from models package
	if err := DecodeAndValidateJSON(w, r, &req); err != nil {
		h.logger.Debug("Update item request failed validation/decoding", "error", err)
		return // Error response already sent by helper
	}

	h.logger.Debug("Updating item quantity in cart", "user_id", userID, "session_id", sessionID, "item_id", itemID, "new_quantity", req.Quantity)

	updatedItem, err := h.cartService.UpdateItemQuantityInCart(r.Context(), userID, sessionID, itemID, req.Quantity)
	if err != nil {
		SendServiceError(w, h.logger, "update item quantity in cart", err)
		return
	}

	// If the request was for a guest and we generated a new session ID, set the cookie.
	// Note: This specific endpoint (UpdateItemQuantity) might not typically be the first interaction
	// for a guest, so the cookie likely already exists. We only set it if it was missing at the start.
	if userID == nil && !h.hasSessionCookie(r) { // Only for guests who didn't have a cookie initially
		h.setSessionIDCookie(w, sessionID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedItem) // Encode the item returned by the service
}

// RemoveItem removes a specific item from the current user's or guest's cart.
// Expected Headers: Authorization (Bearer token) for authenticated users.
//
//	Session ID is retrieved from the "session_id" cookie for guest users.
//
// Expected URL Param: itemID (UUID string)
// Response: 204 No Content on success. Sets "session_id" cookie if it didn't exist for guests.
//
//	400 Bad Request if input is invalid, session ID is missing, or item ID is invalid.
//	404 Not Found if the cart item doesn't exist.
//	403 Forbidden if the item doesn't belong to the user's/guest's cart.
//	500 Internal Server Error if backend fails.
func (h *CartHandler) RemoveItem(w http.ResponseWriter, r *http.Request) {
	var userID *uuid.UUID
	var sessionID string

	// Extract user ID from context if authenticated
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user removing item from cart", "user_id", user.ID)
		userID = &user.ID
		// sessionID remains empty for authenticated users
	} else {
		// Fall back to session ID from cookie for guest users
		var hasSessionCookie bool
		sessionID, hasSessionCookie = h.getSessionIDFromCookie(r)
		if !hasSessionCookie {
			utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "A session ID cookie ('session_id') is required for guest carts.")
			h.logger.Debug("Missing session cookie for guest cart remove item request and no authenticated user in context")
			return
		}
		h.logger.Debug("Guest user removing item from cart", "session_id", sessionID)
	}

	itemID, err := ParseUUIDPathParam(w, r, "itemID")
	if err != nil {
		h.logger.Debug("Remove item request failed to parse itemID", "error", err)
		return // Error response already sent by helper
	}

	h.logger.Debug("Handling cart remove item request", "user_id", userID, "session_id", sessionID, "item_id", itemID)

	err = h.cartService.RemoveItemFromCart(r.Context(), userID, sessionID, itemID)
	if err != nil {
		// Log the specific error from the service
		h.logger.Error("Failed to remove item from cart", "user_id", userID, "session_id", sessionID, "item_id", itemID, "error", err)

		// Check for specific known errors
		errMsg := strings.ToLower(err.Error())
		if strings.Contains(errMsg, "not found") {
			utils.SendErrorResponse(w, http.StatusNotFound, "Not Found", "Cart item not found.")
			return
		}
		if strings.Contains(errMsg, "access denied") || strings.Contains(errMsg, "does not belong") {
			utils.SendErrorResponse(w, http.StatusForbidden, "Forbidden", "Access denied: Cannot remove item from another user's/guest's cart.")
			return
		}

		// Generic error for other failures
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to remove item from cart.")
		return
	}

	// If the request was for a guest and we generated a new session ID, set the cookie.
	// Note: This specific endpoint (RemoveItem) might not typically be the first interaction
	// for a guest, so the cookie likely already exists. We only set it if it was missing at the start.
	if userID == nil && !h.hasSessionCookie(r) { // Only for guests who didn't have a cookie initially
		h.setSessionIDCookie(w, sessionID)
	}

	// Successfully removed item - Return 204 No Content
	w.WriteHeader(http.StatusNoContent)
}

// ClearCart removes all items from the current user's or guest's cart.
// Expected Headers: Authorization (Bearer token) for authenticated users.
//
//	Session ID is retrieved from the "session_id" cookie for guest users.
//
// Response: 204 No Content on success. Sets "session_id" cookie if it didn't exist for guests.
//
//	400 Bad Request if session ID is missing (for guests).
//	500 Internal Server Error if backend fails.
func (h *CartHandler) ClearCart(w http.ResponseWriter, r *http.Request) {
	var userID *uuid.UUID
	var sessionID string

	// Extract user ID from context if authenticated
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user clearing cart", "user_id", user.ID)
		userID = &user.ID
		// sessionID remains empty for authenticated users
	} else {
		// Fall back to session ID from cookie for guest users
		var hasSessionCookie bool
		sessionID, hasSessionCookie = h.getSessionIDFromCookie(r)
		if !hasSessionCookie {
			utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "A session ID cookie ('session_id') is required for guest carts.")
			h.logger.Debug("Missing session cookie for guest cart clear request and no authenticated user in context")
			return
		}
		h.logger.Debug("Guest user clearing cart", "session_id", sessionID)
	}

	h.logger.Debug("Handling cart clear request", "user_id", userID, "session_id", sessionID)

	// Call the service to clear the cart (passes userID if present, otherwise sessionID)
	err := h.cartService.ClearCart(r.Context(), userID, sessionID)
	if err != nil {
		// Log the specific error from the service
		h.logger.Error("Failed to clear cart", "user_id", userID, "session_id", sessionID, "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to clear cart.")
		return
	}

	// If the request was for a guest and we generated a new session ID, set the cookie.
	// Note: This specific endpoint (ClearCart) might not typically be the first interaction
	// for a guest, so the cookie likely already exists. We only set it if it was missing at the start.
	if userID == nil && !h.hasSessionCookie(r) { // Only for guests who didn't have a cookie initially
		h.setSessionIDCookie(w, sessionID)
	}

	// Successfully cleared cart - Return 204 No Content
	w.WriteHeader(http.StatusNoContent)
}

// AddBulkItemsToCart adds multiple items to the user's or guest's cart in a single request.
// It expects a JSON body with an array of {product_id, quantity} objects.
func (h *CartHandler) AddBulkItemsToCart(w http.ResponseWriter, r *http.Request) {
	var userID *uuid.UUID
	var sessionID string

	// Extract user ID from context if authenticated
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user adding bulk items to cart", "user_id", user.ID)
		userID = &user.ID
		// sessionID remains empty for authenticated users
	} else {
		// Fall back to session ID from cookie for guest users
		var hasSessionCookie bool
		sessionID, hasSessionCookie = h.getSessionIDFromCookie(r)
		if !hasSessionCookie {
			// Generate a new session ID if the cookie is missing for a guest request
			sessionID = uuid.New().String()
			h.logger.Debug("No session cookie found, generated new session ID for guest bulk add request", "session_id", sessionID)
		}
		h.logger.Debug("Guest user adding bulk items to cart", "session_id", sessionID)
	}

	h.logger.Debug("Handling cart bulk add items request")

	// Parse the request body
	var req models.BulkAddItemRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Invalid JSON body.")
		h.logger.Debug("Failed to decode bulk add items request body", "error", err)
		return
	}

	// Validate the request structure (check for nil or empty items array)
	if req.Items == nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Request body must contain an 'items' array.")
		h.logger.Debug("Bulk add request body missing 'items' array", "request", req)
		return
	}
	if len(req.Items) == 0 {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Request body 'items' array cannot be empty.")
		h.logger.Debug("Bulk add request 'items' array is empty", "request", req)
		return
	}

	h.logger.Debug("Adding bulk items to cart", "user_id", userID, "session_id", sessionID, "num_items", len(req.Items))

	// Call the service to add the items (passes userID if present, otherwise sessionID)
	err = h.cartService.AddBulkItems(r.Context(), userID, sessionID, req.Items)
	if err != nil {
		// Log the specific error from the service
		h.logger.Error("Failed to add bulk items to cart", "user_id", userID, "session_id", sessionID, "num_items", len(req.Items), "error", err)

		// Check for specific known errors like stock issues
		errMsg := strings.ToLower(err.Error())
		if strings.Contains(errMsg, "stock") || strings.Contains(errMsg, "check") {
			utils.SendErrorResponse(w, http.StatusConflict, "Conflict", "Requested quantity for one or more items exceeds available stock or other constraint violated.")
			return
		}

		// Generic error for other failures
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to add items to cart.")
		return
	}

	// If the request was for a guest and we generated a new session ID, set the cookie.
	if userID == nil && !h.hasSessionCookie(r) { // Only for guests who didn't have a cookie initially
		h.setSessionIDCookie(w, sessionID)
	}

	w.WriteHeader(http.StatusOK) // 200 OK indicates successful addition
	fmt.Fprintf(w, "Successfully added %d items to cart", len(req.Items))
}


File: internal/utils/errors.go
================================================
package utils

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

type ErrorResponse struct {
	Type     string                 `json:"type"`
	Title    string                 `json:"title"`
	Status   int                    `json:"status"`
	Detail   string                 `json:"detail"`
	Instance string                 `json:"instance,omitempty"`
	Errors   map[string]interface{} `json:"errors,omitempty"`
}

func SendErrorResponse(w http.ResponseWriter, status int, title, detail string) {
	resp := ErrorResponse{
		Type:   "https://techstore.dev/errors/" + getStatusType(status),
		Title:  title,
		Status: status,
		Detail: detail,
	}

	slog.Warn("Sending error response",
		"status", status,
		"title", title,
		"detail", detail,
	)

	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(resp)
}

func SendValidationError(w http.ResponseWriter, fieldErrors map[string]string) {
	resp := ErrorResponse{
		Type:   "https://techstore.dev/errors/validation-error",
		Title:  "Validation Error",
		Status: http.StatusBadRequest,
		Detail: "One or more fields failed validation",
		Errors: make(map[string]interface{}),
	}

	for field, message := range fieldErrors {
		resp.Errors[field] = map[string]string{"reason": message}
	}

	slog.Warn("Sending validation error response",
		"field_errors", fieldErrors,
	)

	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(resp)
}

func getStatusType(status int) string {
	switch status {
	case http.StatusBadRequest:
		return "bad-request"
	case http.StatusUnauthorized:
		return "unauthorized"
	case http.StatusForbidden:
		return "forbidden"
	case http.StatusNotFound:
		return "not-found"
	case http.StatusConflict:
		return "conflict"
	case http.StatusUnprocessableEntity:
		return "unprocessable-entity"
	default:
		return "server-error"
	}
}


File: internal/services/review_service.go
================================================
package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"tech-store-backend/internal/db"
	"tech-store-backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
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
		Rating:    int32(req.Rating),
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

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit review creation transaction: %w", err)
	}

	apiReview := &models.Review{
		ID:        dbReview.ID,
		UserID:    dbReview.UserID,
		ProductID: dbReview.ProductID,
		Rating:    int(dbReview.Rating),
		CreatedAt: dbReview.CreatedAt.Time,
		UpdatedAt: dbReview.UpdatedAt.Time,
	}

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
		"new_avg_rating", stats.AvgRating,
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
		Rating: int32(req.Rating),
		ID:     reviewID,
		UserID: userID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update review in transaction: %w", err)
	}

	err = s.updateProductReviewStats(ctx, txQuerier, fetchedReview.ProductID)
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
		Rating:    int(dbReview.Rating),
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
			UserID:       r.UserID,
			ReviewerName: *r.ReviewerName,
			ProductID:    r.ProductID,
			Rating:       int(r.Rating),
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
		limit = 20
	}
	if page <= 0 {
		page = 1
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
			UserID:      r.UserID,
			ProductID:   r.ProductID,
			ProductName: r.ProductName,
			Rating:      int(r.Rating),
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


File: internal/services/order_service.go
================================================
package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"tech-store-backend/internal/db"
	"tech-store-backend/internal/models"
	"tech-store-backend/internal/utils"
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

// CreateOrder creates a new order from the user's current cart state.
// It fetches the cart internally, validates state (implicitly through cart fetch),
// calculates the total, creates the order and its items transactionally,
// and clears the cart afterwards.
func (s *OrderService) CreateOrder(ctx context.Context, req models.CreateOrderFromCartRequest, userID uuid.UUID) (*models.OrderWithItems, error) {
	// --- STEP 1: Fetch the current cart state for the user ---
	// This implicitly validates the user has a cart and items in it.
	// The cart summary includes TotalDiscountedValueCents.
	cartSummary, err := s.cartService.GetCartForContext(ctx, &userID, "")
	if err != nil {
		return nil, fmt.Errorf("failed to fetch current cart state for user %s: %w", userID, err)
	}

	if len(cartSummary.Items) == 0 {
		return nil, fmt.Errorf("cannot create order from an empty cart")
	}

	s.logger.Debug("successfully fetched cart summary for order creation", "summary cart id", cartSummary.ID, "user_id", userID)

	// --- STEP 2: Fetch delivery service details ---
	deliveryService, err := s.querier.GetDeliveryServiceByID(ctx, req.DeliveryServiceID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch delivery service with ID %s: %w", req.DeliveryServiceID, err)
	}

	// --- STEP 3: Calculate total amount ---
	// Use the validated total from the cart summary (sum of final discounted prices) + delivery fee
	totalAmountCents := cartSummary.TotalDiscountedValueCents + deliveryService.BaseCostCents

	totalAmountCentsRounded := utils.RoundToDinarCents(totalAmountCents)
	// --- STEP 4: Prepare order creation parameters ---
	createOrderParams := db.CreateOrderParams{
		UserID:            userID,
		UserFullName:      req.ShippingAddress.FullName,
		Status:            "pending",
		TotalAmountCents:  totalAmountCentsRounded,
		PaymentMethod:     "Cash on Delivery", // Or get from req if variable
		Province:          req.ShippingAddress.Province,
		City:              req.ShippingAddress.City,
		PhoneNumber1:      req.ShippingAddress.PhoneNumber1,
		PhoneNumber2:      req.ShippingAddress.PhoneNumber2,
		Notes:             req.Notes,
		DeliveryServiceID: req.DeliveryServiceID,
	}

	// --- STEP 5: TRANSACTION BEGINS ---
	queries, ok := s.querier.(*db.Queries) // Get the concrete type to enable WithTx
	if !ok {
		return nil, errors.New("querier type assertion to *db.Queries failed, cannot create transactional querier")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction for order creation: %w", err)
	}
	// Defer rollback to ensure cleanup on error or panic
	defer func() {
		if rbErr := tx.Rollback(ctx); rbErr != nil && !errors.Is(rbErr, pgx.ErrTxClosed) {
			s.logger.Error("Error during transaction rollback", "error", rbErr)
		}
	}()

	txQuerier := queries.WithTx(tx)

	// 5a. Create the main order record
	dbOrder, err := txQuerier.CreateOrder(ctx, createOrderParams)
	if err != nil {
		return nil, fmt.Errorf("failed to create order record in transaction: %w", err)
	}

	orderID := dbOrder.ID

	// 5b. Insert order items directly from the user's current cart (using the cart ID fetched earlier)
	// This ensures the items are captured exactly as they were in the validated cart state.
	insertOrderItemsFromCartParams := db.InsertOrderItemsFromCartParams{
		OrderID: orderID,
		CartID:  cartSummary.ID, // Use the validated cart ID from the summary
	}
	err = txQuerier.InsertOrderItemsFromCart(ctx, insertOrderItemsFromCartParams)
	if err != nil {
		return nil, fmt.Errorf("failed to insert order items from cart in transaction: %w", err)
	}

	// 5c. Commit the transaction
	err = tx.Commit(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to commit order creation transaction: %w", err)
	}

	// --- STEP 6: Post-Creation Actions (Outside Transaction for Resilience) ---
	// Clear the user's cart after successful order creation
	err = s.cartService.ClearCart(ctx, &userID, "") // Use the userID that placed the order
	if err != nil {
		// Log as a critical error, but don't fail the order creation itself
		s.logger.Error("CRITICAL: Failed to clear user's cart after successful order creation",
			"cart_id", cartSummary.ID, "user_id", userID, "order_id", orderID, "error", err)
	}

	// Fetch and return the newly created order with its items
	createdOrderWithItems, err := s.GetOrder(ctx, orderID)
	if err != nil {
		s.logger.Error("CRITICAL: Failed to fetch newly created order", "order_id", orderID, "error", err)
		// This is critical, as the order exists but couldn't be fetched.
		// Return an error to indicate the inconsistency.
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


File: migrations/00002_create_users_table.sql
================================================
-- +goose Up
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash BYTEA,
    full_name VARCHAR(255),
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;

-- +goose Down
DROP TABLE IF EXISTS users;


File: migrations/00011_create_views_table.sql
================================================
-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE VIEW v_products_with_current_discounts AS
SELECT
    p.id AS product_id,
    p.category_id,
    p.name AS product_name,
    p.slug AS product_slug,
    p.description AS product_description,
    p.short_description AS product_short_description,
    p.price_cents AS original_price_cents,
    p.stock_quantity AS product_stock_quantity,
    p.status AS product_status,
    p.brand AS product_brand,
    p.image_urls AS product_image_urls,
    p.spec_highlights AS product_spec_highlights,
    p.created_at AS product_created_at,
    p.updated_at AS product_updated_at,
    p.deleted_at AS product_deleted_at,
    p.avg_rating,
    p.num_ratings,
    -- Calculate the discounted price based on active discounts
    CASE
        WHEN pd.discount_id IS NOT NULL THEN
            CASE
                WHEN d.discount_type = 'percentage' THEN (p.price_cents * (100 - d.discount_value) / 100)::BIGINT
                ELSE (p.price_cents - d.discount_value)::BIGINT
            END
        ELSE p.price_cents -- No discount, use original price
    END::BIGINT AS discounted_price_cents,
    d.code AS active_discount_code,
    d.discount_type AS active_discount_type,
    d.discount_value AS active_discount_value,
    pd.discount_id IS NOT NULL::BOOLEAN AS has_active_discount
FROM
    products p
LEFT JOIN
    product_discounts pd ON p.id = pd.product_id
LEFT JOIN
    discounts d ON pd.discount_id = d.id AND d.is_active = TRUE AND NOW() BETWEEN d.valid_from AND d.valid_until;

CREATE OR REPLACE VIEW v_products_with_calculated_discounts AS
WITH discount_calculations AS (
    SELECT
        p.id,
        p.price_cents,
        -- Total fixed discount
        COALESCE(
            SUM(
                CASE WHEN d.discount_type = 'fixed' THEN d.discount_value ELSE 0 END
            ) FILTER (WHERE d.is_active AND NOW() BETWEEN d.valid_from AND d.valid_until),
            0
        ) AS total_fixed_discount_cents,
        -- Combined percentage factor
        COALESCE(
            EXP(
                SUM(
                    CASE
                        WHEN d.discount_type = 'percentage' AND d.discount_value < 100
                        THEN LN(1 - d.discount_value / 100.0)
                        ELSE 0
                    END
                ) FILTER (WHERE d.is_active AND NOW() BETWEEN d.valid_from AND d.valid_until)
            ),
            1.0
        ) AS combined_percentage_factor
    FROM
        products p
        LEFT JOIN product_discounts pd ON p.id = pd.product_id
        LEFT JOIN discounts d ON pd.discount_id = d.id
    GROUP BY
        p.id, p.price_cents
)
SELECT
    dc.id AS product_id,
    dc.total_fixed_discount_cents,
    dc.combined_percentage_factor,
    -- Apply discounts once using precomputed values
    ((dc.price_cents - dc.total_fixed_discount_cents) * dc.combined_percentage_factor)::BIGINT AS calculated_discounted_price_cents,
    -- Flag if discount is actually applied
    CASE 
        WHEN ((dc.price_cents - dc.total_fixed_discount_cents) * dc.combined_percentage_factor)::BIGINT < dc.price_cents 
        THEN TRUE 
        ELSE FALSE 
    END AS has_active_discount
FROM
    discount_calculations dc;
-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin
DROP VIEW IF EXISTS v_products_with_current_discounts ;
DROP VIEW IF EXISTS v_products_with_calculated_discounts;
-- +goose StatementEnd


File: db/database.go
================================================
package db

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

var (
	Conn *pgxpool.Pool // Use only the pool, not single connection
)

func Init() error {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		slog.Info("No .env file found, using environment variables")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return fmt.Errorf("DATABASE_URL environment variable is required")
	}

	// Create a connection pool for concurrent operations
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		return fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test the pool connection
	if err = pool.Ping(context.Background()); err != nil {
		pool.Close()
		return fmt.Errorf("failed to ping database: %w", err)
	}

	Conn = pool

	slog.Info("Connected to database successfully with native pgx pool")
	return nil
}

func Close() {
	if Conn != nil {
		Conn.Close()
	}
	slog.Info("Database connection pool closed")
}

// GetPool returns the database connection pool
func GetPool() *pgxpool.Pool {
	return Conn
}


File: internal/db/models.go
================================================
// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.30.0

package db

import (
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type Cart struct {
	ID        uuid.UUID          `json:"id"`
	UserID    uuid.UUID          `json:"user_id"`
	SessionID *string            `json:"session_id"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
	UpdatedAt pgtype.Timestamptz `json:"updated_at"`
	DeletedAt pgtype.Timestamptz `json:"deleted_at"`
}

type CartItem struct {
	ID        uuid.UUID          `json:"id"`
	CartID    uuid.UUID          `json:"cart_id"`
	ProductID uuid.UUID          `json:"product_id"`
	Quantity  int32              `json:"quantity"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
	UpdatedAt pgtype.Timestamptz `json:"updated_at"`
	DeletedAt pgtype.Timestamptz `json:"deleted_at"`
}

type Category struct {
	ID        uuid.UUID          `json:"id"`
	Name      string             `json:"name"`
	Slug      string             `json:"slug"`
	Type      string             `json:"type"`
	ParentID  uuid.UUID          `json:"parent_id"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
}

type CategoryDiscount struct {
	ID         uuid.UUID          `json:"id"`
	CategoryID uuid.UUID          `json:"category_id"`
	DiscountID uuid.UUID          `json:"discount_id"`
	CreatedAt  pgtype.Timestamptz `json:"created_at"`
}

// Stores available delivery service options.
type DeliveryService struct {
	ID uuid.UUID `json:"id"`
	// Unique name identifying the delivery service.
	Name string `json:"name"`
	// Optional description of the delivery service.
	Description *string `json:"description"`
	// Base cost of the delivery service in cents.
	BaseCostCents int64 `json:"base_cost_cents"`
	// Estimated number of days for delivery.
	EstimatedDays *int32 `json:"estimated_days"`
	// Indicates if the delivery service is currently offered.
	IsActive  bool               `json:"is_active"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
	UpdatedAt pgtype.Timestamptz `json:"updated_at"`
}

type Discount struct {
	ID                 uuid.UUID          `json:"id"`
	Code               string             `json:"code"`
	Description        *string            `json:"description"`
	DiscountType       string             `json:"discount_type"`
	DiscountValue      int64              `json:"discount_value"`
	MinOrderValueCents *int64             `json:"min_order_value_cents"`
	MaxUses            *int32             `json:"max_uses"`
	CurrentUses        *int32             `json:"current_uses"`
	ValidFrom          pgtype.Timestamptz `json:"valid_from"`
	ValidUntil         pgtype.Timestamptz `json:"valid_until"`
	IsActive           bool               `json:"is_active"`
	CreatedAt          pgtype.Timestamptz `json:"created_at"`
	UpdatedAt          pgtype.Timestamptz `json:"updated_at"`
}

type Order struct {
	ID                uuid.UUID          `json:"id"`
	UserID            uuid.UUID          `json:"user_id"`
	UserFullName      string             `json:"user_full_name"`
	Status            string             `json:"status"`
	TotalAmountCents  int64              `json:"total_amount_cents"`
	PaymentMethod     string             `json:"payment_method"`
	Province          string             `json:"province"`
	City              string             `json:"city"`
	PhoneNumber1      string             `json:"phone_number_1"`
	PhoneNumber2      *string            `json:"phone_number_2"`
	Notes             *string            `json:"notes"`
	DeliveryServiceID uuid.UUID          `json:"delivery_service_id"`
	CreatedAt         pgtype.Timestamptz `json:"created_at"`
	UpdatedAt         pgtype.Timestamptz `json:"updated_at"`
	CompletedAt       pgtype.Timestamptz `json:"completed_at"`
	CancelledAt       pgtype.Timestamptz `json:"cancelled_at"`
}

type OrderItem struct {
	ID            uuid.UUID          `json:"id"`
	OrderID       uuid.UUID          `json:"order_id"`
	ProductID     uuid.UUID          `json:"product_id"`
	ProductName   string             `json:"product_name"`
	PriceCents    int64              `json:"price_cents"`
	Quantity      int32              `json:"quantity"`
	SubtotalCents *int64             `json:"subtotal_cents"`
	CreatedAt     pgtype.Timestamptz `json:"created_at"`
	UpdatedAt     pgtype.Timestamptz `json:"updated_at"`
}

type Product struct {
	ID               uuid.UUID          `json:"id"`
	CategoryID       uuid.UUID          `json:"category_id"`
	Name             string             `json:"name"`
	Slug             string             `json:"slug"`
	Description      *string            `json:"description"`
	ShortDescription *string            `json:"short_description"`
	PriceCents       int64              `json:"price_cents"`
	StockQuantity    int32              `json:"stock_quantity"`
	Status           string             `json:"status"`
	Brand            string             `json:"brand"`
	AvgRating        pgtype.Numeric     `json:"avg_rating"`
	NumRatings       *int32             `json:"num_ratings"`
	ImageUrls        []byte             `json:"image_urls"`
	SpecHighlights   []byte             `json:"spec_highlights"`
	CreatedAt        pgtype.Timestamptz `json:"created_at"`
	UpdatedAt        pgtype.Timestamptz `json:"updated_at"`
	DeletedAt        pgtype.Timestamptz `json:"deleted_at"`
}

type ProductDiscount struct {
	ID         uuid.UUID          `json:"id"`
	ProductID  uuid.UUID          `json:"product_id"`
	DiscountID uuid.UUID          `json:"discount_id"`
	CreatedAt  pgtype.Timestamptz `json:"created_at"`
}

type RefreshToken struct {
	ID        int32              `json:"id"`
	Jti       string             `json:"jti"`
	UserID    uuid.UUID          `json:"user_id"`
	TokenHash string             `json:"token_hash"`
	ExpiresAt pgtype.Timestamptz `json:"expires_at"`
	RevokedAt pgtype.Timestamptz `json:"revoked_at"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
	UpdatedAt pgtype.Timestamptz `json:"updated_at"`
}

type Review struct {
	ID        uuid.UUID          `json:"id"`
	UserID    uuid.UUID          `json:"user_id"`
	ProductID uuid.UUID          `json:"product_id"`
	Rating    int32              `json:"rating"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
	UpdatedAt pgtype.Timestamptz `json:"updated_at"`
	DeletedAt pgtype.Timestamptz `json:"deleted_at"`
}

type SchemaMigration struct {
	Version   int64              `json:"version"`
	IsApplied bool               `json:"is_applied"`
	AppliedAt pgtype.Timestamptz `json:"applied_at"`
}

type User struct {
	ID           uuid.UUID          `json:"id"`
	Email        string             `json:"email"`
	PasswordHash []byte             `json:"password_hash"`
	FullName     *string            `json:"full_name"`
	IsAdmin      bool               `json:"is_admin"`
	CreatedAt    pgtype.Timestamptz `json:"created_at"`
	UpdatedAt    pgtype.Timestamptz `json:"updated_at"`
	DeletedAt    pgtype.Timestamptz `json:"deleted_at"`
}

type VProductsWithCalculatedDiscount struct {
	ProductID                      uuid.UUID   `json:"product_id"`
	TotalFixedDiscountCents        interface{} `json:"total_fixed_discount_cents"`
	CombinedPercentageFactor       interface{} `json:"combined_percentage_factor"`
	CalculatedDiscountedPriceCents int64       `json:"calculated_discounted_price_cents"`
	HasActiveDiscount              bool        `json:"has_active_discount"`
}

type VProductsWithCurrentDiscount struct {
	ProductID               uuid.UUID          `json:"product_id"`
	CategoryID              uuid.UUID          `json:"category_id"`
	ProductName             string             `json:"product_name"`
	ProductSlug             string             `json:"product_slug"`
	ProductDescription      *string            `json:"product_description"`
	ProductShortDescription *string            `json:"product_short_description"`
	OriginalPriceCents      int64              `json:"original_price_cents"`
	ProductStockQuantity    int32              `json:"product_stock_quantity"`
	ProductStatus           string             `json:"product_status"`
	ProductBrand            string             `json:"product_brand"`
	ProductImageUrls        []byte             `json:"product_image_urls"`
	ProductSpecHighlights   []byte             `json:"product_spec_highlights"`
	ProductCreatedAt        pgtype.Timestamptz `json:"product_created_at"`
	ProductUpdatedAt        pgtype.Timestamptz `json:"product_updated_at"`
	ProductDeletedAt        pgtype.Timestamptz `json:"product_deleted_at"`
	AvgRating               pgtype.Numeric     `json:"avg_rating"`
	NumRatings              *int32             `json:"num_ratings"`
	DiscountedPriceCents    int64              `json:"discounted_price_cents"`
	ActiveDiscountCode      *string            `json:"active_discount_code"`
	ActiveDiscountType      *string            `json:"active_discount_type"`
	ActiveDiscountValue     *int64             `json:"active_discount_value"`
	HasActiveDiscount       bool               `json:"has_active_discount"`
}


File: internal/db/discounts.sql.go
================================================
// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.30.0
// source: discounts.sql

package db

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

const applyDiscountToCategory = `-- name: ApplyDiscountToCategory :exec
INSERT INTO category_discounts (category_id, discount_id)
VALUES ($1, $2)
`

type ApplyDiscountToCategoryParams struct {
	CategoryID uuid.UUID `json:"category_id"`
	DiscountID uuid.UUID `json:"discount_id"`
}

// Associates a discount with a specific category (simplified version, might need more checks).
func (q *Queries) ApplyDiscountToCategory(ctx context.Context, arg ApplyDiscountToCategoryParams) error {
	_, err := q.db.Exec(ctx, applyDiscountToCategory, arg.CategoryID, arg.DiscountID)
	return err
}

const applyDiscountToProduct = `-- name: ApplyDiscountToProduct :exec

INSERT INTO product_discounts (product_id, discount_id)
VALUES ($1, $2)
`

type ApplyDiscountToProductParams struct {
	ProductID  uuid.UUID `json:"product_id"`
	DiscountID uuid.UUID `json:"discount_id"`
}

// Include usage limit check
// Associates a discount with a specific product (simplified version, might need more checks).
func (q *Queries) ApplyDiscountToProduct(ctx context.Context, arg ApplyDiscountToProductParams) error {
	_, err := q.db.Exec(ctx, applyDiscountToProduct, arg.ProductID, arg.DiscountID)
	return err
}

const countDiscounts = `-- name: CountDiscounts :one
SELECT COUNT(*) FROM discounts
WHERE ($1::boolean IS NULL OR is_active = $1) -- Filter by active status if provided
  AND ($2::timestamptz IS NULL OR valid_from <= $2) -- Filter by valid from date if provided
  AND ($3::timestamptz IS NULL OR valid_until >= $3)
`

type CountDiscountsParams struct {
	IsActive  bool               `json:"is_active"`
	FromDate  pgtype.Timestamptz `json:"from_date"`
	UntilDate pgtype.Timestamptz `json:"until_date"`
}

// Counts discounts based on the same filters as ListDiscounts.
func (q *Queries) CountDiscounts(ctx context.Context, arg CountDiscountsParams) (int64, error) {
	row := q.db.QueryRow(ctx, countDiscounts, arg.IsActive, arg.FromDate, arg.UntilDate)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const createDiscount = `-- name: CreateDiscount :one
INSERT INTO discounts (
    code, description, discount_type, discount_value,
    min_order_value_cents, max_uses, valid_from, valid_until, is_active
) VALUES (
    $1, $2, $3, $4,
    $5, $6, $7, $8, $9
) RETURNING id, code, description, discount_type, discount_value, min_order_value_cents, max_uses, current_uses, valid_from, valid_until, is_active, created_at, updated_at
`

type CreateDiscountParams struct {
	Code               string             `json:"code"`
	Description        *string            `json:"description"`
	DiscountType       string             `json:"discount_type"`
	DiscountValue      int64              `json:"discount_value"`
	MinOrderValueCents *int64             `json:"min_order_value_cents"`
	MaxUses            *int32             `json:"max_uses"`
	ValidFrom          pgtype.Timestamptz `json:"valid_from"`
	ValidUntil         pgtype.Timestamptz `json:"valid_until"`
	IsActive           bool               `json:"is_active"`
}

// Inserts a new discount record.
func (q *Queries) CreateDiscount(ctx context.Context, arg CreateDiscountParams) (Discount, error) {
	row := q.db.QueryRow(ctx, createDiscount,
		arg.Code,
		arg.Description,
		arg.DiscountType,
		arg.DiscountValue,
		arg.MinOrderValueCents,
		arg.MaxUses,
		arg.ValidFrom,
		arg.ValidUntil,
		arg.IsActive,
	)
	var i Discount
	err := row.Scan(
		&i.ID,
		&i.Code,
		&i.Description,
		&i.DiscountType,
		&i.DiscountValue,
		&i.MinOrderValueCents,
		&i.MaxUses,
		&i.CurrentUses,
		&i.ValidFrom,
		&i.ValidUntil,
		&i.IsActive,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const deleteDiscount = `-- name: DeleteDiscount :exec
DELETE FROM discounts WHERE id = $1
`

// Deletes a discount record (and associated links via CASCADE).
func (q *Queries) DeleteDiscount(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, deleteDiscount, id)
	return err
}

const getActiveDiscounts = `-- name: GetActiveDiscounts :many

SELECT
    d.id,
    d.code,
    d.description,
    d.discount_type,
    d.discount_value,
    d.min_order_value_cents,
    d.max_uses,
    d.current_uses,
    d.valid_from,
    d.valid_until,
    d.is_active,
    d.created_at,
    d.updated_at
FROM
    discounts d
WHERE
    d.is_active = TRUE AND NOW() BETWEEN d.valid_from AND d.valid_until
    AND (d.max_uses IS NULL OR d.current_uses < d.max_uses)
`

// Check usage limit
// Fetches all currently active discounts (within date range and usage limits).
func (q *Queries) GetActiveDiscounts(ctx context.Context) ([]Discount, error) {
	rows, err := q.db.Query(ctx, getActiveDiscounts)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Discount
	for rows.Next() {
		var i Discount
		if err := rows.Scan(
			&i.ID,
			&i.Code,
			&i.Description,
			&i.DiscountType,
			&i.DiscountValue,
			&i.MinOrderValueCents,
			&i.MaxUses,
			&i.CurrentUses,
			&i.ValidFrom,
			&i.ValidUntil,
			&i.IsActive,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getDiscountByCode = `-- name: GetDiscountByCode :one
SELECT id, code, description, discount_type, discount_value, min_order_value_cents, max_uses, current_uses, valid_from, valid_until, is_active, created_at, updated_at FROM discounts WHERE code = $1 AND is_active = TRUE AND valid_from <= NOW() AND valid_until >= NOW()
`

// Fetches a discount by its unique code.
func (q *Queries) GetDiscountByCode(ctx context.Context, code string) (Discount, error) {
	row := q.db.QueryRow(ctx, getDiscountByCode, code)
	var i Discount
	err := row.Scan(
		&i.ID,
		&i.Code,
		&i.Description,
		&i.DiscountType,
		&i.DiscountValue,
		&i.MinOrderValueCents,
		&i.MaxUses,
		&i.CurrentUses,
		&i.ValidFrom,
		&i.ValidUntil,
		&i.IsActive,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getDiscountByID = `-- name: GetDiscountByID :one
SELECT id, code, description, discount_type, discount_value, min_order_value_cents, max_uses, current_uses, valid_from, valid_until, is_active, created_at, updated_at FROM discounts WHERE id = $1
`

// Fetches a discount by its ID.
func (q *Queries) GetDiscountByID(ctx context.Context, id uuid.UUID) (Discount, error) {
	row := q.db.QueryRow(ctx, getDiscountByID, id)
	var i Discount
	err := row.Scan(
		&i.ID,
		&i.Code,
		&i.Description,
		&i.DiscountType,
		&i.DiscountValue,
		&i.MinOrderValueCents,
		&i.MaxUses,
		&i.CurrentUses,
		&i.ValidFrom,
		&i.ValidUntil,
		&i.IsActive,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getDiscountsByCategoryID = `-- name: GetDiscountsByCategoryID :many
SELECT d.id, d.code, d.description, d.discount_type, d.discount_value, d.min_order_value_cents, d.max_uses, d.current_uses, d.valid_from, d.valid_until, d.is_active, d.created_at, d.updated_at FROM discounts d
JOIN category_discounts cd ON d.id = cd.discount_id
WHERE cd.category_id = $1
  AND d.is_active = TRUE
  AND d.valid_from <= NOW()
  AND d.valid_until >= NOW()
  AND (d.max_uses IS NULL OR d.current_uses < d.max_uses)
`

// Fetches active discounts applicable to a specific category.
func (q *Queries) GetDiscountsByCategoryID(ctx context.Context, categoryID uuid.UUID) ([]Discount, error) {
	rows, err := q.db.Query(ctx, getDiscountsByCategoryID, categoryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Discount
	for rows.Next() {
		var i Discount
		if err := rows.Scan(
			&i.ID,
			&i.Code,
			&i.Description,
			&i.DiscountType,
			&i.DiscountValue,
			&i.MinOrderValueCents,
			&i.MaxUses,
			&i.CurrentUses,
			&i.ValidFrom,
			&i.ValidUntil,
			&i.IsActive,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getDiscountsByProductID = `-- name: GetDiscountsByProductID :many
SELECT d.id, d.code, d.description, d.discount_type, d.discount_value, d.min_order_value_cents, d.max_uses, d.current_uses, d.valid_from, d.valid_until, d.is_active, d.created_at, d.updated_at FROM discounts d
JOIN product_discounts pd ON d.id = pd.discount_id
WHERE pd.product_id = $1
  AND d.is_active = TRUE
  AND d.valid_from <= NOW()
  AND d.valid_until >= NOW()
  AND (d.max_uses IS NULL OR d.current_uses < d.max_uses)
`

// Fetches active discounts applicable to a specific product.
func (q *Queries) GetDiscountsByProductID(ctx context.Context, productID uuid.UUID) ([]Discount, error) {
	rows, err := q.db.Query(ctx, getDiscountsByProductID, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Discount
	for rows.Next() {
		var i Discount
		if err := rows.Scan(
			&i.ID,
			&i.Code,
			&i.Description,
			&i.DiscountType,
			&i.DiscountValue,
			&i.MinOrderValueCents,
			&i.MaxUses,
			&i.CurrentUses,
			&i.ValidFrom,
			&i.ValidUntil,
			&i.IsActive,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const incrementDiscountUsage = `-- name: IncrementDiscountUsage :exec

UPDATE discounts
SET current_uses = current_uses + 1, updated_at = NOW()
WHERE id = $1 AND (max_uses IS NULL OR current_uses < max_uses)
`

// Pagination using limit and offset
// Increments the current_uses count for a specific discount.
// This should ideally be called within a transaction when applying the discount.
func (q *Queries) IncrementDiscountUsage(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, incrementDiscountUsage, id)
	return err
}

const linkCategoryToDiscount = `-- name: LinkCategoryToDiscount :exec

INSERT INTO category_discounts (category_id, discount_id) VALUES ($1, $2)
`

type LinkCategoryToDiscountParams struct {
	CategoryID uuid.UUID `json:"category_id"`
	DiscountID uuid.UUID `json:"discount_id"`
}

// Check usage limit
// Associates a category with a discount.
func (q *Queries) LinkCategoryToDiscount(ctx context.Context, arg LinkCategoryToDiscountParams) error {
	_, err := q.db.Exec(ctx, linkCategoryToDiscount, arg.CategoryID, arg.DiscountID)
	return err
}

const linkProductToDiscount = `-- name: LinkProductToDiscount :exec


INSERT INTO product_discounts (product_id, discount_id) VALUES ($1, $2)
`

type LinkProductToDiscountParams struct {
	ProductID  uuid.UUID `json:"product_id"`
	DiscountID uuid.UUID `json:"discount_id"`
}

// Prevent exceeding max_uses
// --- Link/Unlink Queries ---
// Associates a product with a discount.
func (q *Queries) LinkProductToDiscount(ctx context.Context, arg LinkProductToDiscountParams) error {
	_, err := q.db.Exec(ctx, linkProductToDiscount, arg.ProductID, arg.DiscountID)
	return err
}

const listDiscounts = `-- name: ListDiscounts :many
SELECT id, code, description, discount_type, discount_value, min_order_value_cents, max_uses, current_uses, valid_from, valid_until, is_active, created_at, updated_at FROM discounts
WHERE ($1::boolean IS NULL OR is_active = $1) -- Filter by active status if provided
  AND ($2::timestamptz IS NULL OR valid_from <= $2) -- Filter by valid from date if provided
  AND ($3::timestamptz IS NULL OR valid_until >= $3) -- Filter by valid until date if provided
ORDER BY created_at DESC -- Or another default order
LIMIT $5 OFFSET $4
`

type ListDiscountsParams struct {
	IsActive   bool               `json:"is_active"`
	FromDate   pgtype.Timestamptz `json:"from_date"`
	UntilDate  pgtype.Timestamptz `json:"until_date"`
	PageOffset int32              `json:"page_offset"`
	PageLimit  int32              `json:"page_limit"`
}

// Fetches a list of discounts, potentially with filters and pagination.
func (q *Queries) ListDiscounts(ctx context.Context, arg ListDiscountsParams) ([]Discount, error) {
	rows, err := q.db.Query(ctx, listDiscounts,
		arg.IsActive,
		arg.FromDate,
		arg.UntilDate,
		arg.PageOffset,
		arg.PageLimit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Discount
	for rows.Next() {
		var i Discount
		if err := rows.Scan(
			&i.ID,
			&i.Code,
			&i.Description,
			&i.DiscountType,
			&i.DiscountValue,
			&i.MinOrderValueCents,
			&i.MaxUses,
			&i.CurrentUses,
			&i.ValidFrom,
			&i.ValidUntil,
			&i.IsActive,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const unlinkCategoryFromDiscount = `-- name: UnlinkCategoryFromDiscount :exec
DELETE FROM category_discounts WHERE category_id = $1 AND discount_id = $2
`

type UnlinkCategoryFromDiscountParams struct {
	CategoryID uuid.UUID `json:"category_id"`
	DiscountID uuid.UUID `json:"discount_id"`
}

// Removes association between a category and a discount.
func (q *Queries) UnlinkCategoryFromDiscount(ctx context.Context, arg UnlinkCategoryFromDiscountParams) error {
	_, err := q.db.Exec(ctx, unlinkCategoryFromDiscount, arg.CategoryID, arg.DiscountID)
	return err
}

const unlinkProductFromDiscount = `-- name: UnlinkProductFromDiscount :exec
DELETE FROM product_discounts WHERE product_id = $1 AND discount_id = $2
`

type UnlinkProductFromDiscountParams struct {
	ProductID  uuid.UUID `json:"product_id"`
	DiscountID uuid.UUID `json:"discount_id"`
}

// Removes association between a product and a discount.
func (q *Queries) UnlinkProductFromDiscount(ctx context.Context, arg UnlinkProductFromDiscountParams) error {
	_, err := q.db.Exec(ctx, unlinkProductFromDiscount, arg.ProductID, arg.DiscountID)
	return err
}

const updateDiscount = `-- name: UpdateDiscount :one
UPDATE discounts
SET code = $2,
    description = $3,
    discount_type = $4,
    discount_value = $5,
    min_order_value_cents = $6,
    max_uses = $7,
    valid_from = $8,
    valid_until = $9,
    is_active = $10,
    updated_at = NOW()
WHERE id = $1
RETURNING id, code, description, discount_type, discount_value, min_order_value_cents, max_uses, current_uses, valid_from, valid_until, is_active, created_at, updated_at
`

type UpdateDiscountParams struct {
	ID                 uuid.UUID          `json:"id"`
	Code               string             `json:"code"`
	Description        *string            `json:"description"`
	DiscountType       string             `json:"discount_type"`
	DiscountValue      int64              `json:"discount_value"`
	MinOrderValueCents *int64             `json:"min_order_value_cents"`
	MaxUses            *int32             `json:"max_uses"`
	ValidFrom          pgtype.Timestamptz `json:"valid_from"`
	ValidUntil         pgtype.Timestamptz `json:"valid_until"`
	IsActive           bool               `json:"is_active"`
}

// Updates an existing discount record.
func (q *Queries) UpdateDiscount(ctx context.Context, arg UpdateDiscountParams) (Discount, error) {
	row := q.db.QueryRow(ctx, updateDiscount,
		arg.ID,
		arg.Code,
		arg.Description,
		arg.DiscountType,
		arg.DiscountValue,
		arg.MinOrderValueCents,
		arg.MaxUses,
		arg.ValidFrom,
		arg.ValidUntil,
		arg.IsActive,
	)
	var i Discount
	err := row.Scan(
		&i.ID,
		&i.Code,
		&i.Description,
		&i.DiscountType,
		&i.DiscountValue,
		&i.MinOrderValueCents,
		&i.MaxUses,
		&i.CurrentUses,
		&i.ValidFrom,
		&i.ValidUntil,
		&i.IsActive,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}


File: internal/db/products.sql.go
================================================
// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.30.0
// source: products.sql

package db

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

const checkSlugExists = `-- name: CheckSlugExists :one
SELECT EXISTS(SELECT 1 FROM products WHERE slug = $1 AND deleted_at IS NULL) AS exists
`

// Checks if a product slug already exists (excluding soft-deleted products).
func (q *Queries) CheckSlugExists(ctx context.Context, slug string) (bool, error) {
	row := q.db.QueryRow(ctx, checkSlugExists, slug)
	var exists bool
	err := row.Scan(&exists)
	return exists, err
}

const countAllProducts = `-- name: CountAllProducts :one
SELECT COUNT(*) FROM products WHERE deleted_at IS NULL
`

func (q *Queries) CountAllProducts(ctx context.Context) (int64, error) {
	row := q.db.QueryRow(ctx, countAllProducts)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const countProducts = `-- name: CountProducts :one
SELECT COUNT(*) FROM products p
LEFT JOIN v_products_with_calculated_discounts vpcd ON p.id = vpcd.product_id
WHERE p.deleted_at IS NULL
    -- Main text search filter (name, description)
    AND (
        $1::TEXT = '' 
        OR p.name ILIKE '%' || $1 || '%' 
        OR COALESCE(p.short_description, '') ILIKE '%' || $1 || '%' 
        OR to_tsvector('english', p.name || ' ' || COALESCE(p.short_description, '')) @@ plainto_tsquery('english', $1)
        OR p.spec_highlights::TEXT ILIKE '%' || $1 || '%'
    )
    -- Spec highlight filter: Check if apply_spec_filter is true, then match the value for the given key
    AND (NOT $2::BOOLEAN OR ($3::TEXT != '' AND p.spec_highlights ->> $3 ILIKE '%' || $4 || '%'))
    -- Category filter
    AND ($5::UUID = '00000000-0000-0000-0000-000000000000' OR p.category_id = $5)
    -- Brand filter
    AND ($6::TEXT = '' OR p.brand ILIKE '%' || $6 || '%')
    -- Price range filter
    AND ($7::BIGINT = 0 OR p.price_cents >= $7)
    AND ($8::BIGINT = 0 OR p.price_cents <= $8)
    -- Stock availability filter
    AND (
        ($9::BOOLEAN = false AND $9 IS NOT NULL)
        OR ($9 = true AND p.stock_quantity > 0)
        OR ($9 = false AND p.stock_quantity <= 0)
    )
    -- Discount filter
    AND ($10::BOOLEAN = false OR vpcd.has_active_discount = TRUE)
`

type CountProductsParams struct {
	Query                 string    `json:"query"`
	ApplySpecFilter       bool      `json:"apply_spec_filter"`
	SpecFilterKey         string    `json:"spec_filter_key"`
	SpecFilterValue       *string   `json:"spec_filter_value"`
	CategoryID            uuid.UUID `json:"category_id"`
	Brand                 string    `json:"brand"`
	MinPrice              int64     `json:"min_price"`
	MaxPrice              int64     `json:"max_price"`
	InStockOnly           bool      `json:"in_stock_only"`
	IncludeDiscountedOnly bool      `json:"include_discounted_only"`
}

func (q *Queries) CountProducts(ctx context.Context, arg CountProductsParams) (int64, error) {
	row := q.db.QueryRow(ctx, countProducts,
		arg.Query,
		arg.ApplySpecFilter,
		arg.SpecFilterKey,
		arg.SpecFilterValue,
		arg.CategoryID,
		arg.Brand,
		arg.MinPrice,
		arg.MaxPrice,
		arg.InStockOnly,
		arg.IncludeDiscountedOnly,
	)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const createProduct = `-- name: CreateProduct :one
INSERT INTO products (
    category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
) VALUES (
    $1, 
    $2, 
    $3, 
    $4, 
    $5, 
    $6, 
    $7, 
    $8, 
    $9, 
    $10, 
    $11, 
    NOW(), -- created_at
    NOW()  -- updated_at
) 
RETURNING  id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at
`

type CreateProductParams struct {
	CategoryID       uuid.UUID `json:"category_id"`
	Name             string    `json:"name"`
	Slug             string    `json:"slug"`
	Description      *string   `json:"description"`
	ShortDescription *string   `json:"short_description"`
	PriceCents       int64     `json:"price_cents"`
	StockQuantity    int32     `json:"stock_quantity"`
	Status           string    `json:"status"`
	Brand            string    `json:"brand"`
	ImageUrls        []byte    `json:"image_urls"`
	SpecHighlights   []byte    `json:"spec_highlights"`
}

func (q *Queries) CreateProduct(ctx context.Context, arg CreateProductParams) (Product, error) {
	row := q.db.QueryRow(ctx, createProduct,
		arg.CategoryID,
		arg.Name,
		arg.Slug,
		arg.Description,
		arg.ShortDescription,
		arg.PriceCents,
		arg.StockQuantity,
		arg.Status,
		arg.Brand,
		arg.ImageUrls,
		arg.SpecHighlights,
	)
	var i Product
	err := row.Scan(
		&i.ID,
		&i.CategoryID,
		&i.Name,
		&i.Slug,
		&i.Description,
		&i.ShortDescription,
		&i.PriceCents,
		&i.StockQuantity,
		&i.Status,
		&i.Brand,
		&i.AvgRating,
		&i.NumRatings,
		&i.ImageUrls,
		&i.SpecHighlights,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.DeletedAt,
	)
	return i, err
}

const deleteProduct = `-- name: DeleteProduct :exec
UPDATE products
SET deleted_at = NOW()
WHERE id = $1
`

func (q *Queries) DeleteProduct(ctx context.Context, productID uuid.UUID) error {
	_, err := q.db.Exec(ctx, deleteProduct, productID)
	return err
}

const getCategory = `-- name: GetCategory :one
SELECT id, name, slug, type, parent_id, created_at
FROM categories
WHERE id = $1
`

func (q *Queries) GetCategory(ctx context.Context, categoryID uuid.UUID) (Category, error) {
	row := q.db.QueryRow(ctx, getCategory, categoryID)
	var i Category
	err := row.Scan(
		&i.ID,
		&i.Name,
		&i.Slug,
		&i.Type,
		&i.ParentID,
		&i.CreatedAt,
	)
	return i, err
}

const getCategoryBySlug = `-- name: GetCategoryBySlug :one
SELECT id, name, slug, type, parent_id, created_at
FROM categories
WHERE slug = $1
`

func (q *Queries) GetCategoryBySlug(ctx context.Context, slug string) (Category, error) {
	row := q.db.QueryRow(ctx, getCategoryBySlug, slug)
	var i Category
	err := row.Scan(
		&i.ID,
		&i.Name,
		&i.Slug,
		&i.Type,
		&i.ParentID,
		&i.CreatedAt,
	)
	return i, err
}

const getProduct = `-- name: GetProduct :one
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE id = $1 AND deleted_at IS NULL
`

func (q *Queries) GetProduct(ctx context.Context, productID uuid.UUID) (Product, error) {
	row := q.db.QueryRow(ctx, getProduct, productID)
	var i Product
	err := row.Scan(
		&i.ID,
		&i.CategoryID,
		&i.Name,
		&i.Slug,
		&i.Description,
		&i.ShortDescription,
		&i.PriceCents,
		&i.StockQuantity,
		&i.Status,
		&i.Brand,
		&i.AvgRating,
		&i.NumRatings,
		&i.ImageUrls,
		&i.SpecHighlights,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.DeletedAt,
	)
	return i, err
}

const getProductBySlug = `-- name: GetProductBySlug :one
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE slug = $1 AND deleted_at IS NULL
`

func (q *Queries) GetProductBySlug(ctx context.Context, slug string) (Product, error) {
	row := q.db.QueryRow(ctx, getProductBySlug, slug)
	var i Product
	err := row.Scan(
		&i.ID,
		&i.CategoryID,
		&i.Name,
		&i.Slug,
		&i.Description,
		&i.ShortDescription,
		&i.PriceCents,
		&i.StockQuantity,
		&i.Status,
		&i.Brand,
		&i.AvgRating,
		&i.NumRatings,
		&i.ImageUrls,
		&i.SpecHighlights,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.DeletedAt,
	)
	return i, err
}

const listCategories = `-- name: ListCategories :many
SELECT id, name, slug, type, parent_id, created_at
FROM categories
ORDER BY name
`

func (q *Queries) ListCategories(ctx context.Context) ([]Category, error) {
	rows, err := q.db.Query(ctx, listCategories)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Category
	for rows.Next() {
		var i Category
		if err := rows.Scan(
			&i.ID,
			&i.Name,
			&i.Slug,
			&i.Type,
			&i.ParentID,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listProducts = `-- name: ListProducts :many
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2 OFFSET $1
`

type ListProductsParams struct {
	PageOffset int32 `json:"page_offset"`
	PageLimit  int32 `json:"page_limit"`
}

func (q *Queries) ListProducts(ctx context.Context, arg ListProductsParams) ([]Product, error) {
	rows, err := q.db.Query(ctx, listProducts, arg.PageOffset, arg.PageLimit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Product
	for rows.Next() {
		var i Product
		if err := rows.Scan(
			&i.ID,
			&i.CategoryID,
			&i.Name,
			&i.Slug,
			&i.Description,
			&i.ShortDescription,
			&i.PriceCents,
			&i.StockQuantity,
			&i.Status,
			&i.Brand,
			&i.AvgRating,
			&i.NumRatings,
			&i.ImageUrls,
			&i.SpecHighlights,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.DeletedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listProductsByCategory = `-- name: ListProductsByCategory :many
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE category_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $3 OFFSET $2
`

type ListProductsByCategoryParams struct {
	CategoryID uuid.UUID `json:"category_id"`
	PageOffset int32     `json:"page_offset"`
	PageLimit  int32     `json:"page_limit"`
}

func (q *Queries) ListProductsByCategory(ctx context.Context, arg ListProductsByCategoryParams) ([]Product, error) {
	rows, err := q.db.Query(ctx, listProductsByCategory, arg.CategoryID, arg.PageOffset, arg.PageLimit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Product
	for rows.Next() {
		var i Product
		if err := rows.Scan(
			&i.ID,
			&i.CategoryID,
			&i.Name,
			&i.Slug,
			&i.Description,
			&i.ShortDescription,
			&i.PriceCents,
			&i.StockQuantity,
			&i.Status,
			&i.Brand,
			&i.AvgRating,
			&i.NumRatings,
			&i.ImageUrls,
			&i.SpecHighlights,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.DeletedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listProductsWithCategory = `-- name: ListProductsWithCategory :many
SELECT 
    p.id, p.category_id, p.name, p.slug, p.description, p.short_description, p.price_cents, p.stock_quantity, p.status, p.brand, p.avg_rating, p.num_ratings, p.image_urls, p.spec_highlights, p.created_at, p.updated_at, p.deleted_at,
    c.name as category_name,
    c.slug as category_slug,
    c.type as category_type
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT $2 OFFSET $1
`

type ListProductsWithCategoryParams struct {
	PageOffset int32 `json:"page_offset"`
	PageLimit  int32 `json:"page_limit"`
}

type ListProductsWithCategoryRow struct {
	Product      Product `json:"product"`
	CategoryName *string `json:"category_name"`
	CategorySlug *string `json:"category_slug"`
	CategoryType *string `json:"category_type"`
}

func (q *Queries) ListProductsWithCategory(ctx context.Context, arg ListProductsWithCategoryParams) ([]ListProductsWithCategoryRow, error) {
	rows, err := q.db.Query(ctx, listProductsWithCategory, arg.PageOffset, arg.PageLimit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListProductsWithCategoryRow
	for rows.Next() {
		var i ListProductsWithCategoryRow
		if err := rows.Scan(
			&i.Product.ID,
			&i.Product.CategoryID,
			&i.Product.Name,
			&i.Product.Slug,
			&i.Product.Description,
			&i.Product.ShortDescription,
			&i.Product.PriceCents,
			&i.Product.StockQuantity,
			&i.Product.Status,
			&i.Product.Brand,
			&i.Product.AvgRating,
			&i.Product.NumRatings,
			&i.Product.ImageUrls,
			&i.Product.SpecHighlights,
			&i.Product.CreatedAt,
			&i.Product.UpdatedAt,
			&i.Product.DeletedAt,
			&i.CategoryName,
			&i.CategorySlug,
			&i.CategoryType,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listProductsWithCategoryDetail = `-- name: ListProductsWithCategoryDetail :many
SELECT 
    p.id, p.category_id, p.name, p.slug, p.description, p.short_description, p.price_cents, p.stock_quantity, p.status, p.brand, p.avg_rating, p.num_ratings, p.image_urls, p.spec_highlights, p.created_at, p.updated_at, p.deleted_at,
    c.id, c.name, c.slug, c.type, c.parent_id, c.created_at
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.category_id = $1 AND p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT $3 OFFSET $2
`

type ListProductsWithCategoryDetailParams struct {
	CategoryID uuid.UUID `json:"category_id"`
	PageOffset int32     `json:"page_offset"`
	PageLimit  int32     `json:"page_limit"`
}

type ListProductsWithCategoryDetailRow struct {
	Product  Product  `json:"product"`
	Category Category `json:"category"`
}

func (q *Queries) ListProductsWithCategoryDetail(ctx context.Context, arg ListProductsWithCategoryDetailParams) ([]ListProductsWithCategoryDetailRow, error) {
	rows, err := q.db.Query(ctx, listProductsWithCategoryDetail, arg.CategoryID, arg.PageOffset, arg.PageLimit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListProductsWithCategoryDetailRow
	for rows.Next() {
		var i ListProductsWithCategoryDetailRow
		if err := rows.Scan(
			&i.Product.ID,
			&i.Product.CategoryID,
			&i.Product.Name,
			&i.Product.Slug,
			&i.Product.Description,
			&i.Product.ShortDescription,
			&i.Product.PriceCents,
			&i.Product.StockQuantity,
			&i.Product.Status,
			&i.Product.Brand,
			&i.Product.AvgRating,
			&i.Product.NumRatings,
			&i.Product.ImageUrls,
			&i.Product.SpecHighlights,
			&i.Product.CreatedAt,
			&i.Product.UpdatedAt,
			&i.Product.DeletedAt,
			&i.Category.ID,
			&i.Category.Name,
			&i.Category.Slug,
			&i.Category.Type,
			&i.Category.ParentID,
			&i.Category.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const searchProductsWithCategory = `-- name: SearchProductsWithCategory :many
SELECT 
    p.id, p.category_id, p.name, p.slug, p.description, p.short_description, p.price_cents, p.stock_quantity, p.status, p.brand, p.avg_rating, p.num_ratings, p.image_urls, p.spec_highlights, p.created_at, p.updated_at, p.deleted_at,
    c.name as category_name,
    c.slug as category_slug,
    c.type as category_type
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.deleted_at IS NULL
  AND ($1::TEXT = '' OR p.name ILIKE '%' || $1 || '%' OR COALESCE(p.short_description, '') ILIKE '%' || $1 || '%' OR to_tsvector('english', p.name || ' ' || COALESCE(p.short_description, '')) @@ plainto_tsquery('english', $1))
  AND ($2::UUID = '00000000-0000-0000-0000-000000000000' OR p.category_id = $2)
  AND ($3::TEXT = '' OR p.brand ILIKE '%' || $3 || '%')
  AND ($4::BIGINT = 0 OR p.price_cents >= $4)
  AND ($5::BIGINT = 0 OR p.price_cents <= $5)
  AND (($6::BOOLEAN = false AND $6 IS NOT NULL) OR ($6 = true AND p.stock_quantity > 0) OR ($6 = false AND p.stock_quantity <= 0))
ORDER BY p.created_at DESC
LIMIT $8 OFFSET $7
`

type SearchProductsWithCategoryParams struct {
	Query       string    `json:"query"`
	CategoryID  uuid.UUID `json:"category_id"`
	Brand       string    `json:"brand"`
	MinPrice    int64     `json:"min_price"`
	MaxPrice    int64     `json:"max_price"`
	InStockOnly bool      `json:"in_stock_only"`
	PageOffset  int32     `json:"page_offset"`
	PageLimit   int32     `json:"page_limit"`
}

type SearchProductsWithCategoryRow struct {
	Product      Product `json:"product"`
	CategoryName *string `json:"category_name"`
	CategorySlug *string `json:"category_slug"`
	CategoryType *string `json:"category_type"`
}

func (q *Queries) SearchProductsWithCategory(ctx context.Context, arg SearchProductsWithCategoryParams) ([]SearchProductsWithCategoryRow, error) {
	rows, err := q.db.Query(ctx, searchProductsWithCategory,
		arg.Query,
		arg.CategoryID,
		arg.Brand,
		arg.MinPrice,
		arg.MaxPrice,
		arg.InStockOnly,
		arg.PageOffset,
		arg.PageLimit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []SearchProductsWithCategoryRow
	for rows.Next() {
		var i SearchProductsWithCategoryRow
		if err := rows.Scan(
			&i.Product.ID,
			&i.Product.CategoryID,
			&i.Product.Name,
			&i.Product.Slug,
			&i.Product.Description,
			&i.Product.ShortDescription,
			&i.Product.PriceCents,
			&i.Product.StockQuantity,
			&i.Product.Status,
			&i.Product.Brand,
			&i.Product.AvgRating,
			&i.Product.NumRatings,
			&i.Product.ImageUrls,
			&i.Product.SpecHighlights,
			&i.Product.CreatedAt,
			&i.Product.UpdatedAt,
			&i.Product.DeletedAt,
			&i.CategoryName,
			&i.CategorySlug,
			&i.CategoryType,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const searchProductsWithDiscounts = `-- name: SearchProductsWithDiscounts :many
SELECT
    p.id,
    p.category_id,
    c.name AS category_name,
    p.name,
    p.slug,
    p.description,
    p.short_description,
    p.price_cents AS original_price_cents,
    p.stock_quantity,
    p.status,
    p.brand,
    p.image_urls,
    p.spec_highlights,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    p.avg_rating,
    p.num_ratings,
    vpcd.total_fixed_discount_cents::BIGINT,
    vpcd.combined_percentage_factor::FLOAT,
    COALESCE(vpcd.calculated_discounted_price_cents, p.price_cents) AS discounted_price_cents,
    -- Use the has_active_discount boolean directly from the view
    COALESCE(vpcd.has_active_discount, FALSE) AS has_active_discount
FROM
    products p
INNER JOIN categories c ON p.category_id = c.id -- Join with categories table
LEFT JOIN
    v_products_with_calculated_discounts vpcd ON p.id = vpcd.product_id
WHERE
    p.deleted_at IS NULL
    -- Main text search filter (name, description)
    AND (
        $1::TEXT = '' 
        OR p.name ILIKE '%' || $1 || '%' 
        OR COALESCE(p.short_description, '') ILIKE '%' || $1 || '%' 
        OR to_tsvector('english', p.name || ' ' || COALESCE(p.short_description, '')) @@ plainto_tsquery('english', $1)
        OR p.spec_highlights::TEXT ILIKE '%' || $1 || '%'
    )
    -- Spec highlight filter: Check if apply_spec_filter is true, then match the value for the given key
    AND (NOT $2::BOOLEAN OR ($3::TEXT != '' AND p.spec_highlights ->> $3 ILIKE '%' || $4 || '%'))
    -- Category filter
    AND ($5::UUID = '00000000-0000-0000-0000-000000000000' OR p.category_id = $5)
    -- Brand filter
    AND ($6::TEXT = '' OR p.brand ILIKE '%' || $6 || '%')
    -- Price range filter
    AND ($7::BIGINT = 0 OR p.price_cents >= $7)
    AND ($8::BIGINT = 0 OR p.price_cents <= $8)
    -- Stock availability filter
    AND (
        ($9::BOOLEAN = false AND $9 IS NOT NULL)
        OR ($9 = true AND p.stock_quantity > 0)
        OR ($9 = false AND p.stock_quantity <= 0)
    )
    -- Discount filter
    AND ($10::BOOLEAN = false OR vpcd.has_active_discount = TRUE)
ORDER BY
    p.created_at DESC
LIMIT $12 OFFSET $11
`

type SearchProductsWithDiscountsParams struct {
	Query                 string    `json:"query"`
	ApplySpecFilter       bool      `json:"apply_spec_filter"`
	SpecFilterKey         string    `json:"spec_filter_key"`
	SpecFilterValue       *string   `json:"spec_filter_value"`
	CategoryID            uuid.UUID `json:"category_id"`
	Brand                 string    `json:"brand"`
	MinPrice              int64     `json:"min_price"`
	MaxPrice              int64     `json:"max_price"`
	InStockOnly           bool      `json:"in_stock_only"`
	IncludeDiscountedOnly bool      `json:"include_discounted_only"`
	PageOffset            int32     `json:"page_offset"`
	PageLimit             int32     `json:"page_limit"`
}

type SearchProductsWithDiscountsRow struct {
	ID                           uuid.UUID          `json:"id"`
	CategoryID                   uuid.UUID          `json:"category_id"`
	CategoryName                 string             `json:"category_name"`
	Name                         string             `json:"name"`
	Slug                         string             `json:"slug"`
	Description                  *string            `json:"description"`
	ShortDescription             *string            `json:"short_description"`
	OriginalPriceCents           int64              `json:"original_price_cents"`
	StockQuantity                int32              `json:"stock_quantity"`
	Status                       string             `json:"status"`
	Brand                        string             `json:"brand"`
	ImageUrls                    []byte             `json:"image_urls"`
	SpecHighlights               []byte             `json:"spec_highlights"`
	CreatedAt                    pgtype.Timestamptz `json:"created_at"`
	UpdatedAt                    pgtype.Timestamptz `json:"updated_at"`
	DeletedAt                    pgtype.Timestamptz `json:"deleted_at"`
	AvgRating                    pgtype.Numeric     `json:"avg_rating"`
	NumRatings                   *int32             `json:"num_ratings"`
	VpcdTotalFixedDiscountCents  int64              `json:"vpcd_total_fixed_discount_cents"`
	VpcdCombinedPercentageFactor float64            `json:"vpcd_combined_percentage_factor"`
	DiscountedPriceCents         int64              `json:"discounted_price_cents"`
	HasActiveDiscount            bool               `json:"has_active_discount"`
}

// Searches for products and includes pre-calculated discount information using the view.
// Includes a flexible spec highlight filter for partial matching within values.
func (q *Queries) SearchProductsWithDiscounts(ctx context.Context, arg SearchProductsWithDiscountsParams) ([]SearchProductsWithDiscountsRow, error) {
	rows, err := q.db.Query(ctx, searchProductsWithDiscounts,
		arg.Query,
		arg.ApplySpecFilter,
		arg.SpecFilterKey,
		arg.SpecFilterValue,
		arg.CategoryID,
		arg.Brand,
		arg.MinPrice,
		arg.MaxPrice,
		arg.InStockOnly,
		arg.IncludeDiscountedOnly,
		arg.PageOffset,
		arg.PageLimit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []SearchProductsWithDiscountsRow
	for rows.Next() {
		var i SearchProductsWithDiscountsRow
		if err := rows.Scan(
			&i.ID,
			&i.CategoryID,
			&i.CategoryName,
			&i.Name,
			&i.Slug,
			&i.Description,
			&i.ShortDescription,
			&i.OriginalPriceCents,
			&i.StockQuantity,
			&i.Status,
			&i.Brand,
			&i.ImageUrls,
			&i.SpecHighlights,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.DeletedAt,
			&i.AvgRating,
			&i.NumRatings,
			&i.VpcdTotalFixedDiscountCents,
			&i.VpcdCombinedPercentageFactor,
			&i.DiscountedPriceCents,
			&i.HasActiveDiscount,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const updateProduct = `-- name: UpdateProduct :one
UPDATE products
SET
    category_id = COALESCE($1, category_id),
    name = COALESCE($2, name),
    slug = COALESCE($3, slug),
    description = COALESCE($4, description),
    short_description = COALESCE($5, short_description),
    price_cents = COALESCE($6, price_cents),
    stock_quantity = COALESCE($7, stock_quantity),
    status = COALESCE($8, status),
    brand = COALESCE($9, brand),
    image_urls = COALESCE($10, image_urls),
    spec_highlights = COALESCE($11, spec_highlights),
    updated_at = NOW()
WHERE id = $12 AND deleted_at IS NULL
RETURNING  id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at
`

type UpdateProductParams struct {
	CategoryID       uuid.UUID `json:"category_id"`
	Name             string    `json:"name"`
	Slug             string    `json:"slug"`
	Description      *string   `json:"description"`
	ShortDescription *string   `json:"short_description"`
	PriceCents       int64     `json:"price_cents"`
	StockQuantity    int32     `json:"stock_quantity"`
	Status           string    `json:"status"`
	Brand            string    `json:"brand"`
	ImageUrls        []byte    `json:"image_urls"`
	SpecHighlights   []byte    `json:"spec_highlights"`
	ProductID        uuid.UUID `json:"product_id"`
}

func (q *Queries) UpdateProduct(ctx context.Context, arg UpdateProductParams) (Product, error) {
	row := q.db.QueryRow(ctx, updateProduct,
		arg.CategoryID,
		arg.Name,
		arg.Slug,
		arg.Description,
		arg.ShortDescription,
		arg.PriceCents,
		arg.StockQuantity,
		arg.Status,
		arg.Brand,
		arg.ImageUrls,
		arg.SpecHighlights,
		arg.ProductID,
	)
	var i Product
	err := row.Scan(
		&i.ID,
		&i.CategoryID,
		&i.Name,
		&i.Slug,
		&i.Description,
		&i.ShortDescription,
		&i.PriceCents,
		&i.StockQuantity,
		&i.Status,
		&i.Brand,
		&i.AvgRating,
		&i.NumRatings,
		&i.ImageUrls,
		&i.SpecHighlights,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.DeletedAt,
	)
	return i, err
}


File: internal/db/delivery_services.sql.go
================================================
// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.30.0
// source: delivery_services.sql

package db

import (
	"context"

	"github.com/google/uuid"
)

const createDeliveryService = `-- name: CreateDeliveryService :one
INSERT INTO delivery_services (
    name, description, base_cost_cents, estimated_days, is_active
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at
`

type CreateDeliveryServiceParams struct {
	Name          string  `json:"name"`
	Description   *string `json:"description"`
	BaseCostCents int64   `json:"base_cost_cents"`
	EstimatedDays *int32  `json:"estimated_days"`
	IsActive      bool    `json:"is_active"`
}

func (q *Queries) CreateDeliveryService(ctx context.Context, arg CreateDeliveryServiceParams) (DeliveryService, error) {
	row := q.db.QueryRow(ctx, createDeliveryService,
		arg.Name,
		arg.Description,
		arg.BaseCostCents,
		arg.EstimatedDays,
		arg.IsActive,
	)
	var i DeliveryService
	err := row.Scan(
		&i.ID,
		&i.Name,
		&i.Description,
		&i.BaseCostCents,
		&i.EstimatedDays,
		&i.IsActive,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const deleteDeliveryService = `-- name: DeleteDeliveryService :exec
DELETE FROM delivery_services WHERE id = $1
`

// Soft delete could be achieved by updating is_active to FALSE
// For hard delete:
func (q *Queries) DeleteDeliveryService(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, deleteDeliveryService, id)
	return err
}

const getActiveDeliveryServices = `-- name: GetActiveDeliveryServices :many
SELECT id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at
FROM delivery_services
WHERE is_active = TRUE
ORDER BY name ASC
`

// Retrieves all delivery services that are currently active.
// Suitable for user-facing contexts like checkout.
func (q *Queries) GetActiveDeliveryServices(ctx context.Context) ([]DeliveryService, error) {
	rows, err := q.db.Query(ctx, getActiveDeliveryServices)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []DeliveryService
	for rows.Next() {
		var i DeliveryService
		if err := rows.Scan(
			&i.ID,
			&i.Name,
			&i.Description,
			&i.BaseCostCents,
			&i.EstimatedDays,
			&i.IsActive,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getDeliveryService = `-- name: GetDeliveryService :one
SELECT id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at
FROM delivery_services
WHERE id = $1 AND is_active = $2
`

type GetDeliveryServiceParams struct {
	ID           uuid.UUID `json:"id"`
	ActiveFilter bool      `json:"active_filter"`
}

func (q *Queries) GetDeliveryService(ctx context.Context, arg GetDeliveryServiceParams) (DeliveryService, error) {
	row := q.db.QueryRow(ctx, getDeliveryService, arg.ID, arg.ActiveFilter)
	var i DeliveryService
	err := row.Scan(
		&i.ID,
		&i.Name,
		&i.Description,
		&i.BaseCostCents,
		&i.EstimatedDays,
		&i.IsActive,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getDeliveryServiceByID = `-- name: GetDeliveryServiceByID :one
SELECT id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at
FROM delivery_services
WHERE id = $1
`

// Retrieves a delivery service by its ID, regardless of its active status.
// Suitable for admin operations.
func (q *Queries) GetDeliveryServiceByID(ctx context.Context, id uuid.UUID) (DeliveryService, error) {
	row := q.db.QueryRow(ctx, getDeliveryServiceByID, id)
	var i DeliveryService
	err := row.Scan(
		&i.ID,
		&i.Name,
		&i.Description,
		&i.BaseCostCents,
		&i.EstimatedDays,
		&i.IsActive,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getDeliveryServiceByName = `-- name: GetDeliveryServiceByName :one

SELECT id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at
FROM delivery_services
WHERE name = $1 AND is_active = $2
`

type GetDeliveryServiceByNameParams struct {
	Name         string `json:"name"`
	ActiveFilter bool   `json:"active_filter"`
}

// Allow filtering by active status
func (q *Queries) GetDeliveryServiceByName(ctx context.Context, arg GetDeliveryServiceByNameParams) (DeliveryService, error) {
	row := q.db.QueryRow(ctx, getDeliveryServiceByName, arg.Name, arg.ActiveFilter)
	var i DeliveryService
	err := row.Scan(
		&i.ID,
		&i.Name,
		&i.Description,
		&i.BaseCostCents,
		&i.EstimatedDays,
		&i.IsActive,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const listAllDeliveryServices = `-- name: ListAllDeliveryServices :many
SELECT id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at
FROM delivery_services
WHERE is_active = $1 -- Filter by active status
ORDER BY name ASC
LIMIT $3 OFFSET $2
`

type ListAllDeliveryServicesParams struct {
	ActiveFilter bool  `json:"active_filter"`
	PageOffset   int32 `json:"page_offset"`
	PageLimit    int32 `json:"page_limit"`
}

// Retrieves delivery services, optionally filtered by active status.
// Suitable for admin operations.
func (q *Queries) ListAllDeliveryServices(ctx context.Context, arg ListAllDeliveryServicesParams) ([]DeliveryService, error) {
	rows, err := q.db.Query(ctx, listAllDeliveryServices, arg.ActiveFilter, arg.PageOffset, arg.PageLimit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []DeliveryService
	for rows.Next() {
		var i DeliveryService
		if err := rows.Scan(
			&i.ID,
			&i.Name,
			&i.Description,
			&i.BaseCostCents,
			&i.EstimatedDays,
			&i.IsActive,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const updateDeliveryService = `-- name: UpdateDeliveryService :one

UPDATE delivery_services
SET
    name = COALESCE($1, name),
    description = COALESCE($2, description),
    base_cost_cents = COALESCE($3, base_cost_cents),
    estimated_days = COALESCE($4, estimated_days),
    is_active = COALESCE($5, is_active),
    updated_at = NOW()
WHERE id = $6
RETURNING id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at
`

type UpdateDeliveryServiceParams struct {
	Name          *string   `json:"name"`
	Description   *string   `json:"description"`
	BaseCostCents *int64    `json:"base_cost_cents"`
	EstimatedDays *int32    `json:"estimated_days"`
	IsActive      *bool     `json:"is_active"`
	ID            uuid.UUID `json:"id"`
}

// Allow filtering by active status
func (q *Queries) UpdateDeliveryService(ctx context.Context, arg UpdateDeliveryServiceParams) (DeliveryService, error) {
	row := q.db.QueryRow(ctx, updateDeliveryService,
		arg.Name,
		arg.Description,
		arg.BaseCostCents,
		arg.EstimatedDays,
		arg.IsActive,
		arg.ID,
	)
	var i DeliveryService
	err := row.Scan(
		&i.ID,
		&i.Name,
		&i.Description,
		&i.BaseCostCents,
		&i.EstimatedDays,
		&i.IsActive,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}


File: internal/db/queries/products_view.sql
================================================
-- name: GetProductsWithDiscountInfoView :many
SELECT *
FROM v_products_with_current_discounts ;


File: internal/db/queries/analytics.sql
================================================
-- --- Sales Performance ---

-- name: GetTotalRevenue :one
-- Calculates the total revenue from all delivered orders within a given time range.
SELECT
    SUM(oi.quantity * oi.price_cents) AS total_revenue_cents
FROM
    orders o
JOIN
    order_items oi ON o.id = oi.order_id
WHERE
    o.status = 'delivered' -- Only delivered orders contribute to revenue
    AND o.created_at BETWEEN $1 AND $2; -- $1 = start_date, $2 = end_date

-- name: GetSalesVolume :one
-- Counts the total number of delivered orders within a given time range.
SELECT
    COUNT(*) AS total_orders
FROM
    orders
WHERE
    status = 'delivered'
    AND created_at BETWEEN $1 AND $2; -- $1 = start_date, $2 = end_date

-- name: GetAverageOrderValue :one
-- Calculates the average order value (AOV) for delivered orders within a given time range.
SELECT
    AVG(o.total_amount_cents) AS aov_cents
FROM
    orders o
WHERE
    o.status = 'delivered'
    AND o.created_at BETWEEN $1 AND $2; -- $1 = start_date, $2 = end_date

-- name: GetTopSellingProducts :many
-- Retrieves the top N selling products (by quantity sold) within a given time range.
SELECT
    p.id AS product_id,
    p.name AS product_name,
    SUM(oi.quantity) AS total_units_sold
FROM
    order_items oi
JOIN
    orders o ON oi.order_id = o.id
JOIN
    products p ON oi.product_id = p.id
WHERE
    o.status = 'delivered'
    AND o.created_at BETWEEN $1 AND $2 -- $1 = start_date, $2 = end_date
GROUP BY
    p.id, p.name
ORDER BY
    total_units_sold DESC
LIMIT $3; -- $3 = number of top products to return (N)

-- name: GetTopSellingCategories :many
-- Retrieves the top N selling categories (by quantity sold) within a given time range.
SELECT
    c.id AS category_id,
    c.name AS category_name,
    SUM(oi.quantity) AS total_units_sold
FROM
    order_items oi
JOIN
    orders o ON oi.order_id = o.id
JOIN
    products p ON oi.product_id = p.id
JOIN
    categories c ON p.category_id = c.id
WHERE
    o.status = 'delivered'
    AND o.created_at BETWEEN $1 AND $2 -- $1 = start_date, $2 = end_date
GROUP BY
    c.id, c.name
ORDER BY
    total_units_sold DESC
LIMIT $3; -- $3 = number of top categories to return (N)

-- --- Product Performance ---

-- name: GetLowStockProducts :many
-- Retrieves products with stock quantity below a specified threshold.
SELECT
    id AS product_id,
    name AS product_name,
    stock_quantity
FROM
    products
WHERE
    stock_quantity < $1 -- $1 = threshold quantity
    AND deleted_at IS NULL
ORDER BY
    stock_quantity ASC;

-- name: GetProductReviewStats :one
-- Retrieves average rating and number of ratings for a specific product.
-- (This might already be covered by the existing product queries selecting avg_rating, num_ratings)
-- But here's a dedicated query if needed:
SELECT
    avg_rating,
    num_ratings
FROM
    products
WHERE
    id = $1 AND deleted_at IS NULL;

-- --- Customer Insights ---

-- name: GetNewCustomersCount :one
-- Counts the number of new customers registered within a given time range.
SELECT
    COUNT(*) AS new_customers_count
FROM
    users
WHERE
    created_at BETWEEN $1 AND $2 -- $1 = start_date, $2 = end_date
    AND deleted_at IS NULL; -- Exclude soft-deleted users

-- --- Order Metrics ---

-- name: GetOrderStatusCounts :many
-- Counts the number of orders in each status (pending, confirmed, shipped, delivered, cancelled).
SELECT
    status,
    COUNT(*) AS count
FROM
    orders
WHERE
    created_at BETWEEN $1 AND $2 -- $1 = start_date, $2 = end_date (optional, remove if counting all time)
GROUP BY
    status;

-- name: GetAverageFulfillmentTime :one
-- Calculates the average time between order confirmation and shipment/delivery completion.
-- Assumes 'confirmed' status is the start and 'shipped' or 'delivered' is the end.
SELECT
    AVG(EXTRACT(EPOCH FROM (o_shipped_or_delivered.updated_at - o_confirmed.updated_at))) AS avg_seconds
FROM
    orders o_confirmed
JOIN
    orders o_shipped_or_delivered ON o_confirmed.id = o_shipped_or_delivered.id
WHERE
    o_confirmed.status = 'confirmed'
    AND (o_shipped_or_delivered.status = 'shipped' OR o_shipped_or_delivered.status = 'delivered')
    AND o_confirmed.created_at BETWEEN $1 AND $2; -- $1 = start_date, $2 = end_date
-- Note: This query is complex because order status updates modify the same row.
-- A more robust approach might involve an order_status_history table or window functions.
-- Simplified version assuming statuses are updated sequentially and we just compare timestamps.
-- A better way might be to track status change events explicitly.
-- For now, let's simplify the logic assuming we just want the difference between created_at and updated_at
-- for 'shipped' or 'delivered' orders, IF created_at represents the time it became confirmed.
-- This might not be accurate depending on how status transitions are handled.
-- Let's revise:
-- Assume 'confirmed' status sets confirmed_at, 'shipped' sets shipped_at, 'delivered' sets delivered_at.
-- Add these timestamp fields to the orders table if they don't exist.
-- ALTER TABLE orders ADD COLUMN confirmed_at TIMESTAMPTZ, shipped_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ;
-- Then update these timestamps in the service layer upon status changes.
-- Query would then be:
-- SELECT AVG(EXTRACT(EPOCH FROM (delivered_at - confirmed_at))) FROM orders WHERE status = 'delivered' AND ...;
-- For now, acknowledging this complexity, we'll note it and move on, assuming status timestamps exist or are derivable.
-- This query might need adjustment based on how status changes are tracked in the DB.
-- Let's add a simpler one based on status counts for now.
-- name: GetOrdersByStatusWithinTimeRange :many
-- Counts orders by status within a time range.
-- This is similar to GetOrderStatusCounts but with a time filter.
SELECT
    status,
    COUNT(*) AS count
FROM
    orders
WHERE
    created_at BETWEEN $1 AND $2 -- $1 = start_date, $2 = end_date
GROUP BY
    status;

-- --- Discount Effectiveness ---

-- name: GetDiscountUsage :many
-- Retrieves usage count and revenue attributed to specific discount codes within a time range.
SELECT
    d.code AS discount_code,
    d.discount_type,
    d.discount_value,
    COUNT(o.id) AS usage_count,
    SUM(o.total_amount_cents) AS total_revenue_with_discount
FROM
    orders o
JOIN
    discounts d ON o.applied_discount_code = d.code -- Assuming orders table stores the code used
WHERE
    o.status = 'delivered'
    AND o.created_at BETWEEN $1 AND $2 -- $1 = start_date, $2 = end_date
GROUP BY
    d.code, d.discount_type, d.discount_value;


File: internal/db/review.sql.go
================================================
// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.30.0
// source: review.sql

package db

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

const calculateReviewStatsForProduct = `-- name: CalculateReviewStatsForProduct :one
SELECT
    AVG(r.rating)::NUMERIC(3,2) AS avg_rating,
    COUNT(r.rating)::INTEGER AS num_ratings
FROM reviews r
WHERE r.product_id = $1 AND r.deleted_at IS NULL
`

type CalculateReviewStatsForProductRow struct {
	AvgRating  pgtype.Numeric `json:"avg_rating"`
	NumRatings int32          `json:"num_ratings"`
}

// Calculates the average rating and count of non-deleted reviews for a specific product.
// Used to update the products table.
func (q *Queries) CalculateReviewStatsForProduct(ctx context.Context, productID uuid.UUID) (CalculateReviewStatsForProductRow, error) {
	row := q.db.QueryRow(ctx, calculateReviewStatsForProduct, productID)
	var i CalculateReviewStatsForProductRow
	err := row.Scan(&i.AvgRating, &i.NumRatings)
	return i, err
}

const createReview = `-- name: CreateReview :one
INSERT INTO reviews (
    user_id, product_id, rating
) VALUES (
    $1, $2, $3
)
RETURNING id, user_id, product_id, rating, created_at, updated_at
`

type CreateReviewParams struct {
	UserID    uuid.UUID `json:"user_id"`
	ProductID uuid.UUID `json:"product_id"`
	Rating    int32     `json:"rating"`
}

type CreateReviewRow struct {
	ID        uuid.UUID          `json:"id"`
	UserID    uuid.UUID          `json:"user_id"`
	ProductID uuid.UUID          `json:"product_id"`
	Rating    int32              `json:"rating"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
	UpdatedAt pgtype.Timestamptz `json:"updated_at"`
}

// Inserts a new review and returns its details.
// NOTE: This query alone does not update the product's avg_rating/num_ratings.
func (q *Queries) CreateReview(ctx context.Context, arg CreateReviewParams) (CreateReviewRow, error) {
	row := q.db.QueryRow(ctx, createReview, arg.UserID, arg.ProductID, arg.Rating)
	var i CreateReviewRow
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.ProductID,
		&i.Rating,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const deleteReview = `-- name: DeleteReview :one
UPDATE reviews
SET deleted_at = NOW(), updated_at = NOW()
WHERE id = $1 AND user_id = $2 -- Ensure user owns the review
RETURNING id, user_id, product_id, rating, created_at, updated_at
`

type DeleteReviewParams struct {
	ID     uuid.UUID `json:"id"`
	UserID uuid.UUID `json:"user_id"`
}

type DeleteReviewRow struct {
	ID        uuid.UUID          `json:"id"`
	UserID    uuid.UUID          `json:"user_id"`
	ProductID uuid.UUID          `json:"product_id"`
	Rating    int32              `json:"rating"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
	UpdatedAt pgtype.Timestamptz `json:"updated_at"`
}

// Soft deletes a review by setting deleted_at.
// NOTE: This query alone does not update the product's avg_rating/num_ratings.
func (q *Queries) DeleteReview(ctx context.Context, arg DeleteReviewParams) (DeleteReviewRow, error) {
	row := q.db.QueryRow(ctx, deleteReview, arg.ID, arg.UserID)
	var i DeleteReviewRow
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.ProductID,
		&i.Rating,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getReviewByIDAndUser = `-- name: GetReviewByIDAndUser :one
SELECT id, user_id, product_id, rating, created_at, updated_at
FROM reviews
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
`

type GetReviewByIDAndUserParams struct {
	ID     uuid.UUID `json:"id"`
	UserID uuid.UUID `json:"user_id"`
}

type GetReviewByIDAndUserRow struct {
	ID        uuid.UUID          `json:"id"`
	UserID    uuid.UUID          `json:"user_id"`
	ProductID uuid.UUID          `json:"product_id"`
	Rating    int32              `json:"rating"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
	UpdatedAt pgtype.Timestamptz `json:"updated_at"`
}

// Retrieves a specific review by its ID and verifies the user owns it.
func (q *Queries) GetReviewByIDAndUser(ctx context.Context, arg GetReviewByIDAndUserParams) (GetReviewByIDAndUserRow, error) {
	row := q.db.QueryRow(ctx, getReviewByIDAndUser, arg.ID, arg.UserID)
	var i GetReviewByIDAndUserRow
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.ProductID,
		&i.Rating,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getReviewByUserAndProduct = `-- name: GetReviewByUserAndProduct :one
SELECT id, user_id, product_id, rating, created_at, updated_at
FROM reviews
WHERE user_id = $1 AND product_id = $2 AND deleted_at IS NULL
`

type GetReviewByUserAndProductParams struct {
	UserID    uuid.UUID `json:"user_id"`
	ProductID uuid.UUID `json:"product_id"`
}

type GetReviewByUserAndProductRow struct {
	ID        uuid.UUID          `json:"id"`
	UserID    uuid.UUID          `json:"user_id"`
	ProductID uuid.UUID          `json:"product_id"`
	Rating    int32              `json:"rating"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
	UpdatedAt pgtype.Timestamptz `json:"updated_at"`
}

// Retrieves a review by a specific user for a specific product.
func (q *Queries) GetReviewByUserAndProduct(ctx context.Context, arg GetReviewByUserAndProductParams) (GetReviewByUserAndProductRow, error) {
	row := q.db.QueryRow(ctx, getReviewByUserAndProduct, arg.UserID, arg.ProductID)
	var i GetReviewByUserAndProductRow
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.ProductID,
		&i.Rating,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getReviewsByProductID = `-- name: GetReviewsByProductID :many
SELECT 
    r.id,
    r.user_id,
    r.product_id,
    r.rating,
    r.created_at,
    r.updated_at,
    u.full_name AS reviewer_name 
FROM reviews r
JOIN users u ON r.user_id = u.id -- INNER JOIN to link review to user
WHERE r.product_id = $1 AND r.deleted_at IS NULL
ORDER BY r.created_at DESC -- Or rating DESC, etc.
LIMIT $3 OFFSET $2
`

type GetReviewsByProductIDParams struct {
	ProductID  uuid.UUID `json:"product_id"`
	PageOffset int32     `json:"page_offset"`
	PageLimit  int32     `json:"page_limit"`
}

type GetReviewsByProductIDRow struct {
	ID           uuid.UUID          `json:"id"`
	UserID       uuid.UUID          `json:"user_id"`
	ProductID    uuid.UUID          `json:"product_id"`
	Rating       int32              `json:"rating"`
	CreatedAt    pgtype.Timestamptz `json:"created_at"`
	UpdatedAt    pgtype.Timestamptz `json:"updated_at"`
	ReviewerName *string            `json:"reviewer_name"`
}

// Retrieves all reviews for a specific product, including the reviewer's name, potentially paginated.
func (q *Queries) GetReviewsByProductID(ctx context.Context, arg GetReviewsByProductIDParams) ([]GetReviewsByProductIDRow, error) {
	rows, err := q.db.Query(ctx, getReviewsByProductID, arg.ProductID, arg.PageOffset, arg.PageLimit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetReviewsByProductIDRow
	for rows.Next() {
		var i GetReviewsByProductIDRow
		if err := rows.Scan(
			&i.ID,
			&i.UserID,
			&i.ProductID,
			&i.Rating,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.ReviewerName,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getReviewsByUserID = `-- name: GetReviewsByUserID :many
SELECT 
    r.id,
    r.user_id,
    r.product_id,
    r.rating,
    r.created_at,
    r.updated_at,
    p.name AS product_name -- Join with products table to get the name
FROM reviews r
JOIN products p ON r.product_id = p.id -- INNER JOIN to link review to product
WHERE r.user_id = $1 AND r.deleted_at IS NULL
ORDER BY r.created_at DESC
LIMIT $3 OFFSET $2
`

type GetReviewsByUserIDParams struct {
	UserID     uuid.UUID `json:"user_id"`
	PageOffset int32     `json:"page_offset"`
	PageLimit  int32     `json:"page_limit"`
}

type GetReviewsByUserIDRow struct {
	ID          uuid.UUID          `json:"id"`
	UserID      uuid.UUID          `json:"user_id"`
	ProductID   uuid.UUID          `json:"product_id"`
	Rating      int32              `json:"rating"`
	CreatedAt   pgtype.Timestamptz `json:"created_at"`
	UpdatedAt   pgtype.Timestamptz `json:"updated_at"`
	ProductName string             `json:"product_name"`
}

// Retrieves all reviews submitted by a specific user, including the product name, potentially paginated.
func (q *Queries) GetReviewsByUserID(ctx context.Context, arg GetReviewsByUserIDParams) ([]GetReviewsByUserIDRow, error) {
	rows, err := q.db.Query(ctx, getReviewsByUserID, arg.UserID, arg.PageOffset, arg.PageLimit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetReviewsByUserIDRow
	for rows.Next() {
		var i GetReviewsByUserIDRow
		if err := rows.Scan(
			&i.ID,
			&i.UserID,
			&i.ProductID,
			&i.Rating,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.ProductName,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const updateProductReviewStats = `-- name: UpdateProductReviewStats :exec
UPDATE products
SET
    avg_rating = $1,
    num_ratings = $2,
    updated_at = NOW() -- Optionally update the product's general updated_at too
WHERE id = $3
`

type UpdateProductReviewStatsParams struct {
	AvgRating  pgtype.Numeric `json:"avg_rating"`
	NumRatings *int32         `json:"num_ratings"`
	ProductID  uuid.UUID      `json:"product_id"`
}

// Updates the avg_rating and num_ratings fields in the products table for a specific product.
func (q *Queries) UpdateProductReviewStats(ctx context.Context, arg UpdateProductReviewStatsParams) error {
	_, err := q.db.Exec(ctx, updateProductReviewStats, arg.AvgRating, arg.NumRatings, arg.ProductID)
	return err
}

const updateReview = `-- name: UpdateReview :one
UPDATE reviews
SET rating = $1, updated_at = NOW()
WHERE id = $2 AND user_id = $3 -- Ensure user owns the review
RETURNING id, user_id, product_id, rating, created_at, updated_at
`

type UpdateReviewParams struct {
	Rating int32     `json:"rating"`
	ID     uuid.UUID `json:"id"`
	UserID uuid.UUID `json:"user_id"`
}

type UpdateReviewRow struct {
	ID        uuid.UUID          `json:"id"`
	UserID    uuid.UUID          `json:"user_id"`
	ProductID uuid.UUID          `json:"product_id"`
	Rating    int32              `json:"rating"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
	UpdatedAt pgtype.Timestamptz `json:"updated_at"`
}

// Updates the rating of an existing review.
// NOTE: This query alone does not update the product's avg_rating/num_ratings.
func (q *Queries) UpdateReview(ctx context.Context, arg UpdateReviewParams) (UpdateReviewRow, error) {
	row := q.db.QueryRow(ctx, updateReview, arg.Rating, arg.ID, arg.UserID)
	var i UpdateReviewRow
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.ProductID,
		&i.Rating,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}


File: internal/models/product.go
================================================
package models

import (
	"time"

	"github.com/google/uuid"
)

// Product represents a product in the store.
type Product struct {
	ID                                 uuid.UUID              `json:"id"`
	CategoryID                         uuid.UUID              `json:"category_id"`
	CategoryName                       *string                `json:"category_name,omitempty"`
	Name                               string                 `json:"name"`
	Slug                               string                 `json:"slug"`
	Description                        *string                `json:"description,omitempty"`
	ShortDescription                   *string                `json:"short_description,omitempty"`
	PriceCents                         int64                  `json:"price_cents"`           // Represents OriginalPriceCents from the query
	StockQuantity                      int                    `json:"stock_quantity"`        // Different type
	AvgRating                          float64                `json:"avg_rating,omitempty"`  // Nullable, calculated from reviews
	NumRatings                         *int32                 `json:"num_ratings,omitempty"` // Nullable, count of reviews
	Status                             string                 `json:"status"`
	Brand                              string                 `json:"brand"`
	ImageURLs                          []string               `json:"image_urls"`           // Different type
	SpecHighlights                     map[string]interface{} `json:"spec_highlights"`      // Different type
	CreatedAt                          time.Time              `json:"created_at"`           // Different type
	UpdatedAt                          time.Time              `json:"updated_at"`           // Different type
	DeletedAt                          *time.Time             `json:"deleted_at,omitempty"` // Different type
	DiscountedPriceCents               *int64                 `json:"discounted_price_cents,omitempty"`
	DiscountCode                       *string                `json:"discount_code,omitempty"`  // Kept as nil
	DiscountType                       *string                `json:"discount_type,omitempty"`  // Kept as nil
	DiscountValue                      *int64                 `json:"discount_value,omitempty"` // Kept as nil
	HasActiveDiscount                  bool                   `json:"has_active_discount"`
	TotalCalculatedFixedDiscountCents  *int64                 `json:"total_calculated_fixed_discount_cents,omitempty"`
	CalculatedCombinedPercentageFactor *float64               `json:"calculated_combined_percentage_factor,omitempty"`
	EffectiveDiscountPercentage        *float64               `json:"effective_discount_percentage,omitempty"` // e.g., 20.5%
}

type Category struct {
	ID        uuid.UUID  `json:"id"`
	Name      string     `json:"name"`
	Slug      string     `json:"slug"`
	Type      string     `json:"type"`
	ParentID  *uuid.UUID `json:"parent_id,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

type CreateProductRequest struct {
	CategoryID       uuid.UUID      `json:"category_id" validate:"required,uuid"`
	Name             string         `json:"name" validate:"required,max=255"`
	Description      *string        `json:"description,omitempty"`
	ShortDescription *string        `json:"short_description,omitempty"`
	PriceCents       int64          `json:"price_cents" validate:"required,min=0"`
	StockQuantity    int            `json:"stock_quantity" validate:"min=0"`
	Status           string         `json:"status" validate:"required,oneof=draft active discontinued"`
	Brand            string         `json:"brand" validate:"required,max=100"`
	ImageUrls        []string       `json:"image_urls" validate:"max=10"`
	SpecHighlights   map[string]any `json:"spec_highlights"`
}

type ProductFilter struct {
	Query                 string    `json:"query,omitempty"`
	CategoryID            uuid.UUID `json:"category_id,omitempty"`
	Brand                 string    `json:"brand,omitempty"`
	MinPrice              *int64    `json:"min_price,omitempty"`
	MaxPrice              *int64    `json:"max_price,omitempty"`
	InStockOnly           *bool     `json:"in_stock_only,omitempty"`
	IncludeDiscountedOnly *bool     `json:"include_discounted_only,omitempty"`
	SpecFilter            *string   `json:"spec_filter,omitempty"`
	Page                  int       `json:"page"`
	Limit                 int       `json:"limit"`
}

type PaginatedResponse struct {
	Data       any   `json:"data"`
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

type UpdateProductRequest struct {
	CategoryID       *uuid.UUID      `json:"category_id,omitempty" validate:"omitempty,uuid"`
	Name             *string         `json:"name,omitempty" validate:"omitempty,max=255"`
	Description      *string         `json:"description,omitempty"`
	ShortDescription *string         `json:"short_description,omitempty"`
	PriceCents       *int64          `json:"price_cents,omitempty" validate:"omitempty,min=0"`
	StockQuantity    *int            `json:"stock_quantity,omitempty" validate:"omitempty,min=0"`
	Status           *string         `json:"status,omitempty" validate:"omitempty,oneof=draft active discontinued"`
	Brand            *string         `json:"brand,omitempty" validate:"omitempty,max=100"`
	ImageUrls        *[]string       `json:"image_urls,omitempty" validate:"omitempty,max=10"`
	SpecHighlights   *map[string]any `json:"spec_highlights,omitempty"`
}

func (r *CreateProductRequest) Validate() error {
	return Validate.Struct(r)
}

func (upr *UpdateProductRequest) Validate() error {
	return Validate.Struct(upr)
}


File: internal/models/review.go
================================================
package models

import (
	"time"

	"github.com/google/uuid"
)

// Review represents a user's rating for a product (core model, potentially used internally).
type Review struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"` // Core ID
	ProductID uuid.UUID `json:"product_id"`
	Rating    int       `json:"rating" validate:"required,min=1,max=5"` // Star rating (1 to 5)
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ReviewListItem represents a review for display purposes, including the reviewer's name.
type ReviewListItem struct {
	ID           uuid.UUID `json:"id"`
	UserID       uuid.UUID `json:"user_id,omitempty"` // Potentially omit if name is shown
	ReviewerName string    `json:"reviewer_name"`     // Added field for display
	ProductID    uuid.UUID `json:"product_id"`        // Might be omitted if fetched for a specific product
	Rating       int       `json:"rating"`            // The star rating (1-5)
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// ReviewByUserListItem represents a review submitted by the user, including the product name.
type ReviewByUserListItem struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id,omitempty"` // Potentially omit if context is clear
	ProductID   uuid.UUID `json:"product_id"`
	ProductName string    `json:"product_name"` // Added field for display
	Rating      int       `json:"rating"`       // The star rating (1-5)
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CreateReviewRequest represents the request body for creating a review.
type CreateReviewRequest struct {
	ProductID uuid.UUID `json:"product_id" validate:"required,uuid"`
	Rating    int       `json:"rating" validate:"required,min=1,max=5"`
}

// UpdateReviewRequest represents the request body for updating a review's rating.
type UpdateReviewRequest struct {
	Rating int `json:"rating" validate:"required,min=1,max=5"`
}

type GetReviewsByProductResponse struct {
	Reviews []ReviewListItem `json:"reviews"`
	Page    int              `json:"page,omitempty"`
	Limit   int              `json:"limit,omitempty"`
	Total   int64            `json:"total,omitempty"`
}

type GetReviewsByUserResponse struct {
	Reviews []ReviewByUserListItem `json:"reviews"`
	Page    int                    `json:"page,omitempty"`
	Limit   int                    `json:"limit,omitempty"`
	Total   int64                  `json:"total,omitempty"`
}

func (cr *CreateReviewRequest) Validate() error {
	return Validate.Struct(cr)
}

func (ur *UpdateReviewRequest) Validate() error {
	return Validate.Struct(ur)
}


File: internal/config/config.go
================================================
package config

import (
	"log"
	"log/slog"
	"os"
	"strconv"
)

type Config struct {
	ServerPort    string
	DBURL         string
	JWTSecret     string
	RedisHost     string
	RedisPort     string
	RedisPassword string
	RedisDB       int
}

func LoadConfig() *Config {
	cfg := &Config{
		ServerPort:    getEnvOrDefault("PORT", "8080"),
		DBURL:         getEnvOrDefault("DATABASE_URL", ""),
		JWTSecret:     getEnvOrDefault("JWT_SECRET", ""),
		RedisHost:     getEnvOrDefault("REDIS_HOST", "localhost"),
		RedisPort:     getEnvOrDefault("REDIS_PORT", "6379"),
		RedisPassword: getEnvOrDefault("REDIS_PASSWORD", ""),
		RedisDB:       getEnvAsInt("REDIS_DB", 0),
	}

	if cfg.JWTSecret == "" {
		slog.Error("JWT_SECRET environment variable is required")
		panic("JWT_SECRET environment variable is required")
	}

	return cfg
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		intValue, err := strconv.Atoi(value)
		if err != nil {
			log.Printf("Warning: Could not parse environment variable %s as integer, using default %d", key, defaultValue)
			return defaultValue
		}
		return intValue
	}
	return defaultValue
}


File: internal/handlers/delivery_options.go
================================================
package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"tech-store-backend/internal/services"
	"github.com/go-chi/chi/v5"
)

// DeliveryOptionsHandler manages HTTP requests for fetching delivery options.
type DeliveryOptionsHandler struct {
	service *services.DeliveryServiceService // Inject the DeliveryServiceService
	logger  *slog.Logger
}

// NewDeliveryOptionsHandler creates a new instance of DeliveryOptionsHandler.
func NewDeliveryOptionsHandler(service *services.DeliveryServiceService, logger *slog.Logger) *DeliveryOptionsHandler {
	return &DeliveryOptionsHandler{
		service: service,
		logger:  logger,
	}
}

// GetActiveDeliveryOptions handles retrieving the list of active delivery services.
// Requires user authentication (JWT middleware should be applied upstream).
func (h *DeliveryOptionsHandler) GetActiveDeliveryOptions(w http.ResponseWriter, r *http.Request) {
	deliveryServices, err := h.service.GetActiveDeliveryServices(r.Context())
	if err != nil {
		h.logger.Error("Failed to fetch active delivery options", "error", err)
		http.Error(w, "Failed to retrieve delivery options", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(deliveryServices); err != nil {
		h.logger.Error("Failed to encode GetActiveDeliveryOptions response", "error", err)
	}
}

// RegisterRoutes registers the delivery options-related routes with the provided Chi router.
func (h *DeliveryOptionsHandler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.GetActiveDeliveryOptions) // GET /api/v1/delivery-options/
}


File: internal/handlers/discount.go
================================================
package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"tech-store-backend/internal/models"
	"tech-store-backend/internal/services"
	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// DiscountHandler handles HTTP requests for discount management.
type DiscountHandler struct {
	service *services.DiscountService
	logger  *slog.Logger
}

// NewDiscountHandler creates a new instance of DiscountHandler.
func NewDiscountHandler(service *services.DiscountService, logger *slog.Logger) *DiscountHandler {
	return &DiscountHandler{
		service: service,
		logger:  logger,
	}
}

// RegisterRoutes registers discount-related routes with the provided router.
// This function assumes the router already has admin authorization middleware applied.
func (h *DiscountHandler) RegisterRoutes(r chi.Router) {
	r.Post("/", h.CreateDiscount)
	r.Get("/{id}", h.GetDiscount)
	r.Put("/{id}", h.UpdateDiscount)
	r.Delete("/{id}", h.DeleteDiscount)
	r.Get("/", h.ListDiscounts)

	// Nested routes for linking/unlinking to products
	r.Route("/{discount_id}/link", func(r chi.Router) {
		r.Post("/product", h.LinkDiscountToProduct)
	})
	r.Route("/{discount_id}/unlink", func(r chi.Router) {
		r.Post("/product", h.UnlinkDiscountFromProduct)
	})
}

// CreateDiscount handles the creation of a new discount.
func (h *DiscountHandler) CreateDiscount(w http.ResponseWriter, r *http.Request) {
	var req models.CreateDiscountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Invalid JSON in CreateDiscount request", "error", err)
		http.Error(w, `{"error": "Invalid JSON", "message": "Request body contains invalid JSON"}`, http.StatusBadRequest)
		return
	}

	if err := req.Validate(); err != nil {
		h.logger.Error("Validation failed for CreateDiscount request", "error", err)
		fieldErrors := make(map[string]string)
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			for _, err := range validationErrors {
				fieldErrors[err.Field()] = formatValidationError(err)
			}
		}
		// Send validation error response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnprocessableEntity)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Validation Failed",
			"message": "The request data is invalid.",
			"details": fieldErrors,
		})
		return
	}

	createdDiscount, err := h.service.CreateDiscount(r.Context(), req)
	if err != nil {
		h.logger.Error("Failed to create discount", "error", err)
		if strings.Contains(err.Error(), "already exists") {
			http.Error(w, `{"error": "Discount Code Conflict", "message": "`+err.Error()+`"}`, http.StatusConflict)
			return
		}
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to create discount"}`, http.StatusInternalServerError)
		return
	}

	h.logger.Info("Discount created successfully", "discount_id", createdDiscount.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdDiscount)
}

// GetDiscount handles retrieving a specific discount by ID.
func (h *DiscountHandler) GetDiscount(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.logger.Error("Invalid discount ID in GetDiscount request", "id", idStr, "error", err)
		http.Error(w, `{"error": "Invalid Discount ID", "message": "Discount ID must be a valid UUID"}`, http.StatusBadRequest)
		return
	}

	discount, err := h.service.GetDiscount(r.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get discount", "id", id, "error", err)
		if errors.Is(err, pgx.ErrNoRows) || err.Error() == "discount not found" {
			http.Error(w, `{"error": "Discount Not Found", "message": "The requested discount does not exist"}`, http.StatusNotFound)
			return
		}
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to retrieve discount"}`, http.StatusInternalServerError)
		return
	}

	h.logger.Info("Discount retrieved successfully", "discount_id", discount.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(discount)
}

// UpdateDiscount handles updating an existing discount by ID.
func (h *DiscountHandler) UpdateDiscount(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.logger.Error("Invalid discount ID in UpdateDiscount request", "id", idStr, "error", err)
		http.Error(w, `{"error": "Invalid Discount ID", "message": "Discount ID must be a valid UUID"}`, http.StatusBadRequest)
		return
	}

	var req models.UpdateDiscountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Invalid JSON in UpdateDiscount request", "error", err)
		http.Error(w, `{"error": "Invalid JSON", "message": "Request body contains invalid JSON"}`, http.StatusBadRequest)
		return
	}

	// Validation for UpdateDiscountRequest might be trickier due to conditional fields.
	// You might need custom validation logic here or ensure the service handles it robustly.
	// For now, let's assume basic struct validation works where applicable.
	if err := req.Validate(); err != nil {
		h.logger.Error("Validation failed for UpdateDiscount request", "error", err)
		fieldErrors := make(map[string]string)
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			for _, err := range validationErrors {
				fieldErrors[err.Field()] = formatValidationError(err)
			}
		}
		// Send validation error response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnprocessableEntity)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Validation Failed",
			"message": "The request data is invalid.",
			"details": fieldErrors,
		})
		return
	}

	updatedDiscount, err := h.service.UpdateDiscount(r.Context(), id, req)
	if err != nil {
		h.logger.Error("Failed to update discount", "id", id, "error", err)
		if errors.Is(err, pgx.ErrNoRows) || err.Error() == "discount not found" {
			http.Error(w, `{"error": "Discount Not Found", "message": "The requested discount does not exist"}`, http.StatusNotFound)
			return
		}
		if strings.Contains(err.Error(), "already exists") {
			http.Error(w, `{"error": "Discount Code Conflict", "message": "`+err.Error()+`"}`, http.StatusConflict)
			return
		}
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to update discount"}`, http.StatusInternalServerError)
		return
	}

	h.logger.Info("Discount updated successfully", "discount_id", updatedDiscount.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(updatedDiscount)
}

// DeleteDiscount handles deleting a discount by ID.
func (h *DiscountHandler) DeleteDiscount(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.logger.Error("Invalid discount ID in DeleteDiscount request", "id", idStr, "error", err)
		http.Error(w, `{"error": "Invalid Discount ID", "message": "Discount ID must be a valid UUID"}`, http.StatusBadRequest)
		return
	}

	err = h.service.DeleteDiscount(r.Context(), id)
	if err != nil {
		h.logger.Error("Failed to delete discount", "id", id, "error", err)
		if errors.Is(err, pgx.ErrNoRows) || err.Error() == "discount not found" {
			http.Error(w, `{"error": "Discount Not Found", "message": "The requested discount does not exist"}`, http.StatusNotFound)
			return
		}
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to delete discount"}`, http.StatusInternalServerError)
		return
	}

	h.logger.Info("Discount deleted successfully", "discount_id", id)
	w.WriteHeader(http.StatusNoContent) // 204 No Content
}

// ListDiscounts handles retrieving a paginated list of discounts based on filters.
func (h *DiscountHandler) ListDiscounts(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	query := r.URL.Query()
	var isActive *bool
	if isActiveStr := query.Get("is_active"); isActiveStr != "" {
		isActiveVal, err := strconv.ParseBool(isActiveStr)
		if err != nil {
			h.logger.Error("Invalid is_active parameter in ListDiscounts request", "value", isActiveStr, "error", err)
			http.Error(w, `{"error": "Invalid Parameter", "message": "Parameter 'is_active' must be a valid boolean (true/false)"}`, http.StatusBadRequest)
			return
		}
		isActive = &isActiveVal
	}

	// --- Parse new date filter parameters ---
	var validFrom, validUntil *time.Time
	if validFromStr := query.Get("valid_from"); validFromStr != "" {
		parsedTime, err := time.Parse(time.RFC3339, validFromStr) // Or another layout if needed, e.g. time.RFC3339Nano
		if err != nil {
			h.logger.Error("Invalid valid_from parameter in ListDiscounts request", "value", validFromStr, "error", err)
			http.Error(w, `{"error": "Invalid Parameter", "message": "Parameter 'valid_from' must be a valid RFC3339 timestamp"}`, http.StatusBadRequest)
			return
		}
		validFrom = &parsedTime
	}

	if validUntilStr := query.Get("valid_until"); validUntilStr != "" {
		parsedTime, err := time.Parse(time.RFC3339, validUntilStr) // Or another layout if needed
		if err != nil {
			h.logger.Error("Invalid valid_until parameter in ListDiscounts request", "value", validUntilStr, "error", err)
			http.Error(w, `{"error": "Invalid Parameter", "message": "Parameter 'valid_until' must be a valid RFC3339 timestamp"}`, http.StatusBadRequest)
			return
		}
		validUntil = &parsedTime
	}
	// ---

	pageStr := query.Get("page")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1 // Default to page 1
	}

	limitStr := query.Get("limit")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 20 // Default to 20 per page
	}
	if limit > 100 {
		limit = 100 // Enforce maximum limit
	}

	req := models.ListDiscountsRequest{
		IsActive:   isActive,
		ValidFrom:  validFrom,  // Add parsed date filters
		ValidUntil: validUntil, // Add parsed date filters
		Page:       page,
		Limit:      limit,
	}

	listResponse, err := h.service.ListDiscounts(r.Context(), req)
	if err != nil {
		h.logger.Error("Failed to list discounts", "request", req, "error", err)
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to retrieve discount list"}`, http.StatusInternalServerError)
		return
	}

	h.logger.Info("Discount list retrieved successfully", "page", req.Page, "limit", req.Limit, "total", listResponse.Total)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(listResponse)
}

// LinkDiscountToProduct handles associating a discount with a product.
func (h *DiscountHandler) LinkDiscountToProduct(w http.ResponseWriter, r *http.Request) {
	discountIDStr := chi.URLParam(r, "discount_id")
	discountID, err := uuid.Parse(discountIDStr)
	if err != nil {
		h.logger.Error("Invalid discount ID in LinkDiscountToProduct request", "discount_id", discountIDStr, "error", err)
		http.Error(w, `{"error": "Invalid Discount ID", "message": "Discount ID must be a valid UUID"}`, http.StatusBadRequest)
		return
	}

	var req models.LinkDiscountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Invalid JSON in LinkDiscountToProduct request", "error", err)
		http.Error(w, `{"error": "Invalid JSON", "message": "Request body contains invalid JSON"}`, http.StatusBadRequest)
		return
	}

	if err := req.Validate(); err != nil {
		h.logger.Error("Validation failed for LinkDiscountToProduct request", "error", err)
		fieldErrors := make(map[string]string)
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			for _, err := range validationErrors {
				fieldErrors[err.Field()] = formatValidationError(err)
			}
		}
		// Send validation error response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnprocessableEntity)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Validation Failed",
			"message": "The request data is invalid.",
			"details": fieldErrors,
		})
		return
	}

	err = h.service.LinkDiscountToProduct(r.Context(), discountID, req.ProductID)
	if err != nil {
		h.logger.Error("Failed to link discount to product", "discount_id", discountID, "product_id", req.ProductID, "error", err)
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to link discount to product"}`, http.StatusInternalServerError)
		return
	}

	h.logger.Info("Discount linked to product successfully", "discount_id", discountID, "product_id", req.ProductID)
	w.WriteHeader(http.StatusOK) // 200 OK or 204 No Content
}

// UnlinkDiscountFromProduct handles removing the association between a discount and a product.
func (h *DiscountHandler) UnlinkDiscountFromProduct(w http.ResponseWriter, r *http.Request) {
	discountIDStr := chi.URLParam(r, "discount_id")
	discountID, err := uuid.Parse(discountIDStr)
	if err != nil {
		h.logger.Error("Invalid discount ID in UnlinkDiscountFromProduct request", "discount_id", discountIDStr, "error", err)
		http.Error(w, `{"error": "Invalid Discount ID", "message": "Discount ID must be a valid UUID"}`, http.StatusBadRequest)
		return
	}

	var req models.UnlinkDiscountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Invalid JSON in UnlinkDiscountFromProduct request", "error", err)
		http.Error(w, `{"error": "Invalid JSON", "message": "Request body contains invalid JSON"}`, http.StatusBadRequest)
		return
	}

	if err := req.Validate(); err != nil {
		h.logger.Error("Validation failed for UnlinkDiscountFromProduct request", "error", err)
		fieldErrors := make(map[string]string)
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			for _, err := range validationErrors {
				fieldErrors[err.Field()] = formatValidationError(err)
			}
		}
		// Send validation error response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnprocessableEntity)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Validation Failed",
			"message": "The request data is invalid.",
			"details": fieldErrors,
		})
		return
	}

	err = h.service.UnlinkDiscountFromProduct(r.Context(), discountID, req.ProductID)
	if err != nil {
		h.logger.Error("Failed to unlink discount from product", "discount_id", discountID, "product_id", req.ProductID, "error", err)
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to unlink discount from product"}`, http.StatusInternalServerError)
		return
	}

	h.logger.Info("Discount unlinked from product successfully", "discount_id", discountID, "product_id", req.ProductID)
	w.WriteHeader(http.StatusOK) // 200 OK or 204 No Content
}


File: internal/server/server.go
================================================
package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"tech-store-backend/db"
	"tech-store-backend/internal/config"
	"tech-store-backend/internal/router"
	"github.com/redis/go-redis/v9"
)

type Server struct {
	httpServer  *http.Server
	cfg         *config.Config
	redisClient *redis.Client
}

func New(cfg *config.Config) *Server {
	// Initialize database first
	if err := db.Init(); err != nil {
		slog.Error("Failed to initialize database", "error", err)
		panic(fmt.Sprintf("failed to initialize database: %v", err))
	}

	// Run migrations
	if err := db.RunMigrations(); err != nil {
		slog.Error("Failed to run migrations", "error", err)
		panic(fmt.Sprintf("failed to run migrations: %v", err))
	}

	// Double-check that the pool is initialized
	pool := db.GetPool()
	if pool == nil {
		panic("database pool is nil after initialization")
	}
	// --- Initialize Redis Client ---
	redisClient := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisHost + ":" + cfg.RedisPort,
		Password: cfg.RedisPassword, // no password set
		DB:       cfg.RedisDB,       // use default DB
	})

	// Test the Redis connection
	ctx := context.Background()
	pong, err := redisClient.Ping(ctx).Result()
	if err != nil {
		slog.Error("Failed to connect to Redis", "error", err)
		panic(fmt.Sprintf("failed to connect to Redis: %v", err)) // Panic if Redis connection fails
	}
	slog.Info("Connected to Redis", "pong", pong)

	httpRouter := router.New(cfg, redisClient)

	return &Server{
		httpServer: &http.Server{
			Addr:    ":" + cfg.ServerPort,
			Handler: httpRouter,
		},
		cfg:         cfg,
		redisClient: redisClient,
	}
}

func (s *Server) Start() error {
	// Start server in a goroutine
	go func() {
		slog.Info("Server starting", "port", s.cfg.ServerPort)
		if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server failed to start", "error", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := s.httpServer.Shutdown(ctx); err != nil {
		slog.Error("Server forced to shutdown", "error", err)
		return err
	}

	slog.Info("Server exited")
	return nil
}

func (s *Server) Stop() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Shutdown HTTP server first
	httpErr := s.httpServer.Shutdown(ctx)

	// Close Redis client
	redisErr := s.redisClient.Close()

	// Return the first error encountered (preferably the HTTP shutdown error)
	if httpErr != nil {
		return httpErr
	}
	return redisErr // Return Redis close error if HTTP shutdown was successful
}


File: internal/services/errors.go
================================================
package services

import "errors"

// Sentinel errors for ProductService
var (
	ErrProductNotFound   = errors.New("product not found")
	ErrCategoryNotFound  = errors.New("category not found")
	ErrInsufficientStock = errors.New("insufficient stock")
	// Add more as needed, e.g., ErrUserNotFound, ErrInsufficientStock, etc.
)

// Custom error types can also carry more context if needed
type NotFoundError struct {
	Entity string
	ID     string // Or uuid.UUID, depending on context
}

func (e NotFoundError) Error() string {
	return e.Entity + " not found with ID: " + e.ID
}

func IsNotFoundError(err error) bool {
	var target NotFoundError
	return errors.As(err, &target)
}

// Or use errors.Is with sentinel errors
func IsProductNotFound(err error) bool {
	return errors.Is(err, ErrProductNotFound)
}

func IsCategoryNotFound(err error) bool {
	return errors.Is(err, ErrCategoryNotFound)
}


File: internal/services/discount_service.go
================================================
package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"time"

	"tech-store-backend/internal/db"
	"tech-store-backend/internal/models"
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

	// Validate that the product exists (you'd need a product query/service method)
	// Example: _, err = s.productService.GetProduct(ctx, productID)
	// if err != nil { return fmt.Errorf("failed to verify product: %w", err) }

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


File: Endpoints.md
================================================
# 🛠️ Tech Store API

**Backend for PC Parts, Laptops & Custom Build E-Commerce**\
_Version: 1.0 (MVP)_

> ✅ **Status**: Ready for frontend integration\
> 🚀 **Stack**: Go (Chi), PostgreSQL, JWT\
> 📅 **Last Updated**: Jan 7, 2026

---

## 🔐 Authentication

- **Anonymous access**: Allowed for `GET /products`, `GET /products/:id`,
  `GET /builds/:id` (public), etc.
- **User auth**: Bearer JWT via `Authorization: Bearer <token>`
- **Admin auth**: Same token; `is_admin: true` in JWT claims

### Token Flow

```http
POST /auth/login
→ 200 { "token": "xxx", "user": { "id": "uuid", "email": "...", "is_admin": false } }

POST /auth/register
→ 201 { "token": "xxx", "user": { ... } }
```

> 💡 Tokens are **short-lived (15m)** + **refresh tokens (7d, HTTP-only
> cookie)**.\
> Admin-only endpoints enforce `user.is_admin == true`.

---

## 📦 Product Discovery

| Method | Endpoint        | Description                           | Auth         | Rate Limit  |
| ------ | --------------- | ------------------------------------- | ------------ | ----------- |
| `GET`  | `/products`     | List products (paginated, filtered)   | ✅ Anonymous | 100 req/min |
| `GET`  | `/products/:id` | Get product details + specs + reviews | ✅ Anonymous | 200 req/min |
| `GET`  | `/categories`   | List all categories (tree-ready)      | ✅ Anonymous | —           |
| `GET`  | `/search`       | Full-text search + spec filters       | ✅ Anonymous | 60 req/min  |

### Query Params (`/products`)

```ts
{
  category?: string;    // slug (e.g., "gpu")
  brand?: string[];
  price_min?: number;   // in cents
  price_max?: number;
  in_stock?: boolean;
  spec?: Record<string, string>; // e.g., { "cpu_socket": "AM5", "cores": "8" }
  page?: number;        // default: 1
  per_page?: number;    // max: 50
}
```

### Response (`/products/:id`)

```json
{
  "id": "uuid",
  "name": "AMD Ryzen 7 7800X3D",
  "price_cents": 44900,
  "stock_quantity": 23,
  "brand": "AMD",
  "image_urls": ["https://..."],
  "specs": {
    "cpu_socket": "AM5",
    "cores": 8,
    "base_clock_ghz": 4.2,
    "tdp_watts": 120
  },
  "reviews": [
    {
      "rating": 5,
      "title": "Gaming Beast",
      "comment": "...",
      "is_verified_purchase": true,
      "created_at": "2026-01-01T12:00:00Z"
    }
  ],
  "compatibility_notes": "Requires AM5 motherboard. BIOS update may be needed for early B650 boards."
}
```

---

## 🛒 Cart & Checkout

| Method   | Endpoint             | Description                  | Auth         |
| -------- | -------------------- | ---------------------------- | ------------ |
| `GET`    | `/cart`              | Get current user’s cart      | ✅ User      |
| `POST`   | `/cart/items`        | Add item to cart             | ✅ User      |
| `PATCH`  | `/cart/items/:id`    | Update item qty              | ✅ User      |
| `DELETE` | `/cart/items/:id`    | Remove item                  | ✅ User      |
| `GET`    | `/delivery-services` | List active delivery options | ✅ Anonymous |
| `POST`   | `/checkout`          | Create order (final step)    | ✅ User      |

### `POST /cart/items`

```json
{ "product_id": "uuid", "quantity": 1 }
→ 201 { "cart_item": { "id": "...", "quantity": 1, "price_at_add_cents": 44900 } }
```

> ⚠️ **Cart sync**: Frontend merges localStorage cart on login via
> `PATCH /cart/merge` _(V2)_

### `POST /checkout`

```json
{
  "delivery_service_id": "uuid",
  "delivery_address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105",
    "country": "US"
  },
  "build_id": "uuid?"   // Optional: if ordering a saved build
}
→ 201 { "order": { "id": "...", "status": "pending", "total_cents": 125000 } }
→ 303 See Other → `Location: /checkout/stripe?session_id=cs_xxx`
```

> 🔁 **Idempotency**: Clients must send `Idempotency-Key: <uuid>` header for
> `POST /checkout`.

---

## ✍️ Reviews

| Method   | Endpoint                     | Description           | Auth                       |
| -------- | ---------------------------- | --------------------- | -------------------------- |
| `GET`    | `/products/:id/reviews`      | List approved reviews | ✅ Anonymous               |
| `POST`   | `/products/:id/reviews`      | Submit review         | ✅ User (must own product) |
| `PATCH`  | `/reviews/:id`               | Update review (user)  | ✅ Owner                   |
| `PATCH`  | `/admin/reviews/:id/approve` | Approve review        | ✅ Admin                   |
| `DELETE` | `/admin/reviews/:id`         | Delete review         | ✅ Admin                   |

### `POST /products/:id/reviews`

```json
{ "rating": 5, "title": "Fast & Cool", "comment": "Amazing for gaming..." }
→ 201 { "review": { "id": "...", "approved_at": null } } // pending
```

> ✅ **Verified purchase**: Backend auto-sets `is_verified_purchase = true` if
> user has order with this product.

---

## 🖥️ Custom Builds (MVP Core)

| Method  | Endpoint                 | Description                            | Auth                             |
| ------- | ------------------------ | -------------------------------------- | -------------------------------- |
| `POST`  | `/builds`                | Create new build                       | ✅ User / Anonymous*             |
| `GET`   | `/builds/:id`            | Get build (public or owned)            | ✅ Anonymous (if public) / Owner |
| `PATCH` | `/builds/:id`            | Update build name/description          | ✅ Owner                         |
| `PUT`   | `/builds/:id/components` | Set component in slot                  | ✅ Owner                         |
| `GET`   | `/builds/:id/validate`   | Check compatibility                    | ✅ Owner / Anonymous (if public) |
| `GET`   | `/user/builds`           | List user’s saved builds               | ✅ User                          |
| `POST`  | `/builds/:id/share`      | Make build public + get shareable link | ✅ Owner                         |

> \* Anonymous builds are stored in DB with `user_id = NULL` and
> `is_public = false`; saved via localStorage link token.

### `PUT /builds/:id/components`

```json
{ "slot": "cpu", "product_id": "uuid" }
→ 200 { "build": { "id": "...", "components": { "cpu": { ... }, "motherboard": null, ... } } }
```

### `GET /builds/:id/validate`

```json
→ 200 {
  "is_valid": false,
  "errors": [
    {
      "slot_a": "cpu",
      "slot_b": "motherboard",
      "rule": "CPU-MB Socket Match",
      "message": "CPU socket (AM5) ≠ Motherboard socket (AM4)"
    }
  ]
}
```

> 🧠 **Validation is real-time** — called after each component change in
> frontend.

---

## 📦 Orders & History

| Method | Endpoint              | Description           | Auth     |
| ------ | --------------------- | --------------------- | -------- |
| `GET`  | `/orders`             | List user’s orders    | ✅ User  |
| `GET`  | `/orders/:id`         | Get order details     | ✅ Owner |
| `POST` | `/orders/:id/reorder` | Add all items to cart | ✅ Owner |

### Response (`/orders/:id`)

```json
{
  "id": "uuid",
  "status": "shipped",
  "total_cents": 125000,
  "items": [
    { "product_id": "...", "name": "RTX 4080", "quantity": 1, "price_cents": 99900 }
  ],
  "delivery_service": { "name": "Express (2-day)", "price_cents": 1500 },
  "delivery_address": { ... },
  "created_at": "2026-01-01T12:00:00Z"
}
```

---

## 👨‍💼 Admin Endpoints (`/admin/*`)

| Method   | Endpoint                         | Description                  |
| -------- | -------------------------------- | ---------------------------- |
| `POST`   | `/admin/products`                | Create product               |
| `PUT`    | `/admin/products/:id`            | Update product (incl. specs) |
| `DELETE` | `/admin/products/:id`            | Soft-delete product          |
| `POST`   | `/admin/delivery-services`       | Create delivery service      |
| `PUT`    | `/admin/delivery-services/:id`   | Update delivery service      |
| `GET`    | `/admin/reviews`                 | List pending reviews         |
| `PATCH`  | `/admin/reviews/:id/approve`     | Approve review               |
| `DELETE` | `/admin/reviews/:id`             | Delete review                |
| `POST`   | `/admin/compatibility-rules`     | Create rule                  |
| `PUT`    | `/admin/compatibility-rules/:id` | Update rule                  |

### Product Creation (`POST /admin/products`)

```json
{
  "category_id": "uuid",
  "name": "ASUS ROG Strix B650E-F",
  "brand": "ASUS",
  "price_cents": 24900,
  "stock_quantity": 15,
  "spec_highlights": { "form_factor": "ATX", "wifi": true },
  "specs": [
    { "key": "motherboard_socket", "value": "AM5" },
    { "key": "ram_type", "value": "DDR5" },
    { "key": "pci_e_slots", "value": 2 }
  ]
}
```

> 📝 **Specs**: `key` must exist in `spec_definitions`.

---

## 📊 Error Handling

All errors follow RFC 7807 (`application/problem+json`):

```json
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://techstore.dev/errors/invalid-cart-item",
  "title": "Invalid Cart Item",
  "status": 400,
  "detail": "Product is out of stock",
  "instance": "/cart/items/abc-123",
  "invalid_params": [
    { "name": "product_id", "reason": "stock_quantity=0" }
  ]
}
```

| Status | Use Case                                            |
| ------ | --------------------------------------------------- |
| `400`  | Validation error (e.g., invalid spec, out of stock) |
| `401`  | Missing/invalid token                               |
| `403`  | Forbidden (e.g., non-admin accessing `/admin`)      |
| `404`  | Resource not found (soft-deleted included)          |
| `409`  | Conflict (e.g., build component incompatible)       |
| `422`  | Semantic errors (e.g., review on unowned product)   |
| `429`  | Rate limit exceeded                                 |
| `500`  | Server error (logged + alert)                       |

## 📈 Metrics & Observability

The API emits metrics for:

- Request rate / latency (per endpoint)
- Error rates (by status + type)
- Conversion funnel:\
  `product_view → add_to_cart → checkout_start → order_created`

Via Prometheus (`/metrics`) and structured JSON logs (with `request_id`
tracing).

---

## 🧪 Local Development

```bash
# Start DB
docker-compose up -d db

# Run migrations
make migrate

# Seed categories & spec definitions
make seed-core

# Run server
go run cmd/server/main.go
→ Listening on :8080
```

**Test accounts**:

- `user@example.com` / `password` (customer)
- `admin@example.com` / `password` (admin)

---

## 📦 Roadmap: Post-MVP Endpoints

| Version | Feature                    | New Endpoints                            |
| ------- | -------------------------- | ---------------------------------------- |
| **V2**  | Wishlist                   | `POST /wishlist`, `GET /wishlist`        |
| **V2**  | Offline Cart Sync          | `PATCH /cart/merge`                      |
| **V3**  | Build Performance Estimate | `GET /builds/:id/estimate`               |
| **V3**  | B2B Pricing                | `GET /products?customer_tier=enterprise` |


File: migrations/00005_create_delivery_service_table.sql
================================================
-- +goose Up
-- Create the 'delivery_services' table
CREATE TABLE delivery_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE, -- Unique name for the service
    description TEXT, -- Optional description
    base_cost_cents BIGINT NOT NULL DEFAULT 0, -- Base cost in cents
    estimated_days INTEGER, -- Estimated delivery time in days (optional)
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Whether the service is currently offered
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_delivery_services_is_active ON delivery_services(is_active); -- Index for filtering active services

-- +goose StatementBegin
COMMENT ON TABLE delivery_services IS 'Stores available delivery service options.';
COMMENT ON COLUMN delivery_services.name IS 'Unique name identifying the delivery service.';
COMMENT ON COLUMN delivery_services.description IS 'Optional description of the delivery service.';
COMMENT ON COLUMN delivery_services.base_cost_cents IS 'Base cost of the delivery service in cents.';
COMMENT ON COLUMN delivery_services.estimated_days IS 'Estimated number of days for delivery.';
COMMENT ON COLUMN delivery_services.is_active IS 'Indicates if the delivery service is currently offered.';
-- +goose StatementEnd

-- +goose Down
DROP TABLE IF EXISTS delivery_services;


File: migrations/00010_create_review_table.sql
================================================
-- +goose Up
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), -- Star rating (1 to 5)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE -- For soft deletes (optional, affects avg/num calculation)
);

-- Ensure a user can only rate a specific product once
CREATE UNIQUE INDEX idx_reviews_user_product_unique ON reviews(user_id, product_id) WHERE deleted_at IS NULL;

-- Indexes for common queries
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

-- +goose Down
DROP TABLE IF EXISTS reviews;


File: shared/types.go
================================================
package shared

type User struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	FullName  string `json:"full_name"`
	IsAdmin   bool   `json:"is_admin"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type ErrorResponse struct {
	Type     string                 `json:"type"`
	Title    string                 `json:"title"`
	Status   int                    `json:"status"`
	Detail   string                 `json:"detail"`
	Instance string                 `json:"instance,omitempty"`
	Errors   map[string]interface{} `json:"errors,omitempty"`
}

type Pagination struct {
	Page      int `json:"page"`
	PerPage   int `json:"per_page"`
	Total     int `json:"total"`
	TotalPage int `json:"total_page"`
}

type Product struct {
	ID               string                 `json:"id"`
	Name             string                 `json:"name"`
	Slug             string                 `json:"slug"`
	Description      string                 `json:"description"`
	ShortDescription string                 `json:"short_description"`
	PriceCents       int64                  `json:"price_cents"`
	StockQuantity    int                    `json:"stock_quantity"`
	Status           string                 `json:"status"`
	Brand            string                 `json:"brand"`
	ImageUrls        []string               `json:"image_urls"`
	SpecHighlights   map[string]interface{} `json:"spec_highlights"`
	CategoryID       string                 `json:"category_id"`
	CreatedAt        string                 `json:"created_at"`
	UpdatedAt        string                 `json:"updated_at"`
}

type Category struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Slug     string `json:"slug"`
	Type     string `json:"type"`
	ParentID string `json:"parent_id,omitempty"`
}


File: internal/db/queries/cart.sql
================================================
-- Cart Management
-- name: CreateUserCart :one
INSERT INTO carts (user_id, created_at, updated_at, deleted_at) -- Only user_id in the INSERT
VALUES (sqlc.arg(user_id), NOW(), NOW(), NULL) -- Uses sqlc.arg(user_id)
RETURNING id, user_id, session_id, created_at, updated_at, deleted_at;

-- name: CreateGuestCart :one
INSERT INTO carts (session_id, created_at, updated_at, deleted_at) -- Only session_id in the INSERT
VALUES (sqlc.arg(session_id), NOW(), NOW(), NULL) -- Uses sqlc.arg(session_id)
RETURNING id, user_id, session_id, created_at, updated_at, deleted_at;

-- name: GetCartByID :one
SELECT
    id,
    user_id,
    session_id,
    created_at,
    updated_at
FROM carts
WHERE id = sqlc.arg(cart_id) AND deleted_at IS NULL;

-- name: GetCartByUserID :one
SELECT
    id,
    user_id,
    session_id,
    created_at,
    updated_at
FROM carts
WHERE user_id = sqlc.arg(user_id) AND deleted_at IS NULL;

-- name: GetCartBySessionID :one
SELECT
    id,
    user_id,
    session_id,
    created_at,
    updated_at
FROM carts
WHERE session_id = sqlc.arg(session_id) AND deleted_at IS NULL;

-- Cart Item Management
-- name: CreateCartItem :one
INSERT INTO cart_items (cart_id, product_id, quantity, created_at, updated_at)
SELECT
    sqlc.arg(cart_id), -- $1
    sqlc.arg(product_id), -- $2
    sqlc.arg(quantity), -- $3
    NOW(),
    NOW()
FROM products
WHERE id = sqlc.arg(product_id) -- Check product exists
    AND stock_quantity >= sqlc.arg(quantity) -- Ensure enough stock for the INSERT
    AND status = 'active'
    AND deleted_at IS NULL
ON CONFLICT (cart_id, product_id)
DO UPDATE SET
    quantity = CASE
        WHEN cart_items.deleted_at IS NOT NULL THEN
            -- If the existing row was soft-deleted, check stock for the NEW requested quantity
            CASE
                WHEN (SELECT stock_quantity FROM products WHERE id = sqlc.arg(product_id)) >= sqlc.arg(quantity) THEN
                    sqlc.arg(quantity) -- Set to the NEW requested quantity if stock allows
                ELSE
                    -- Keep old quantity if stock check fails here
                    cart_items.quantity
            END
        ELSE
            -- If the existing row was NOT soft-deleted, add the new quantity and check total against stock
            LEAST(
                cart_items.quantity + sqlc.arg(quantity), -- Add new quantity
                (SELECT stock_quantity FROM products WHERE id = sqlc.arg(product_id)) -- Cap at stock
            )
    END,
    deleted_at = CASE
        WHEN cart_items.deleted_at IS NOT NULL THEN NULL -- Undelete if it was soft-deleted
        ELSE cart_items.deleted_at -- Keep deleted_at if it wasn't soft-deleted
    END,
    updated_at = NOW()
RETURNING
    id,
    cart_id,
    product_id,
    quantity,
    created_at,
    updated_at,
    deleted_at; -- Include deleted_at to see if undeletion happened

-- name: AddCartItemsBulk :execrows
-- Adds multiple items to a cart, handling upserts and soft deletes.
-- Checks stock availability for each item during the insert/update process.
INSERT INTO cart_items (cart_id, product_id, quantity, created_at, updated_at)
SELECT 
  sqlc.arg(cart_id), -- $1: The target cart ID
  input.product_id,
  input.quantity, -- Use the new requested quantity
  NOW(),
  NOW()
FROM (
  -- Prepare input data using UNNEST
  SELECT 
    UNNEST(sqlc.arg(product_ids)::uuid[]) as product_id, -- $2: Array of product IDs
    UNNEST(sqlc.arg(quantities)::int[]) as quantity      -- $3: Array of corresponding quantities
) as input
-- Join with products table to validate existence, status, deletion, and stock for the INSERT
INNER JOIN products p ON p.id = input.product_id
  AND p.stock_quantity >= input.quantity -- Ensure sufficient stock for the NEW quantity during INSERT
  AND p.status = 'active'
  AND p.deleted_at IS NULL
ON CONFLICT (cart_id, product_id)
DO UPDATE SET
  quantity = CASE
    -- If the existing row in cart_items was soft-deleted, check stock and set to NEW quantity
    WHEN cart_items.deleted_at IS NOT NULL THEN
      CASE
        -- Re-check stock against the NEW quantity being added via EXCLUDED (the values that would have been inserted)
        WHEN (SELECT stock_quantity FROM products WHERE id = EXCLUDED.product_id) >= EXCLUDED.quantity THEN
          EXCLUDED.quantity -- Set to the NEW quantity from the INSERT attempt (overwrites old soft-deleted quantity)
        ELSE
          -- If stock check fails for the new quantity, keep the old soft-deleted quantity.
          -- Alternatively, could raise an exception depending on desired behavior.
          cart_items.quantity
      END
    -- If the existing row was NOT soft-deleted, add the new quantity and check total against stock
    ELSE
      LEAST(
        cart_items.quantity + EXCLUDED.quantity, -- Add the new quantity
        (SELECT stock_quantity FROM products WHERE id = EXCLUDED.product_id) -- Cap at product's stock
      )
  END,
  -- Undelete the item if it was soft-deleted, otherwise leave its status unchanged
  deleted_at = CASE
    WHEN cart_items.deleted_at IS NOT NULL THEN NULL -- Undelete
    ELSE cart_items.deleted_at -- Keep as is
  END,
  updated_at = NOW();

-- name: SyncGuestCartItemsToUserCart :exec
-- Merges items from a guest cart into a user's cart using upsert logic.
-- Handles quantity updates, stock checks, and soft-delete state transitions (undeletion).
-- This query performs the core merge operation efficiently in a single statement.
INSERT INTO cart_items (cart_id, product_id, quantity, created_at, updated_at)
SELECT
    sqlc.arg(target_user_cart_id), -- $1: The destination user's cart ID
    ci.product_id,
    ci.quantity, -- Quantity from the guest cart item
    NOW(), -- New created_at timestamp for the entry in the user's cart
    NOW()  -- New updated_at timestamp for the user's cart
FROM
    cart_items ci -- Primary table: items from the source guest cart
INNER JOIN products p ON p.id = ci.product_id -- Join with products table to validate and get stock info at INSERT time
    AND p.stock_quantity >= ci.quantity -- Ensure sufficient stock for the NEW quantity during INSERT
    AND p.status = 'active'
    AND p.deleted_at IS NULL
WHERE
    ci.cart_id = sqlc.arg(source_guest_cart_id) -- Filter items from the specific guest cart
    AND ci.deleted_at IS NULL -- Only sync items not marked as deleted in the guest cart
ON CONFLICT (cart_id, product_id)
DO UPDATE SET
    -- In the UPDATE part (conflict resolution), handle merging with existing items in the user's cart
    quantity = CASE
        -- Scenario: The item exists in the user's cart but was soft-deleted.
        WHEN cart_items.deleted_at IS NOT NULL THEN
            CASE
                -- Re-check stock against the quantity being added from the guest cart (EXCLUDED.quantity).
                WHEN (SELECT stock_quantity FROM products WHERE id = EXCLUDED.product_id) >= EXCLUDED.quantity THEN
                    EXCLUDED.quantity -- Set to the guest cart's quantity (overwrites old soft-deleted quantity)
                ELSE
                    -- If stock check fails for the guest quantity, keep the old soft-deleted quantity.
                    cart_items.quantity
            END
        -- Scenario: The item exists in the user's cart and is NOT soft-deleted.
        ELSE
            -- Add the guest cart's quantity to the user's existing quantity.
            -- Use LEAST to cap the total at the product's available stock.
            LEAST(
                cart_items.quantity + EXCLUDED.quantity, -- Add guest quantity to existing quantity
                (SELECT stock_quantity FROM products WHERE id = EXCLUDED.product_id) -- Cap at product's stock
            )
    END,
    -- Handle the soft-delete state during the update.
    -- If the item was soft-deleted in the user's cart, undelete it.
    deleted_at = CASE
        WHEN cart_items.deleted_at IS NOT NULL THEN NULL -- Undelete if it was soft-deleted
        ELSE cart_items.deleted_at -- Keep existing state (likely NULL)
    END,
    updated_at = NOW(); -- Update the timestamp

-- name: GetCartItemsCount :one
-- Counts the number of active (non-deleted) items in a specific cart.
SELECT COUNT(*) AS num_cart_items
FROM cart_items
WHERE cart_id = sqlc.arg(cart_id) AND deleted_at IS NULL;

-- name: UpdateCartItemQuantity :one
UPDATE cart_items ci
SET quantity = sqlc.arg(new_quantity), updated_at = NOW()
FROM products p
WHERE ci.id = sqlc.arg(item_id)
    AND ci.product_id = p.id
    AND sqlc.arg(new_quantity) > 0
    AND sqlc.arg(new_quantity) <= p.stock_quantity  -- Stock validation
RETURNING
    ci.id,
    ci.cart_id,
    ci.product_id,
    ci.quantity,
    ci.created_at,
    ci.updated_at,
    p.name as product_name,
    p.price_cents as product_price_cents,
    p.stock_quantity as product_stock_quantity,
    p.image_urls as product_image_urls,
    p.brand as product_brand;

-- name: GetCartItemByID :one
SELECT
    id,
    cart_id,
    product_id,
    quantity,
    created_at,
    updated_at
FROM cart_items
WHERE id = sqlc.arg(item_id);

-- name: GetCartItemByCartAndProduct :one
SELECT
    id,
    cart_id,
    product_id,
    quantity,
    created_at,
    updated_at
FROM cart_items
WHERE cart_id = sqlc.arg(cart_id) AND product_id = sqlc.arg(product_id);

-- Enhanced Cart Data Retrieval
-- name: GetCartItemsWithProductDetails :many
SELECT
    ci.id,
    ci.cart_id,
    ci.product_id,
    ci.quantity,
    ci.created_at,
    ci.updated_at,
    p.name as product_name,
    p.price_cents as product_price_cents,
    p.stock_quantity as product_stock_quantity,
    p.image_urls as product_image_urls,
    p.brand as product_brand
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
WHERE ci.cart_id = sqlc.arg(cart_id)
    AND p.deleted_at IS NULL
    AND p.status = 'active'
ORDER BY ci.created_at DESC;

-- name: GetCartWithItemsAndProducts :many
SELECT
    c.id as cart_id,
    c.user_id as cart_user_id,
    c.session_id as cart_session_id,
    c.created_at as cart_created_at,
    c.updated_at as cart_updated_at,
    ci.id as cart_item_id,
    ci.cart_id as cart_item_cart_id,
    ci.product_id as cart_item_product_id,
    ci.quantity as cart_item_quantity,
    ci.created_at as cart_item_created_at,
    ci.updated_at as cart_item_updated_at,
    p.name as product_name,
    p.price_cents as product_price_cents,
    p.stock_quantity as product_stock_quantity,
    p.image_urls as product_image_urls,
    p.brand as product_brand
FROM carts c
LEFT JOIN cart_items ci ON c.id = ci.cart_id
LEFT JOIN products p ON ci.product_id = p.id
WHERE c.id = sqlc.arg(cart_id)
    AND ci.deleted_at is Null
    AND (p.deleted_at IS NULL OR p.id IS NULL)
ORDER BY ci.created_at DESC;

-- name: GetCartStats :one
SELECT
    COUNT(ci.id) as total_items,
    SUM(ci.quantity) FILTER (WHERE p.id IS NOT NULL) as total_quantity,
    SUM(ci.quantity * p.price_cents) FILTER (WHERE p.id IS NOT NULL) as total_value
FROM carts c
LEFT JOIN cart_items ci ON c.id = ci.cart_id
LEFT JOIN products p ON ci.product_id = p.id
WHERE c.id = sqlc.arg(cart_id)
    AND p.deleted_at IS NULL
    AND p.status = 'active';

-- Cart Cleanup
-- name: DeleteCartItem :exec
UPDATE cart_items
SET deleted_at = NOW()
WHERE id = sqlc.arg(item_id);

-- name: ClearCart :exec
UPDATE cart_items
SET deleted_at = NOW()
WHERE cart_id = sqlc.arg(cart_id);

-- name: DeleteCart :exec
UPDATE carts
SET deleted_at = NOW()
WHERE id = sqlc.arg(cart_id);


File: internal/models/context.go
================================================
package models

import (
	"context" // Import context package
)

type ContextUserKey string
const ContextKeyUser ContextUserKey = "user"

func GetUserFromContext(ctx context.Context) (*User, bool) {
	// Retrieve the value associated with the ContextKeyUser key from the context
	user, ok := ctx.Value(ContextKeyUser).(*User) // Type assertion
	// ctx.Value returns interface{}, so we assert it to *User
	return user, ok // Return the user object (or nil) and a boolean indicating success/failure
}



File: internal/models/user.go
================================================
package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID  `json:"id"`
	Email     string     `json:"email"`
	Password  string     `json:"-" validate:"required"`
	FullName  string     `json:"full_name"`
	IsAdmin   bool       `json:"is_admin"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
}

type UserLogin struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type UserRegister struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	FullName string `json:"full_name" validate:"max=100"`
}


func (ur *UserRegister) Validate() error {
	return Validate.Struct(ur)
}

func (ul *UserLogin) Validate() error {
	return Validate.Struct(ul)
}


File: internal/handlers/product.go
================================================
package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"tech-store-backend/internal/models"
	"tech-store-backend/internal/services"
	"tech-store-backend/internal/utils"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type ProductHandler struct {
	productService *services.ProductService
}

func NewProductHandler(productService *services.ProductService) *ProductHandler {
	return &ProductHandler{
		productService: productService,
	}
}

func (h *ProductHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	contentType := r.Header.Get("Content-Type")
	var createdProduct *models.Product
	var err error

	if strings.HasPrefix(contentType, "multipart/form-data") {
		slog.Debug("Handling multipart product creation request")

		createdProduct, err = h.createProductFromMultipart(r)
	} else if contentType == "application/json" || strings.HasPrefix(contentType, "application/json;") {
		slog.Debug("Handling JSON product creation request")

		createdProduct, err = h.createProductFromJSON(w, r)
	} else {
		utils.SendErrorResponse(w, http.StatusUnsupportedMediaType, "Unsupported Media Type", fmt.Sprintf("Unsupported Content-Type: %s", contentType))
		slog.Debug("Unsupported Content-Type received", "content_type", contentType)
		return
	}

	if err != nil {
		slog.Error("Failed to create product", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to create product")
		return
	}

	slog.Debug("Successfully created product", "product_id", createdProduct.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdProduct)
}

func (h *ProductHandler) createProductFromMultipart(r *http.Request) (*models.Product, error) {
	err := r.ParseMultipartForm(32 << 20) // 32 MB
	if err != nil {
		return nil, fmt.Errorf("error parsing multipart form: %w", err)
	}
	name := r.FormValue("name")
	descriptionStr := r.FormValue("description")
	var description *string
	if descriptionStr != "" {
		description = &descriptionStr
	}
	shortDescriptionStr := r.FormValue("short_description")
	var shortDescription *string
	if shortDescriptionStr != "" {
		shortDescription = &shortDescriptionStr
	}
	priceCentsStr := r.FormValue("price_cents")
	priceCents, err := strconv.ParseInt(priceCentsStr, 10, 64)
	if err != nil || priceCents < 0 {
		return nil, fmt.Errorf("invalid price_cents: %v", err)
	}
	stockQuantityStr := r.FormValue("stock_quantity")
	stockQuantity, err := strconv.Atoi(stockQuantityStr)
	if err != nil || stockQuantity < 0 {
		return nil, fmt.Errorf("invalid stock_quantity: %v", err)
	}
	status := r.FormValue("status")
	brand := r.FormValue("brand")
	categoryIDStr := r.FormValue("category_id")
	categoryID, err := uuid.Parse(categoryIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid category_id format: %v", err)
	}

	specHighlightsJSONStr := r.FormValue("spec_highlights")
	var specHighlights map[string]any
	if specHighlightsJSONStr != "" {
		if err := json.Unmarshal([]byte(specHighlightsJSONStr), &specHighlights); err != nil {
			return nil, fmt.Errorf("invalid spec_highlights JSON: %w", err)
		}
	} else {
		specHighlights = make(map[string]any) // Initialize as empty map if not provided
	}
	imageFileHeaders := r.MultipartForm.File["images"] // Get []*multipart.FileHeader

	req := models.CreateProductRequest{
		CategoryID:       categoryID,
		Name:             name,
		Description:      description,
		ShortDescription: shortDescription,
		PriceCents:       priceCents,
		StockQuantity:    stockQuantity, // Keep as int, service converts to int32
		Status:           status,
		Brand:            brand,
		ImageUrls:        []string{}, // Initialize as empty, will be filled by service
		SpecHighlights:   specHighlights,
	}

	err = req.Validate()
	if err != nil {
		return nil, fmt.Errorf("validation failed for text fields: %w", err)
	}

	return h.productService.CreateProductWithUpload(r.Context(), req, imageFileHeaders)
}

func (h *ProductHandler) createProductFromJSON(w http.ResponseWriter, r *http.Request) (*models.Product, error) {
	var req models.CreateProductRequest

	if err := DecodeAndValidateJSON(w, r, &req); err != nil {
		slog.Debug("Create product request failed validation/decoding", "error", err)
		return nil, err
	}

	product, err := h.productService.CreateProduct(r.Context(), req)
	if err != nil {
		return nil, err
	}

	return product, nil
}

func (h *ProductHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	identifier := chi.URLParam(r, "id")

	var product *models.Product
	var err error

	// Try to parse as UUID first (more specific format)
	if id, uuidErr := uuid.Parse(identifier); uuidErr == nil {
		// It's a UUID
		product, err = h.productService.GetProduct(r.Context(), id)
	} else {
		// Assume it's a slug
		product, err = h.productService.GetProductWithDiscountInfoBySlug(r.Context(), identifier)
	}

	if err != nil {
		slog.Debug("Product not found", "identifier", identifier, "error", err)
		utils.SendErrorResponse(w, http.StatusNotFound, "Not Found", "Product not found")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(product)
}

// Add new ListAllProducts endpoint (uses basic ListProducts function)
func (h *ProductHandler) ListAllProducts(w http.ResponseWriter, r *http.Request) {
	page := 1
	limit := 20

	pageStr := r.URL.Query().Get("page")
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	limitStr := r.URL.Query().Get("limit")
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	products, err := h.productService.ListAllProducts(r.Context(), page, limit)
	if err != nil {
		slog.Error("Failed to list all products", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to list products")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

func (h *ProductHandler) SearchProducts(w http.ResponseWriter, r *http.Request) {
	filter := models.ProductFilter{
		Page:  1,
		Limit: 20,
	}

	// Parse query parameters
	query := r.URL.Query()
	if q := query.Get("q"); q != "" {
		filter.Query = q
	}
	if categoryIDStr := query.Get("category_id"); categoryIDStr != "" {
		categoryID, err := uuid.Parse(categoryIDStr)
		if err == nil && categoryID != uuid.Nil {
			filter.CategoryID = categoryID
		}
	}
	if brand := query.Get("brand"); brand != "" {
		filter.Brand = brand
	}
	if pageStr := query.Get("page"); pageStr != "" {
		page, err := strconv.Atoi(pageStr)
		if err == nil && page > 0 {
			filter.Page = page
		}
	}
	if limitStr := query.Get("limit"); limitStr != "" {
		limit, err := strconv.Atoi(limitStr)
		if err == nil && limit > 0 && limit <= 100 {
			filter.Limit = limit
		}
	}
	if minPriceStr := query.Get("min_price"); minPriceStr != "" {
		minPrice, err := strconv.ParseInt(minPriceStr, 10, 64)
		if err == nil && minPrice >= 0 {
			filter.MinPrice = &minPrice
		}
	}
	if maxPriceStr := query.Get("max_price"); maxPriceStr != "" {
		maxPrice, err := strconv.ParseInt(maxPriceStr, 10, 64)
		if err == nil && maxPrice >= 0 {
			filter.MaxPrice = &maxPrice
		}
	}
	if inStockOnlyStr := query.Get("in_stock_only"); inStockOnlyStr != "" {
		inStockOnly := strings.ToLower(inStockOnlyStr) == "true"
		filter.InStockOnly = &inStockOnly
	}

	includeDiscountedOnlyStr := r.URL.Query().Get("include_discounted_only") // e.g., ?include_discounted_only=true
	var includeDiscountedOnly *bool
	if includeDiscountedOnlyStr != "" {
		includeDiscountedOnlyVal := strings.ToLower(includeDiscountedOnlyStr) == "true"
		includeDiscountedOnly = &includeDiscountedOnlyVal
		filter.IncludeDiscountedOnly = includeDiscountedOnly
	}

	specFilterStr := r.URL.Query().Get("spec_filter") // e.g., ?spec_filter=socket=AM5
	var specFilterKey, specFilterValue string
	if specFilterStr != "" {
		parts := strings.SplitN(specFilterStr, ":", 2) // Split on first ':' only
		if len(parts) == 2 {
			specFilterKey = strings.TrimSpace(parts[0])   // e.g., "socket"
			specFilterValue = strings.TrimSpace(parts[1]) // e.g., "AM5"
			slog.Debug("the filter key value for spec filter is", "key", specFilterKey, "value", specFilterValue)
		} else {
			utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid Spec Filter Format", "spec_filter must be in the format 'key=value'")
			return
		}
	}
	filter.SpecFilter = &specFilterStr
	products, err := h.productService.SearchProducts(r.Context(), filter, specFilterKey, specFilterValue)
	if err != nil {
		slog.Error("Failed to search products", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to search products")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

func (h *ProductHandler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	productID, err := ParseUUIDPathParam(w, r, "id")
	if err != nil {
		slog.Debug("Update product request failed to parse productID", "error", err)
		return // Error response already sent by helper
	}

	contentType := r.Header.Get("Content-Type")

	// --- Detect Content-Type and Parse Accordingly ---
	var updatedProduct *models.Product

	if strings.HasPrefix(contentType, "multipart/form-data") {
		slog.Debug("Handling multipart product update request", "product_id", productID)
		// Handle Multipart Form (File Uploads)
		updatedProduct, err = h.updateProductFromMultipart(r, productID)
	} else if contentType == "application/json" || strings.HasPrefix(contentType, "application/json;") {
		slog.Debug("Handling JSON product update request", "product_id", productID)
		// Handle Standard JSON - use the new helper-based logic
		updatedProduct, err = h.updateProductFromJSON(w, r, productID)
	} else {
		utils.SendErrorResponse(w, http.StatusUnsupportedMediaType, "Unsupported Media Type", fmt.Sprintf("Unsupported Content-Type: %s", contentType))
		slog.Debug("Unsupported Content-Type received for update", "content_type", contentType, "product_id", productID)
		return
	}

	if err != nil {
		// Map service errors more specifically if possible, or use a generic helper
		if strings.Contains(err.Error(), "product not found") {
			utils.SendErrorResponse(w, http.StatusNotFound, "Not Found", "Product not found")
			return
		}
		if strings.Contains(err.Error(), "category not found") {
			utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Category not found")
			return
		}
		slog.Error("Failed to update product", "error", err, "product_id", productID)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to update product")
		return
	}

	// Successfully updated product
	slog.Debug("Successfully updated product", "product_id", updatedProduct.ID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedProduct)
}

func (h *ProductHandler) updateProductFromJSON(w http.ResponseWriter, r *http.Request, productID uuid.UUID) (*models.Product, error) {
	var req models.UpdateProductRequest
	// Use the existing helper for JSON decoding and validation
	if err := DecodeAndValidateJSON(w, r, &req); err != nil {
		slog.Debug("Update product request failed validation/decoding", "error", err, "product_id", productID)
		return nil, err // Propagate error to main handler
	}

	// Call the service to update the product (passing the validated struct and ID)
	product, err := h.productService.UpdateProduct(r.Context(), productID, req)
	if err != nil {
		return nil, err // Propagate error to main handler
	}

	return product, nil
}

func (h *ProductHandler) updateProductFromMultipart(r *http.Request, productID uuid.UUID) (*models.Product, error) {
	err := r.ParseMultipartForm(32 << 20) // 32 MB
	if err != nil {
		return nil, fmt.Errorf("error parsing multipart form: %w", err)
	}

	var req models.UpdateProductRequest

	// Check if each field is present in the form and assign to the pointer in the struct
	if val := r.FormValue("name"); val != "" {
		req.Name = &val
	}
	if val := r.FormValue("description"); val != "" {
		req.Description = &val
	}
	if val := r.FormValue("short_description"); val != "" {
		req.ShortDescription = &val
	}
	if val := r.FormValue("price_cents"); val != "" {
		if parsedVal, err := strconv.ParseInt(val, 10, 64); err == nil && parsedVal >= 0 {
			req.PriceCents = &parsedVal
		} else {
			return nil, fmt.Errorf("invalid price_cents: %v", err)
		}
	}
	if val := r.FormValue("stock_quantity"); val != "" {
		if parsedVal, err := strconv.Atoi(val); err == nil && parsedVal >= 0 {
			req.StockQuantity = &parsedVal
		} else {
			return nil, fmt.Errorf("invalid stock_quantity: %v", err)
		}
	}
	if val := r.FormValue("status"); val != "" {
		req.Status = &val
	}
	if val := r.FormValue("brand"); val != "" {
		req.Brand = &val
	}
	if val := r.FormValue("category_id"); val != "" {
		if parsedUUID, err := uuid.Parse(val); err == nil {
			req.CategoryID = &parsedUUID
		} else {
			return nil, fmt.Errorf("invalid category_id format: %v", err)
		}
	}
	if val := r.FormValue("spec_highlights"); val != "" {
		var specHighlights map[string]any
		if err := json.Unmarshal([]byte(val), &specHighlights); err == nil {
			req.SpecHighlights = &specHighlights
		} else {
			return nil, fmt.Errorf("invalid spec_highlights JSON: %w", err)
		}
	}
	imageFiles := r.MultipartForm.File["images"]

	product, err := h.productService.UpdateProductWithUpload(
		r.Context(),
		productID,
		req,        // Pass the UpdateProductRequest struct
		imageFiles, // Pass the []*multipart.FileHeader
	)
	if err != nil {
		return nil, fmt.Errorf("service error during update with upload: %w", err)
	}

	return product, nil
}
func (h *ProductHandler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	// Use the helper for parsing UUID from path
	productID, err := ParseUUIDPathParam(w, r, "id")
	if err != nil {
		slog.Debug("Delete product request failed to parse productID", "error", err)
		return // Error response already sent by helper
	}

	err = h.productService.DeleteProduct(r.Context(), productID)
	if err != nil {
		if strings.Contains(err.Error(), "product not found") {
			utils.SendErrorResponse(w, http.StatusNotFound, "Not Found", "Product not found")
			return
		}
		slog.Error("Failed to delete product", "error", err, "product_id", productID)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to delete product")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Add new ListCategories endpoint
func (h *ProductHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := h.productService.ListCategories(r.Context())
	if err != nil {
		slog.Error("Failed to list categories", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to list categories")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

// Add new GetCategory endpoint that handles both ID and slug
func (h *ProductHandler) GetCategory(w http.ResponseWriter, r *http.Request) {
	identifier := chi.URLParam(r, "id")

	// Try to parse as UUID first (more specific format)
	if id, uuidErr := uuid.Parse(identifier); uuidErr == nil {
		// It's a UUID - get by ID
		category, err := h.productService.GetCategoryByID(r.Context(), id)
		if err != nil {
			if strings.Contains(err.Error(), "category not found") {
				utils.SendErrorResponse(w, http.StatusNotFound, "Not Found", "Category not found")
				return
			}
			utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to get category")
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(category)
		return
	} else {
		// Assume it's a slug - get by slug
		category, err := h.productService.GetCategoryBySlug(r.Context(), identifier)
		if err != nil {
			if strings.Contains(err.Error(), "category not found") {
				utils.SendErrorResponse(w, http.StatusNotFound, "Not Found", "Category not found")
				return
			}
			utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to get category")
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(category)
		return
	}
}

func (h *ProductHandler) RegisterRoutes(r chi.Router) {
	r.Post("/", h.CreateProduct)
	r.Get("/{id}", h.GetProduct)

	r.Get("/", h.ListAllProducts)
	r.Get("/categories", h.ListCategories)

	r.Get("/categories/{id}", h.GetCategory)

	r.Patch("/{id}", h.UpdateProduct)
	r.Delete("/{id}", h.DeleteProduct)

	r.Get("/search", h.SearchProducts)
}


File: internal/handlers/auth.go
================================================
package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"tech-store-backend/internal/models"
	"tech-store-backend/internal/services"
	"tech-store-backend/internal/utils"
	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
)

const RefreshTokenCookieName = "refresh_token" // Define a constant for the cookie name

type AuthHandler struct {
	authService *services.AuthService // Use AuthService instead of UserService directly for auth logic
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler { // Take AuthService
	return &AuthHandler{
		authService: authService,
	}
}

// Helper function to set the refresh token cookie
func setRefreshTokenCookie(w http.ResponseWriter, token string) {
	cookie := &http.Cookie{
		Name:     RefreshTokenCookieName,
		Value:    token,
		Path:     "/",                                 // Accessible from all paths under /
		HttpOnly: true,                                // Prevents JavaScript access (crucial for security)
		Secure:   true,                                // Requires HTTPS (set to false for local testing with http)
		SameSite: http.SameSiteStrictMode,             // CSRF protection
		MaxAge:   int((7 * 24 * time.Hour).Seconds()), // 7 days expiry (should match RT expiry in service)
		// Expires: time.Now().Add(7 * 24 * time.Hour), // Alternative to MaxAge
	}
	http.SetCookie(w, cookie)
}

// Helper function to clear the refresh token cookie
func clearRefreshTokenCookie(w http.ResponseWriter) {
	cookie := &http.Cookie{
		Name:     RefreshTokenCookieName,
		Value:    "", // Empty value
		Path:     "/",
		HttpOnly: true,
		Secure:   true, // Should match how it was set
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,              // Delete cookie
		Expires:  time.Unix(0, 0), // Expire immediately
	}
	http.SetCookie(w, cookie)
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.UserRegister
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid JSON", "Request body contains invalid JSON")
		return
	}

	if err := req.Validate(); err != nil {
		fieldErrors := make(map[string]string)
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			for _, err := range validationErrors {
				fieldErrors[err.Field()] = formatValidationError(err)
			}
		}
		utils.SendValidationError(w, fieldErrors)
		return
	}
	var guestSessionID string
	sessionCookie, err := r.Cookie("session_id")
	if err == nil { // Cookie found
		guestSessionID = sessionCookie.Value
		slog.Debug("Found guest session ID in cookie for registration", "session_id", guestSessionID)
	} else {
		slog.Debug("No guest session ID cookie found during registration", "error", err) // Usually means no guest cart
	}
	loginResp, refreshTokenStr, err := h.authService.Register(r.Context(), req.Email, req.Password, req.FullName, guestSessionID)
	if err != nil {
		if err.Error() == "user already exists" {
			utils.SendErrorResponse(w, http.StatusConflict, "User Already Exists", "A user with this email already exists")
			return
		}
		slog.Error("Failed to register user", "error", err, "email", req.Email)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to register user")
		return
	}

	slog.Info("User registered successfully", "user_id", loginResp.User.ID, "email", req.Email)

	// Set the refresh token as a secure HTTP-only cookie
	setRefreshTokenCookie(w, refreshTokenStr)

	// Send the response containing only the access token and user details (refresh token is in cookie)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)    // 201 Created for registration
	json.NewEncoder(w).Encode(loginResp) // Encode LoginResponse (without refresh token)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.UserLogin
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid JSON", "Request body contains invalid JSON")
		return
	}

	if err := req.Validate(); err != nil {
		fieldErrors := make(map[string]string)
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			for _, err := range validationErrors {
				fieldErrors[err.Field()] = formatValidationError(err)
			}
		}
		utils.SendValidationError(w, fieldErrors)
		return
	}
	var guestSessionID string
	sessionCookie, err := r.Cookie("session_id")
	if err == nil { // Cookie found
		guestSessionID = sessionCookie.Value
		slog.Debug("Found guest session ID in cookie for registration", "session_id", guestSessionID)
	} else {
		slog.Debug("No guest session ID cookie found during registration", "error", err) // Usually means no guest cart
	}

	// Use AuthService to handle login - now expects (LoginResponse, refreshTokenString, error)
	loginResp, refreshTokenStr, err := h.authService.Login(r.Context(), req.Email, req.Password, guestSessionID)
	if err != nil {
		if err.Error() == "invalid credentials" {
			slog.Info("Login failed: invalid credentials", "email", req.Email)
			utils.SendErrorResponse(w, http.StatusUnauthorized, "Invalid Credentials", "Invalid email or password")
			return
		}
		slog.Error("Failed to authenticate user", "error", err, "email", req.Email)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to authenticate user")
		return
	}

	slog.Info("User logged in successfully", "user_id", loginResp.User.ID, "email", loginResp.User.Email)

	// Set the refresh token as a secure HTTP-only cookie
	setRefreshTokenCookie(w, refreshTokenStr)

	// Send the response containing only the access token and user details (refresh token is in cookie)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(loginResp) // Encode LoginResponse (without refresh token)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	// Read the refresh token from the cookie
	refreshTokenCookie, err := r.Cookie(RefreshTokenCookieName)
	if err != nil {
		// Cookie not found or invalid
		slog.Warn("Refresh token cookie not found or invalid", "error", err)
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Unauthorized", "Refresh token not found or invalid")
		return
	}
	refreshTokenStr := refreshTokenCookie.Value

	// Call AuthService to perform the refresh logic (returns new access token and new refresh token string)
	newAccessToken, newRefreshTokenStr, err := h.authService.Refresh(r.Context(), refreshTokenStr)
	if err != nil {
		slog.Error("Failed to refresh token", "error", err)
		// Clear the invalid cookie if the token was rejected
		clearRefreshTokenCookie(w)
		// Return 401 for invalid/expired/revoked token
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Unauthorized", err.Error())
		return
	}

	// If rotation is enabled, set the *new* refresh token as the cookie
	if newRefreshTokenStr != "" {
		setRefreshTokenCookie(w, newRefreshTokenStr)
	}

	// Send the response containing only the new access token
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)                                                   // 200 OK
	json.NewEncoder(w).Encode(models.RefreshResponse{AccessToken: newAccessToken}) // Encode RefreshResponse (without refresh token)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Read the refresh token from the cookie
	refreshTokenCookie, err := r.Cookie(RefreshTokenCookieName)
	if err != nil {
		// Cookie not found. Log as warning, but treat as successful logout attempt.
		slog.Warn("Logout attempt without refresh token cookie", "error", err)
		// Still clear the cookie if it exists (might be stale)
		clearRefreshTokenCookie(w)
		w.WriteHeader(http.StatusNoContent) // 204 No Content
		return
	}
	refreshTokenStr := refreshTokenCookie.Value

	// Call AuthService to perform the logout/revocation logic
	err = h.authService.Logout(r.Context(), refreshTokenStr)
	if err != nil {
		slog.Error("Failed to logout", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to logout")
		return
	}

	// Clear the refresh token cookie after successful revocation
	clearRefreshTokenCookie(w)

	// Send 204 No Content on successful logout
	w.WriteHeader(http.StatusNoContent) // 204 No Content
}

func formatValidationError(err validator.FieldError) string {
	switch err.Tag() {
	case "required":
		return "This field is required"
	case "email":
		return "Must be a valid email address"
	case "min":
		return "Must be at least " + err.Param() + " characters"
	case "max":
		return "Must be no more than " + err.Param() + " characters"
	default:
		return "Invalid value"
	}
}

func (h *AuthHandler) RegisterRoutes(r chi.Router) {
	r.Post("/register", h.Register)
	r.Post("/login", h.Login)
	r.Post("/refresh", h.Refresh)
	r.Post("/logout", h.Logout) // Add logout route
}


File: internal/middleware/middleware.go
================================================
package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"tech-store-backend/internal/config"
	"tech-store-backend/internal/models"
	"tech-store-backend/internal/utils"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func JWTMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				// No token provided, allow request to proceed without adding user to context
				next.ServeHTTP(w, r)
				return
			}

			// Token is provided, attempt to validate it
			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return []byte(cfg.JWTSecret), nil
			})

			if err != nil || !token.Valid {
				slog.Warn("Invalid JWT token", "error", err)
				// Returning 401 here if token is present but invalid.
				utils.SendErrorResponse(w, http.StatusUnauthorized, "Unauthorized", "Invalid or expired token")
				return
			}

			// Token is valid, extract claims and add user to context
			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				slog.Error("Invalid JWT claims format")
				utils.SendErrorResponse(w, http.StatusUnauthorized, "Unauthorized", "Invalid token claims")
				return
			}

			userIDStr, ok := claims["user_id"].(string)
			if !ok {
				slog.Error("Missing user_id claim in JWT")
				utils.SendErrorResponse(w, http.StatusUnauthorized, "Unauthorized", "Invalid token: missing user_id")
				return
			}

			userID, err := uuid.Parse(userIDStr)
			if err != nil {
				slog.Error("Invalid user_id format in JWT", "user_id_str", userIDStr, "error", err)
				utils.SendErrorResponse(w, http.StatusUnauthorized, "Unauthorized", "Invalid token: malformed user_id")
				return
			}

			// Extract other claims if needed (email, isAdmin)
			email, _ := claims["email"].(string) // Use _ to ignore the boolean return value
			isAdmin, _ := claims["is_admin"].(bool)

			user := &models.User{
				ID:      userID,
				Email:   email,
				IsAdmin: isAdmin,
			}

			// Add user to the request context
			ctx := context.WithValue(r.Context(), models.ContextKeyUser, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := models.GetUserFromContext(r.Context())
		if !ok || user == nil || !user.IsAdmin {
			slog.Warn("Access denied: Admin access required or user not found in context", "user_found_in_context", ok, "user_is_nil", user == nil)
			utils.SendErrorResponse(w, http.StatusForbidden, "Forbidden", "Admin access required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ApplyMiddleware applies essential middleware for the application.
func ApplyMiddleware(r *chi.Mux) {
	// Essential middleware for production
	r.Use(middleware.RequestID) // Important for rate limiting
	r.Use(middleware.RealIP)    // Important for rate limiting, analytics and tracing
	r.Use(middleware.Timeout(60 * time.Second))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip, _ := httprate.KeyByIP(r)
			slog.Debug("Rate limiter middleware hit", "path", r.URL.Path, "ip", ip)
			next.ServeHTTP(w, r)
		})
	})
	r.Use(httprate.Limit(
		10,             // requests
		10*time.Second, // per duration
		httprate.WithKeyFuncs(httprate.KeyByIP, httprate.KeyByEndpoint),
	))
	// Logging middleware with structured logging
	r.Use(middleware.Logger)

	r.Use(middleware.Recoverer)
}


File: internal/services/cart_service.go
================================================
package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"tech-store-backend/internal/db"
	"tech-store-backend/internal/models"
	"tech-store-backend/internal/utils"
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
// It calculates enhanced totals: original value, discounted value, and savings.
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

	dbItemsWithProductAndDiscounts, err := s.querier.GetCartWithItemsAndProductsWithDiscounts(ctx, cartID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		s.logger.Error("Error fetching cart items with product details and discounts", "error", err, "cart_id", cartID)
		return nil, fmt.Errorf("failed to retrieve cart items with discounts: %w", err)
	}

	if len(dbItemsWithProductAndDiscounts) == 0 {
		// Return an empty summary if the cart exists but has no items
		return &models.CartSummary{
			ID:         cartID,
			UserID:     cartUserID,
			SessionID:  cartSessionID,
			CreatedAt:  cartCreatedAt,
			UpdatedAt:  cartUpdatedAt,
			Items:      []models.CartItemSummary{},
			TotalItems: 0,
			TotalQty:   0,
			// --- Initialize New Totals for Empty Cart ---
			TotalOriginalValueCents:   0,
			TotalDiscountedValueCents: 0,
			TotalSavingsCents:         0,
			// ---
		}, nil
	}

	// Calculate totals and build the summary model
	var totalItems, totalQuantity int
	var totalOriginalValueCents int64   // New field: Sum of (original_price * quantity)
	var totalDiscountedValueCents int64 // New field: Sum of (final_price * quantity)
	// var totalValueCents int64 // Old field, now represented by totalDiscountedValueCents
	items := make([]models.CartItemSummary, 0, len(dbItemsWithProductAndDiscounts)) // Pre-allocate slice

	// Use a map to track distinct product IDs for TotalItems count
	distinctProducts := make(map[uuid.UUID]bool)

	for _, itemRow := range dbItemsWithProductAndDiscounts {
		if itemRow.ProductName != nil {
			qty := int(*itemRow.ItemQuantity)                 // Quantity is a pointer because of emit_pointers_for_null_types
			originalPriceCents := *itemRow.OriginalPriceCents // Original price from the query (p.price_cents)
			finalPriceCents := itemRow.FinalPriceCents        // Final price from the query (vpcd.calculated_discounted_price_cents or fallback)

			// --- Calculate Item Subtotals ---
			itemOriginalSubtotalCents := originalPriceCents * int64(qty)
			itemFinalSubtotalCents := finalPriceCents * int64(qty)
			// ---

			// --- Accumulate Totals ---
			totalOriginalValueCents += itemOriginalSubtotalCents
			totalDiscountedValueCents += itemFinalSubtotalCents
			// totalValueCents += itemFinalSubtotalCents // Old calculation, now redundant
			// ---

			productID := itemRow.ItemProductID
			if !distinctProducts[productID] {
				totalItems++
				distinctProducts[productID] = true
			}
			totalQuantity += qty

			// Decode the image URLs JSONB array from []byte to []string
			var imageUrls []string
			if itemRow.ProductImageUrls != nil { // Check if JSONB column is not NULL
				err := json.Unmarshal(itemRow.ProductImageUrls, &imageUrls)
				if err != nil {
					s.logger.Warn("Failed to decode image URLs for product in cart", "product_id", itemRow.ItemProductID, "error", err)
					// Set an empty slice on error
					imageUrls = []string{}
				}
			} else {
				imageUrls = []string{} // Default to empty slice if image_urls is null in DB
			}

			productLite := &models.ProductLite{
				ID:                 itemRow.ItemProductID,         // Use ID from the joined query result
				Name:               *itemRow.ProductName,          // Use Name from the joined query result
				OriginalPriceCents: *itemRow.OriginalPriceCents,   // Include original price
				FinalPriceCents:    finalPriceCents,               // Use the final discounted price
				StockQuantity:      *itemRow.ProductStockQuantity, // Use Stock from the joined query result
				ImageUrls:          imageUrls,                     // Now properly decoded
				Brand:              *itemRow.ProductBrand,         // Use Brand from the joined query result
				HasActiveDiscount:  itemRow.HasActiveDiscount,     // Use the flag from the view
			}

			itemSummary := models.CartItemSummary{
				ID:       itemRow.ItemID,     // Use ID from the joined query result
				CartID:   itemRow.ItemCartID, // Use CartID from the joined query result
				Product:  productLite,        // Use the updated ProductLite
				Quantity: qty,                // Use quantity from the joined query result
			}
			items = append(items, itemSummary)
		} else {
			s.logger.Debug("Skipping cart item with missing/deleted product", "item_id", itemRow.ItemID, "product_id", itemRow.ItemProductID)
		}
	}

	totalOriginalValueCentsRounded := utils.RoundToDinarCents(totalOriginalValueCents)
	totalDiscountedValueCentsRounded := utils.RoundToDinarCents(totalDiscountedValueCents)
	// --- Calculate Final Savings ---
	totalSavingsCents := totalOriginalValueCentsRounded - totalDiscountedValueCentsRounded
	// ---
	return &models.CartSummary{
		ID:                        cartID,
		UserID:                    cartUserID,
		SessionID:                 cartSessionID,
		CreatedAt:                 cartCreatedAt,
		UpdatedAt:                 cartUpdatedAt,
		Items:                     items,
		TotalItems:                totalItems,
		TotalQty:                  totalQuantity,
		TotalOriginalValueCents:   totalOriginalValueCentsRounded,
		TotalDiscountedValueCents: totalDiscountedValueCentsRounded,
		TotalSavingsCents:         totalSavingsCents,
		// ---
		// Optionally, remove TotalValue or set it to the discounted value for backward compatibility if needed elsewhere.
		// TotalValue: totalDiscountedValueCents, // If TotalValue field is kept in the model
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
func (s *CartService) AddItemToCart(ctx context.Context, userID *uuid.UUID, sessionID string, productID uuid.UUID, quantity int) (*db.CartItem, error) {
	if quantity <= 0 {
		return nil, fmt.Errorf("quantity must be greater than 0")
	}
	// Validate product exists and get its details (including stock)
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

	productIDs := make([]uuid.UUID, len(items))
	quantities := make([]int32, len(items))

	for i, item := range items {
		productIDs[i] = item.ProductID
		quantities[i] = int32(item.Quantity)
	}

	params := db.AddCartItemsBulkParams{
		CartID:     cartID, // Use the fetched or created cart ID
		ProductIds: productIDs,
		Quantities: quantities,
	}
	rowsAffected, err := s.querier.AddCartItemsBulk(ctx, params)
	requestedItemsCount := int64(len(items))
	if err != nil {
		s.logger.Error("Failed to add bulk items to cart in DB", "error", err, "user_id", userID, "session_id", sessionID, "items", items)
		return fmt.Errorf("failed to add items to cart: %w", err)
	}

	if rowsAffected != requestedItemsCount {
		s.logger.Warn("Bulk add: not all items were added to cart", "user_id", userID, "session_id", sessionID, "requested", requestedItemsCount, "added", rowsAffected)
		return fmt.Errorf("some items could not be added to the cart (e.g., invalid product ID, insufficient stock, inactive product)")
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

// SyncGuestCartToUserCart merges items from a guest cart into a user's authenticated cart.
// It fetches the guest cart by sessionID, the user cart by userID, transfers items efficiently using a DB query,
// and clears the guest cart upon successful transfer.
func (s *CartService) SyncGuestCartToUserCart(ctx context.Context, guestSessionID string, userID uuid.UUID) error {
	if guestSessionID == "" {
		return fmt.Errorf("guest session ID cannot be empty for cart sync")
	}

	// --- Fetch or Ensure User Cart Header Exists ---
	var userCart db.GetCartByUserIDRow                            // Declare the variable to hold the user cart header info
	userCartResult, err := s.querier.GetCartByUserID(ctx, userID) // Use the existing query
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// User cart doesn't exist, create one using the specific query for users
			newUserCart, err := s.querier.CreateUserCart(ctx, userID) // Pass userID directly as argument
			if err != nil {
				return fmt.Errorf("failed to create cart for user %s during sync: %w", userID, err)
			}
			s.logger.Debug("Created new cart for user during sync", "user_id", userID, "cart_id", newUserCart.ID)

			// Assign the fields from the newly created cart (db.CreateUserCartRow) to the userCart variable (db.GetCartByUserIDRow)
			// This explicitly converts the struct types.
			userCart = db.GetCartByUserIDRow{
				ID:        newUserCart.ID,
				UserID:    newUserCart.UserID,
				SessionID: newUserCart.SessionID,
				CreatedAt: newUserCart.CreatedAt,
				UpdatedAt: newUserCart.UpdatedAt,
			}
		} else {
			return fmt.Errorf("failed to get user cart for user %s during sync: %w", userID, err)
		}
	} else {
		userCart = userCartResult
	}

	// --- Fetch Guest Cart Header ---
	guestCart, err := s.querier.GetCartBySessionID(ctx, &guestSessionID)
	if err != nil {
		// If the guest cart doesn't exist, nothing to sync. This is not an error for the login flow.
		if errors.Is(err, pgx.ErrNoRows) {
			s.logger.Debug("No guest cart found for session during sync", "session_id", guestSessionID)
			return nil
		}
		return fmt.Errorf("failed to get guest cart for session %s during sync: %w", guestSessionID, err)
	}
	// --- End Fetch Guest Cart Header ---

	// --- Check Guest Cart Items Count ---
	guestCartItemCount, err := s.querier.GetCartItemsCount(ctx, guestCart.ID) // You might need this simple count query
	if err != nil {
		return fmt.Errorf("failed to count items in guest cart %s during sync: %w", guestCart.ID, err)
	}
	if guestCartItemCount == 0 {
		s.logger.Debug("Guest cart is empty, nothing to sync", "session_id", guestSessionID, "guest_cart_id", guestCart.ID)
		return nil // Nothing to sync
	}
	// --- End Check Guest Cart Items Count ---

	// --- Perform the Sync using the new query ---
	params := db.SyncGuestCartItemsToUserCartParams{
		TargetUserCartID:  userCart.ID,  // Destination cart (ID from userCart variable)
		SourceGuestCartID: guestCart.ID, // Source cart
	}
	err = s.querier.SyncGuestCartItemsToUserCart(ctx, params)
	if err != nil {
		// Log error and return it - this is a critical failure in the sync process.
		s.logger.Error("Failed to sync guest cart items to user cart in DB", "user_id", userID, "guest_session_id", guestSessionID, "source_cart_id", guestCart.ID, "target_cart_id", userCart.ID, "error", err)
		return fmt.Errorf("failed to sync cart items: %w", err)
	}
	s.logger.Info("Guest cart items synced to user cart", "user_id", userID, "guest_session_id", guestSessionID, "source_cart_id", guestCart.ID, "target_cart_id", userCart.ID)
	// --- End Sync Query ---

	// --- Clear Guest Cart (after successful sync query) ---
	err = s.ClearCart(ctx, nil, guestSessionID) // Pass nil userID, sessionID to target the guest cart
	if err != nil {
		// Log error but don't fail the login/registration flow if clearing fails
		s.logger.Error("Failed to clear guest cart after sync", "session_id", guestSessionID, "guest_cart_id", guestCart.ID, "error", err)
		// Optionally, you could return the error here if clearing is critical.
		// For now, proceed assuming items were transferred.
	} else {
		s.logger.Debug("Successfully cleared guest cart after sync", "session_id", guestSessionID, "guest_cart_id", guestCart.ID)
	}
	// --- End Clear Guest Cart ---

	s.logger.Info("Cart sync completed successfully", "session_id", guestSessionID, "user_id", userID)
	return nil
}


File: migrations/00003_create_products_and_categories_tables.sql
================================================
-- +goose Up
-- Create categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'component', 'laptop', 'accessory'
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(255),
    price_cents BIGINT NOT NULL CHECK (price_cents >= 0), -- e.g., $199.99 → 19999
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'discontinued')),
    brand VARCHAR(100) NOT NULL,
    avg_rating NUMERIC(3,2) DEFAULT NULL,
    num_ratings INTEGER DEFAULT 0,
    image_urls JSONB NOT NULL DEFAULT '[]'::JSONB,
    spec_highlights JSONB NOT NULL DEFAULT '{}'::JSONB, -- { "cores": 16, "base_clock_ghz": 4.5 }
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_category_created ON products(category_id, created_at);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_active ON products(id) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_products_search ON products USING GIN (
    to_tsvector('english', name || ' ' || COALESCE(short_description, ''))
);
CREATE INDEX idx_products_spec_highlights ON products USING GIN (spec_highlights);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_price ON products(price_cents);
CREATE INDEX idx_products_stock ON products(stock_quantity);

-- Insert default categories
INSERT INTO categories (name, slug, type) VALUES
('CPU', 'cpu', 'component'),
('GPU', 'gpu', 'component'),
('Motherboard', 'motherboard', 'component'),
('RAM', 'ram', 'component'),
('Storage', 'storage', 'component'),
('Power Supply', 'psu', 'component'),
('Case', 'case', 'component'),
('Laptop', 'laptop', 'laptop'),
('Accessories', 'accessories', 'accessory');

-- +goose Down
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;


File: devbox.json
================================================
{
  "$schema": "https://raw.githubusercontent.com/jetify-com/devbox/0.16.0/.schema/devbox.schema.json",
  "packages": [
    "go@latest",
    "postgresql@latest",
    "goose@latest",
    "sqlc@latest",
    "github:seatedro/glimpse",
    "glow@latest",
    "nodejs@latest",
    "gcc",
    "redis@latest"
  ],
  "env": {
    "PGPORT": "5433"
  },
  "env_from": ".env",
  "shell": {
    "init_hook": [
      "echo 'Starting development environment....'",
      "devbox services ls"
    ],
    "scripts": {
      "run": [
        "just dev"
      ]
    }
  }
}


File: shared/types.ts
================================================
export interface User {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: Record<string, any>;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_page: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  price_cents: number;
  stock_quantity: number;
  status: string;
  brand: string;
  image_urls: string[];
  spec_highlights: Record<string, any>;
  category_id: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  type: string;
  parent_id?: string;
}


File: delivery.json
================================================
{
  "name": "Express Delivery",
  "description": "Fast delivery within 2-3 business days.",
  "base_cost_cents": 500,
  "estimated_days": 3,
  "is_active": true
}


File: internal/db/multi_discounts.sql.go
================================================
// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.30.0
// source: multi_discounts.sql

package db

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

const getProductWithMultiDiscountDetails = `-- name: GetProductWithMultiDiscountDetails :one
SELECT
    p.id,
    p.category_id,
    p.name,
    p.price_cents AS original_price_cents,
    -- ... other product fields ...
    d.id AS discount_id,
    d.code AS discount_code,
    d.discount_type AS discount_type,
    d.discount_value AS discount_value,
    d.created_at 
FROM products p
LEFT JOIN product_discounts pd ON p.id = pd.product_id
LEFT JOIN discounts d ON pd.discount_id = d.id AND d.is_active = TRUE AND NOW() BETWEEN d.valid_from AND d.valid_until
WHERE p.id = $1 AND p.deleted_at IS NULL
ORDER BY d.created_at ASC
`

type GetProductWithMultiDiscountDetailsRow struct {
	ID                 uuid.UUID          `json:"id"`
	CategoryID         uuid.UUID          `json:"category_id"`
	Name               string             `json:"name"`
	OriginalPriceCents int64              `json:"original_price_cents"`
	DiscountID         uuid.UUID          `json:"discount_id"`
	DiscountCode       *string            `json:"discount_code"`
	DiscountType       *string            `json:"discount_type"`
	DiscountValue      *int64             `json:"discount_value"`
	CreatedAt          pgtype.Timestamptz `json:"created_at"`
}

// Fetches a product and its active product-specific discounts.
// This might return multiple rows if there are multiple discounts.
// Aggregation into a list happens in Go.
func (q *Queries) GetProductWithMultiDiscountDetails(ctx context.Context, id uuid.UUID) (GetProductWithMultiDiscountDetailsRow, error) {
	row := q.db.QueryRow(ctx, getProductWithMultiDiscountDetails, id)
	var i GetProductWithMultiDiscountDetailsRow
	err := row.Scan(
		&i.ID,
		&i.CategoryID,
		&i.Name,
		&i.OriginalPriceCents,
		&i.DiscountID,
		&i.DiscountCode,
		&i.DiscountType,
		&i.DiscountValue,
		&i.CreatedAt,
	)
	return i, err
}


File: internal/db/db.go
================================================
// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.30.0

package db

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type DBTX interface {
	Exec(context.Context, string, ...interface{}) (pgconn.CommandTag, error)
	Query(context.Context, string, ...interface{}) (pgx.Rows, error)
	QueryRow(context.Context, string, ...interface{}) pgx.Row
}

func New(db DBTX) *Queries {
	return &Queries{db: db}
}

type Queries struct {
	db DBTX
}

func (q *Queries) WithTx(tx pgx.Tx) *Queries {
	return &Queries{
		db: tx,
	}
}


File: internal/db/queries/order.sql
================================================
-- name: CreateOrder :one
-- Creates a new order with denormalized address fields and returns its details.
INSERT INTO orders (
    user_id, user_full_name, status, total_amount_cents, payment_method,
    province, city, phone_number_1, phone_number_2,
    notes, delivery_service_id
) VALUES (
    sqlc.arg(user_id), sqlc.arg(user_full_name), sqlc.arg(status), sqlc.arg(total_amount_cents), sqlc.arg(payment_method),
    sqlc.arg(province), sqlc.arg(city), sqlc.arg(phone_number_1), sqlc.arg(phone_number_2),
    sqlc.arg(notes), sqlc.arg(delivery_service_id)
)
RETURNING id, user_id, user_full_name, status, total_amount_cents, payment_method,
         province, city, phone_number_1, phone_number_2,
         notes, delivery_service_id, created_at, updated_at, completed_at, cancelled_at;

-- name: InsertOrderItemsBulk :exec
-- Inserts multiple order items efficiently in a single query.
-- Requires arrays of equal length for product_ids, quantities, names, and prices_cents.
INSERT INTO order_items (order_id, product_id, product_name, price_cents, quantity)
SELECT
    sqlc.arg(order_id) AS order_id, -- The single order ID for all items
    unnest(sqlc.arg(product_ids)::UUID[]) AS product_id, -- Array of product IDs
    unnest(sqlc.arg(product_names)::TEXT[]) AS product_name, -- Array of product names (denormalized)
    unnest(sqlc.arg(prices_cents)::BIGINT[]) AS price_cents, -- Array of final prices (including discounts)
    unnest(sqlc.arg(quantities)::INTEGER[]) AS quantity; -- Array of quantities

-- name: GetOrder :one
-- Retrieves an order by its ID with denormalized address fields.
SELECT 
    id, user_id, user_full_name, status, total_amount_cents, payment_method,
    province, city, phone_number_1, phone_number_2,
    notes, delivery_service_id, created_at, updated_at, completed_at, cancelled_at
FROM orders
WHERE id = sqlc.arg(order_id);

-- name: GetOrderWithItems :many
-- Retrieves an order by its ID along with all its items, including denormalized address fields.
-- This query uses a join and might return multiple rows if there are items.
-- The service layer needs to aggregate these rows into a single Order object with a slice of OrderItems.
SELECT 
    o.id, o.user_id, o.user_full_name, o.status, o.total_amount_cents, o.payment_method,
    o.province, o.city, o.phone_number_1, o.phone_number_2,
    o.notes, o.delivery_service_id, o.created_at, o.updated_at, o.completed_at, o.cancelled_at,
    oi.id AS item_id, oi.order_id AS item_order_id, oi.product_id AS item_product_id,
    oi.product_name AS item_product_name, oi.price_cents AS item_price_cents,
    oi.quantity AS item_quantity, oi.subtotal_cents AS item_subtotal_cents,
    oi.created_at AS item_created_at, oi.updated_at AS item_updated_at
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.id = sqlc.arg(order_id)
ORDER BY oi.created_at ASC; -- Order items consistently

-- name: ListUserOrders :many
-- Retrieves a paginated list of orders for a specific user with denormalized address fields, optionally filtered by status.
-- Excludes cancelled orders by default. Admins should use ListAllOrders.
SELECT 
    id, user_id, user_full_name, status, total_amount_cents, payment_method,
    province, city, phone_number_1, phone_number_2,
    notes, delivery_service_id, created_at, updated_at, completed_at, cancelled_at
FROM orders
WHERE user_id = sqlc.arg(user_id)
  AND (sqlc.arg(filter_status)::TEXT = '' OR status = sqlc.arg(filter_status)) -- Filter by status if provided
  -- Explicitly exclude cancelled orders for user list
  AND cancelled_at IS NULL 
ORDER BY created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset); -- Page limit and offset

-- name: ListAllOrders :many
-- Retrieves a paginated list of all orders with denormalized address fields, optionally filtered by status or user_id.
-- Intended for admin use. Includes cancelled orders.
-- If filter_user_id is the zero UUID ('00000000-0000-0000-0000-000000000000'), it retrieves orders for all users.
-- If filter_status is an empty string (''), it retrieves orders of all statuses.
SELECT 
    id, user_id, user_full_name, status, total_amount_cents, payment_method,
    province, city, phone_number_1, phone_number_2,
    notes, delivery_service_id, created_at, updated_at, completed_at, cancelled_at
FROM orders
WHERE (sqlc.arg(filter_user_id)::UUID = '00000000-0000-0000-0000-000000000000'::UUID OR user_id = sqlc.arg(filter_user_id)) -- Filter by user_id if provided
  AND (sqlc.arg(filter_status)::TEXT = '' OR status = sqlc.arg(filter_status)) -- Filter by status if provided
ORDER BY created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset); -- Page limit and offset

-- name: UpdateOrder :one
-- Updates other details of an order (notes, timestamps).
-- Address fields are denormalized and set during creation.
UPDATE orders
SET
    notes = COALESCE(sqlc.narg(notes), notes), -- Use narg for potentially nil values
    updated_at = NOW()
WHERE id = sqlc.arg(order_id)
RETURNING id, user_id, user_full_name, status, total_amount_cents, payment_method,
         province, city, phone_number_1, phone_number_2,
         notes, delivery_service_id, created_at, updated_at, completed_at, cancelled_at;

-- name: UpdateOrderStatus :one
-- Updates the status of an order and manages completion/cancellation timestamps.
UPDATE orders
SET status = sqlc.arg(status),
    updated_at = NOW(),
    completed_at = CASE
        WHEN sqlc.arg(status) IN ('delivered', 'cancelled') AND completed_at IS NULL THEN NOW()
        ELSE completed_at -- Don't overwrite if already set
    END,
    cancelled_at = CASE
        WHEN sqlc.arg(status) = 'cancelled' AND cancelled_at IS NULL THEN NOW()
        ELSE cancelled_at -- Don't overwrite if already set
    END
WHERE id = sqlc.arg(order_id)
RETURNING id, user_id, user_full_name, status, total_amount_cents, payment_method,
         province, city, phone_number_1, phone_number_2,
         notes, delivery_service_id, created_at, updated_at, completed_at, cancelled_at;

-- name: GetOrderItemsByOrderID :many
-- Retrieves all items for a specific order ID.
SELECT 
    id, order_id, product_id, product_name, price_cents, quantity, subtotal_cents, created_at, updated_at
FROM order_items
WHERE order_id = sqlc.arg(order_id)
ORDER BY created_at ASC; -- Order items consistently

-- name: CancelOrder :one
-- Updates the status of an order to 'cancelled' and sets the cancelled_at and completed_at timestamps.
-- This is a soft cancellation.
UPDATE orders
SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    completed_at = COALESCE(completed_at, NOW()), -- Set completed_at if it wasn't already
    updated_at = NOW()
WHERE id = sqlc.arg(order_id)
RETURNING 
    id, user_id, user_full_name, status, total_amount_cents, payment_method,
    province, city, phone_number_1, phone_number_2,
    notes, delivery_service_id, 
    created_at, updated_at, completed_at, cancelled_at;

-- name: DecrementStockIfSufficient :one
-- Attempts to decrement the stock_quantity for a product by a given amount.
-- Succeeds only if the resulting stock_quantity would be >= 0.
-- Returns the updated product row if successful, or an error if insufficient stock.
-- Note: The RETURNING clause might not be strictly necessary if we only care about RowsAffected.
-- If RETURNING is omitted, the querier function will likely return sql.Result.
-- Let's include RETURNING to get the updated stock if needed for debugging/logging.
UPDATE products
SET stock_quantity = stock_quantity - sqlc.arg(decrement_amount)
WHERE id = sqlc.arg(product_id) AND stock_quantity >= sqlc.arg(decrement_amount) -- The crucial condition
RETURNING id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at, deleted_at;

-- name: IncrementStock :one
-- Increments the stock_quantity for a product by a given amount.
-- Suitable for releasing stock back when cancelling an order.
UPDATE products
SET stock_quantity = stock_quantity + sqlc.arg(increment_amount)
WHERE id = sqlc.arg(product_id)
RETURNING id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at, deleted_at;

-- name: InsertOrderItemsFromCart :exec
-- Inserts order items into the order_items table by copying them from the user's current cart.
-- This ensures the item details (product, name, price, quantity) reflect the exact state of the cart at order creation time.
-- It fetches the final price (including discounts) from the cart_items joined with the calculated discount view.
INSERT INTO order_items (order_id, product_id, product_name, price_cents, quantity, created_at)
SELECT
    sqlc.arg(order_id) AS order_id, -- The single order ID for all items
    ci.product_id,
    p.name AS product_name, -- Get the name from the products table
    COALESCE(vpcd.calculated_discounted_price_cents, p.price_cents) AS price_cents, -- Use the final price from the cart or fallback to original
    ci.quantity,
    NOW() -- Set the created_at timestamp for the order item
FROM
    cart_items ci
JOIN
    products p ON ci.product_id = p.id -- Join to get product name
LEFT JOIN
    v_products_with_calculated_discounts vpcd ON p.id = vpcd.product_id -- Join with the discount view to get final price
WHERE
    ci.cart_id = sqlc.arg(cart_id) -- Fetch items from the specific cart
    AND ci.deleted_at IS NULL; -- Only include items not marked as deleted in the cart


File: internal/handlers/helper.go
================================================
package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"tech-store-backend/internal/models"
	"tech-store-backend/internal/utils"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// DecodeAndValidateJSON reads the request body, decodes it into the target struct,
// and validates it using the validator library.
// It sends a 400 Bad Request response if decoding or validation fails.
func DecodeAndValidateJSON(w http.ResponseWriter, r *http.Request, target models.Validator) error {
	err := json.NewDecoder(r.Body).Decode(target)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Invalid JSON body.")
		return fmt.Errorf("invalid JSON: %w", err)
	}

	// Directly call Validate on target
	if err := target.Validate(); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", fmt.Sprintf("Validation failed: %v", err))
		return fmt.Errorf("validation failed: %w", err)
	}
	return nil
}

// ParseUUIDPathParam extracts a UUID from a named path parameter using chi.
// It sends a 400 Bad Request response if the parameter is missing or invalid.
func ParseUUIDPathParam(w http.ResponseWriter, r *http.Request, paramName string) (uuid.UUID, error) {
	paramStr := chi.URLParam(r, paramName)
	if paramStr == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", fmt.Sprintf("%s path parameter is required.", paramName))
		return uuid.Nil, fmt.Errorf("missing %s path parameter", paramName)
	}

	parsedUUID, err := uuid.Parse(paramStr)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", fmt.Sprintf("Invalid %s format.", paramName))
		return uuid.Nil, fmt.Errorf("invalid %s format: %w", paramName, err)
	}

	return parsedUUID, nil
}

// GetSessionIDFromHeader extracts the session ID from the X-Session-ID header.
// It sends a 400 Bad Request response if the header is missing.
func GetSessionIDFromHeader(w http.ResponseWriter, r *http.Request, logger *slog.Logger) (string, bool) {
	sessionID := r.Header.Get("X-Session-ID")
	if sessionID == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "A session ID header (X-Session-ID) is required.")
		logger.Debug("Missing X-Session-ID header")
		return "", false
	}
	return sessionID, true
}

// MapServiceErrToHTTPStatus attempts to map a service-layer error to an appropriate HTTP status code and message.
// It returns the status code and the detail message.
func MapServiceErrToHTTPStatus(err error) (int, string) {
	errMsg := strings.ToLower(err.Error())

	// Add more mappings as needed based on service error messages or types.
	if strings.Contains(errMsg, "not found") {
		return http.StatusNotFound, "Resource not found."
	}
	if strings.Contains(errMsg, "access denied") || strings.Contains(errMsg, "does not belong") {
		return http.StatusForbidden, "Access denied."
	}
	if strings.Contains(errMsg, "stock") || strings.Contains(errMsg, "check") || strings.Contains(errMsg, "constraint") {
		return http.StatusConflict, "Request conflicts with current state (e.g., insufficient stock)."
	}
	return http.StatusInternalServerError, "An internal server error occurred."
}

// SendServiceError sends an appropriate HTTP error response based on the service error.
func SendServiceError(w http.ResponseWriter, logger *slog.Logger, operation string, err error) {
	status, detail := MapServiceErrToHTTPStatus(err)
	logger.Error(fmt.Sprintf("Failed to %s", operation), "error", err)
	utils.SendErrorResponse(w, status, http.StatusText(status), detail)
}


File: internal/utils/roundup.go
================================================
package utils

import "math"

func RoundToDinarCents(cents int64) int64 {
	return int64(math.Round(float64(cents)/100.0)) * 100
}


File: internal/services/delivery_service.go
================================================
package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"tech-store-backend/internal/db"
	"tech-store-backend/internal/models"
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


File: internal/storage/storage.go
================================================
package storage

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"

	"github.com/google/uuid"
)

type Storer interface {
	UploadFile(file multipart.File, fileHeader *multipart.FileHeader) (string, error)
	DeleteFile(fileURL string) error
	GetFileURL(filename string) string
}

type LocalStorage struct {
	basePath     string
	publicPath   string     // The path portion of the URL that serves the files (e.g., "/uploads")
	allowedTypes []string   // e.g., ["image/jpeg", "image/png"]
	maxSize      int64      // e.g., 5 * 1024 * 1024 for 5MB
	mutex        sync.Mutex // Protect concurrent writes to the filesystem if needed (optional, depends on usage)
}

func NewLocalStorage(basePath, publicPath string, allowedTypes []string, maxSize int64) *LocalStorage {
	if err := os.MkdirAll(basePath, 0755); err != nil {
		panic(fmt.Sprintf("failed to create local storage base path %s: %v", basePath, err))
	}

	return &LocalStorage{
		basePath:     basePath,
		publicPath:   publicPath,
		allowedTypes: allowedTypes,
		maxSize:      maxSize,
	}
}

func (ls *LocalStorage) UploadFile(file multipart.File, fileHeader *multipart.FileHeader) (string, error) {
	ls.mutex.Lock()
	defer ls.mutex.Unlock()

	// --- Size Check ---
	if fileHeader.Size > ls.maxSize {
		return "", fmt.Errorf("file size %d exceeds maximum allowed size %d", fileHeader.Size, ls.maxSize)
	}

	// --- Type Check ---
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	allowed := false
	for _, allowedExt := range ls.allowedTypes { // Assuming ls.allowedTypes is []string
		if ext == "."+allowedExt {
			allowed = true
			break
		}
	}
	if !allowed {
		return "", fmt.Errorf("file type %s is not allowed, allowed types: %v", ext, ls.allowedTypes)
	}

	// --- Generate Unique Filename ---
	originalFilenameWithoutExt := strings.TrimSuffix(fileHeader.Filename, ext)
	// Sanitize the original name if necessary (remove/replace problematic characters)
	santizedFileNameWithoutExt := sanitize(originalFilenameWithoutExt)
	uuidPart := uuid.New().String()
	uniqueFilename := fmt.Sprintf("%s_%s%s", santizedFileNameWithoutExt, uuidPart, ext)
	// ---

	// --- Save File ---
	fullPath := filepath.Join(ls.basePath, uniqueFilename)

	dst, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to create destination file %s: %w", fullPath, err)
	}
	defer dst.Close()

	_, err = io.Copy(dst, file)
	if err != nil {
		// Clean up the partially created file on error
		os.Remove(fullPath)
		return "", fmt.Errorf("failed to copy uploaded file to %s: %w", fullPath, err)
	}
	// ---

	// --- Generate Public URL ---
	publicURL := fmt.Sprintf("%s/%s", strings.TrimSuffix(ls.publicPath, "/"), uniqueFilename)
	// ---

	return publicURL, nil
}

func (ls *LocalStorage) DeleteFile(fileURL string) error {
	ls.mutex.Lock()
	defer ls.mutex.Unlock()
	if !strings.HasPrefix(fileURL, ls.publicPath+"/") {
		return fmt.Errorf("file URL %s does not match base path %s", fileURL, ls.publicPath)
	}
	filename := strings.TrimPrefix(fileURL, ls.publicPath+"/")
	fullPath := filepath.Join(ls.basePath, filename)

	return os.Remove(fullPath)
}
func (ls *LocalStorage) GetFileURL(filename string) string {
	return fmt.Sprintf("%s/%s", strings.TrimSuffix(ls.publicPath, "/"), filename)
}
func sanitize(filename string) string {
	// Remove or replace characters that might be problematic in filenames
	// This is a basic example, might need expansion based on OS/filesystem requirements
	re := regexp.MustCompile(`[^a-zA-Z0-9._-]`)
	return re.ReplaceAllString(filename, "_")
}


File: migrations/00006_create_order_table.sql
================================================
-- +goose Up
-- Create the 'orders' table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Link to users table
    user_full_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')), -- Enum-like constraint
    total_amount_cents BIGINT NOT NULL DEFAULT 0, -- Total amount in cents
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash on Delivery', -- Fixed for COD system
    -- payment_status VARCHAR(20) DEFAULT 'pending', -- Could add if needed later
    province VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL, 
    phone_number_1 VARCHAR(255) NOT NULL,
    phone_number_2 VARCHAR(255),
    notes TEXT, -- Optional notes
    delivery_service_id UUID NOT NULL REFERENCES delivery_services(id), -- Link to delivery_services table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE, -- When status becomes 'delivered' or 'cancelled' (was nullable)
    cancelled_at TIMESTAMP WITH TIME ZONE  -- When status is explicitly set to 'cancelled' (nullable)
);
 
-- Create the 'order_items' table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE, -- Link to orders table
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT, -- Link to products table, prevent deletion if ordered
    product_name VARCHAR(255) NOT NULL, -- Denormalized product name for historical accuracy
    price_cents BIGINT NOT NULL, -- Price at time of order
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0), -- Quantity ordered
    subtotal_cents BIGINT GENERATED ALWAYS AS (price_cents * quantity) STORED, -- Computed subtotal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_delivery_service_id ON orders(delivery_service_id); -- Add index for delivery service

-- +goose Down
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;


File: migrations/00004_create_cart_table.sql
================================================
-- +goose Up
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT, -- For guest users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT user_or_session_id CHECK (
        (user_id IS NOT NULL AND session_id IS NULL) OR
        (user_id IS NULL AND session_id IS NOT NULL)
    ),
    -- Optionally, add separate UNIQUE constraints if needed:
    UNIQUE(user_id),-- Ensures one cart per user (if NULLs allowed, only one non-NULL allowed)
    UNIQUE(session_id) -- Ensures one cart per session ID
);

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(cart_id, product_id) -- One item per product per cart
);

-- Indexes for performance
CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_carts_session_id ON carts(session_id);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);

-- +goose Down
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;


File: ApiDocs.md
================================================
### Comprehensive API Endpoints

---

## Authentication (`/api/v1/auth`)

### `POST /api/v1/auth/register`

*   **Description:** Register a new user account.
*   **Method:** `POST`
*   **Headers:** None required.
*   **Request Body:** `application/json`
    ```json
    {
      "email": "user@example.com",
      "password": "securePassword123",
      "full_name": "Jane Smith"
    }
    ```
*   **Response:**
    *   **Code:** `201 Created`
    *   **Body:** `application/json`
        ```json
        {
          "access_token": "<jwt_access_token>",
          "user": {
            "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
            "email": "user@example.com",
            "full_name": "Jane Smith",
            "is_admin": false,
            "created_at": "2024-01-01T12:00:00Z",
            "updated_at": "2024-01-01T12:00:00Z"
          }
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors (e.g., invalid email format, weak password).
    *   `409 Conflict`: If a user with the provided email already exists.
    *   `500 Internal Server Error`: If there's a server-side failure during registration.

---

### `POST /api/v1/auth/login`

*   **Description:** Authenticate a user and obtain access and refresh tokens.
*   **Method:** `POST`
*   **Headers:** None required.
*   **Request Body:** `application/json`
    ```json
    {
      "email": "user@example.com",
      "password": "securePassword123"
    }
    ```
*   **Response:**
    *   **Code:** `200 OK`
    *   **Headers:** `Set-Cookie: refresh_token=<refresh_token_value>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`
    *   **Body:** `application/json`
        ```json
        {
          "access_token": "<jwt_access_token>",
          "user": {
            "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
            "email": "user@example.com",
            "full_name": "Jane Smith",
            "is_admin": false,
            "created_at": "2024-01-01T12:00:00Z",
            "updated_at": "2024-01-01T12:00:00Z"
          }
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors.
    *   `401 Unauthorized`: If the email or password is incorrect.
    *   `500 Internal Server Error`: If there's a server-side failure during authentication.

---

### `POST /api/v1/auth/refresh`

*   **Description:** Obtain a new access token using a valid refresh token.
*   **Method:** `POST`
*   **Headers:** `Cookie: refresh_token=<refresh_token_value>`
*   **Request Body:** None.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Headers:** `Set-Cookie: refresh_token=<new_refresh_token_value>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800` (if rotated)
    *   **Body:** `application/json`
        ```json
        {
          "access_token": "<new_jwt_access_token>"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON.
    *   `401 Unauthorized`: If the refresh token is invalid, expired, revoked, or not found in the cookie.
    *   `500 Internal Server Error`: If there's a server-side failure during token refresh.

---

### `POST /api/v1/auth/logout`

*   **Description:** Revoke the current user's refresh token.
*   **Method:** `POST`
*   **Headers:** `Cookie: refresh_token=<refresh_token_value>`
*   **Request Body:** None.
*   **Response:**
    *   **Code:** `204 No Content`
    *   **Headers:** `Set-Cookie: refresh_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=-1; Expires=Thu, 01 Jan 1970 00:00:00 GMT` (Clears cookie)
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON.
    *   `500 Internal Server Error`: If there's a server-side failure during logout.

---

## Public Products (`/api/v1/products`)

### `GET /api/v1/products`

*   **Description:** List all products with pagination.
*   **Method:** `GET`
*   **Headers:** None required.
*   **Query Parameters:**
    *   `page` (Optional, `integer`): Page number for pagination (1-indexed). Defaults to `1`.
    *   `limit` (Optional, `integer`): Number of products per page. Defaults to `20`.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          {
            "id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
            "name": "Laptop",
            "description": "High-performance laptop",
            "price_cents": 150000,
            "stock_quantity": 10,
            "image_url": "https://example.com/images/laptop.jpg",
            "category_id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
            "created_at": "2024-01-01T12:00:00Z",
            "updated_at": "2024-01-01T12:00:00Z"
          },
          // ... more products ...
        ]
        ```
*   **Errors:**
    *   `500 Internal Server Error`: If there's a server-side failure fetching the product list.

---

### `GET /api/v1/products/{id}`

*   **Description:** Get details of a specific product.
*   **Method:** `GET`
*   **Headers:** None required.
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the product.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
          "name": "Laptop",
          "description": "High-performance laptop",
          "price_cents": 150000,
          "stock_quantity": 10,
          "image_url": "https://example.com/images/laptop.jpg",
          "category_id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
          "created_at": "2024-01-01T12:00:00Z",
          "updated_at": "2024-01-01T12:00:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `404 Not Found`: If no product exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the product details.

---

### `GET /api/v1/products/search`

*   **Description:** Search for products by name or description.
*   **Method:** `GET`
*   **Headers:** None required.
*   **Query Parameters:**
    *   `q` (Required, `string`): The search query term.
    *   `page` (Optional, `integer`): Page number for pagination (1-indexed). Defaults to `1`.
    *   `limit` (Optional, `integer`): Number of products per page. Defaults to `20`.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          {
            "id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
            "name": "Laptop",
            "description": "High-performance laptop",
            "price_cents": 150000,
            "stock_quantity": 10,
            "image_url": "https://example.com/images/laptop.jpg",
            "category_id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
            "created_at": "2024-01-01T12:00:00Z",
            "updated_at": "2024-01-01T12:00:00Z"
          },
          // ... more matching products ...
        ]
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `q` query parameter is missing.
    *   `500 Internal Server Error`: If there's a server-side failure during the search.

---

### `GET /api/v1/products/categories`

*   **Description:** List all product categories.
*   **Method:** `GET`
*   **Headers:** None required.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          {
            "id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
            "name": "Electronics",
            "description": "Electronic devices and accessories",
            "created_at": "2024-01-01T12:00:00Z",
            "updated_at": "2024-01-01T12:00:00Z"
          },
          // ... more categories ...
        ]
        ```
*   **Errors:**
    *   `500 Internal Server Error`: If there's a server-side failure fetching the category list.

---

### `GET /api/v1/products/categories/{id}`

*   **Description:** Get details of a specific category.
*   **Method:** `GET`
*   **Headers:** None required.
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the category.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
          "name": "Electronics",
          "description": "Electronic devices and accessories",
          "created_at": "2024-01-01T12:00:00Z",
          "updated_at": "2024-01-01T12:00:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `404 Not Found`: If no category exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the category details.

---

## User Cart (`/api/v1/cart`)

*   **Access:** Requires a valid JWT token in the `Authorization: Bearer <token>` header.

### `GET /api/v1/cart`

*   **Description:** Get the current user's cart contents.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "items": [
            {
              "product_id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
              "name": "Laptop",
              "price_cents": 150000,
              "quantity": 2,
              "subtotal_cents": 300000
            }
            // ... more items ...
          ],
          "total_price_cents": 300000
        }
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the cart.

---

### `POST /api/v1/cart/add`

*   **Description:** Add an item to the current user's cart.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Request Body:** `application/json`
    ```json
    {
      "product_id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
      "quantity": 1
    }
    ```
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "items": [
            // ... updated cart items ...
          ],
          "total_price_cents": 150000
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors (e.g., invalid product ID, quantity <= 0).
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `404 Not Found`: If the specified `product_id` does not exist.
    *   `409 Conflict`: If the requested quantity exceeds the available stock.
    *   `500 Internal Server Error`: If there's a server-side failure adding the item.

---

### `POST /api/v1/cart/remove`

*   **Description:** Remove an item from the current user's cart.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Request Body:** `application/json`
    ```json
    {
      "product_id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1"
    }
    ```
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "items": [
            // ... updated cart items (item removed) ...
          ],
          "total_price_cents": 0
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors (e.g., invalid product ID).
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `404 Not Found`: If the specified `product_id` is not in the current user's cart.
    *   `500 Internal Server Error`: If there's a server-side failure removing the item.

---

### `POST /api/v1/cart/update`

*   **Description:** Update the quantity of an item in the current user's cart.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Request Body:** `application/json`
    ```json
    {
      "product_id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
      "quantity": 3
    }
    ```
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "items": [
            // ... updated cart items (quantity changed) ...
          ],
          "total_price_cents": 450000
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors (e.g., invalid product ID, quantity <= 0).
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `404 Not Found`: If the specified `product_id` is not in the current user's cart.
    *   `409 Conflict`: If the requested quantity exceeds the available stock.
    *   `500 Internal Server Error`: If there's a server-side failure updating the item.

---

### `POST /api/v1/cart/clear`

*   **Description:** Remove all items from the current user's cart.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Request Body:** None.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "items": [],
          "total_price_cents": 0
        }
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `500 Internal Server Error`: If there's a server-side failure clearing the cart.

---

## User Orders (`/api/v1/orders`)

*   **Access:** Requires a valid JWT token in the `Authorization: Bearer <token>` header.

### `POST /api/v1/orders`

*   **Description:** Create a new order from the current user's cart.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Request Body:** `application/json`
    ```json
    {
      "shipping_address": {
        "street": "123 Main St",
        "city": "Anytown",
        "zip": "12345"
      },
      "billing_address": {
        "street": "123 Main St",
        "city": "Anytown",
        "zip": "12345"
      },
      "notes": "Leave at door",
      "delivery_service_id": "d1e2f3g4-h5i6-7890-jklm-nopqrstuvwx"
    }
    ```
*   **Response:**
    *   **Code:** `201 Created`
    *   **Body:** `application/json`
        ```json
        {
          "id": "e1f2g3h4-i5j6-7890-klmn-opqrstuvwxy1",
          "user_id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
          "status": "pending",
          "total_amount_cents": 150000,
          "payment_method": "Cash on Delivery",
          "shipping_address": {
            "street": "123 Main St",
            "city": "Anytown",
            "zip": "12345"
          },
          "billing_address": {
            "street": "123 Main St",
            "city": "Anytown",
            "zip": "12345"
          },
          "notes": "Leave at door",
          "delivery_service_id": "d1e2f3g4-h5i6-7890-jklm-nopqrstuvwx",
          "created_at": "2024-02-01T10:00:00Z",
          "updated_at": "2024-02-01T10:00:00Z",
          "items": [
            {
              "product_id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
              "name": "Laptop",
              "price_per_unit_cents": 150000,
              "quantity": 1,
              "subtotal_cents": 150000
            }
          ]
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors.
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `409 Conflict`: If the cart is empty, or if stock levels changed during order processing.
    *   `500 Internal Server Error`: If there's a server-side failure creating the order.

---

### `GET /api/v1/orders/{id}`

*   **Description:** Get details of a specific order belonging to the current user.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the order.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "id": "e1f2g3h4-i5j6-7890-klmn-opqrstuvwxy1",
          "user_id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
          "status": "pending",
          "total_amount_cents": 150000,
          "payment_method": "Cash on Delivery",
          "shipping_address": {
            "street": "123 Main St",
            "city": "Anytown",
            "zip": "12345"
          },
          "billing_address": {
            "street": "123 Main St",
            "city": "Anytown",
            "zip": "12345"
          },
          "notes": "Leave at door",
          "delivery_service_id": "d1e2f3g4-h5i6-7890-jklm-nopqrstuvwx",
          "created_at": "2024-02-01T10:00:00Z",
          "updated_at": "2024-02-01T10:00:00Z",
          "items": [
            {
              "product_id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
              "name": "Laptop",
              "price_per_unit_cents": 150000,
              "quantity": 1,
              "subtotal_cents": 150000
            }
          ]
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the order does not belong to the current user.
    *   `404 Not Found`: If no order exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the order details.

---

### `GET /api/v1/orders`

*   **Description:** List orders for the current user with pagination.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Query Parameters:**
    *   `page` (Optional, `integer`): Page number for pagination (1-indexed). Defaults to `1`.
    *   `limit` (Optional, `integer`): Number of orders per page. Defaults to `20`.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          {
            "id": "e1f2g3h4-i5j6-7890-klmn-opqrstuvwxy1",
            "user_id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
            "status": "pending",
            "total_amount_cents": 150000,
            "payment_method": "Cash on Delivery",
            "shipping_address": {
              "street": "123 Main St",
              "city": "Anytown",
              "zip": "12345"
            },
            "billing_address": {
              "street": "123 Main St",
              "city": "Anytown",
              "zip": "12345"
            },
            "notes": "Leave at door",
            "delivery_service_id": "d1e2f3g4-h5i6-7890-jklm-nopqrstuvwx",
            "created_at": "2024-02-01T10:00:00Z",
            "updated_at": "2024-02-01T10:00:00Z",
            "items": [
              // ... items array ...
            ]
          },
          // ... more orders ...
        ]
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the order list.

---

## Delivery Options (`/api/v1/delivery-options`)

*   **Access:** Requires a valid JWT token in the `Authorization: Bearer <token>` header.

### `GET /api/v1/delivery-options`

*   **Description:** Get the list of active delivery services available for checkout.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          {
            "id": "d1e2f3g4-h5i6-7890-jklm-nopqrstuvwx",
            "name": "Standard Delivery",
            "description": "Delivered within 5-7 business days",
            "base_cost_cents": 500,
            "estimated_days": 7,
            "is_active": true,
            "created_at": "2024-01-01T12:00:00Z",
            "updated_at": "2024-01-01T12:00:00Z"
          },
          // ... more active delivery services ...
        ]
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the delivery options.

---

## Admin Products (`/api/v1/admin/products`)

*   **Access:** Requires a valid admin JWT token in the `Authorization: Bearer <token>` header.

### `POST /api/v1/admin/products`

*   **Description:** Create a new product.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Request Body:** `application/json`
    ```json
    {
      "name": "Smartphone",
      "description": "Latest model smartphone",
      "price_cents": 80000,
      "stock_quantity": 50,
      "image_url": "https://example.com/images/smartphone.jpg",
      "category_id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx"
    }
    ```
*   **Response:**
    *   **Code:** `201 Created`
    *   **Body:** `application/json`
        ```json
        {
          "id": "f1g2h3i4-j5k6-7890-lmno-pqrstuvwxyza",
          "name": "Smartphone",
          "description": "Latest model smartphone",
          "price_cents": 80000,
          "stock_quantity": 50,
          "image_url": "https://example.com/images/smartphone.jpg",
          "category_id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
          "created_at": "2024-02-01T11:00:00Z",
          "updated_at": "2024-02-01T11:00:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `500 Internal Server Error`: If there's a server-side failure creating the product.

---

### `GET /api/v1/admin/products/{id}`

*   **Description:** Get details of a specific product.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the product.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
          "name": "Laptop",
          "description": "High-performance laptop",
          "price_cents": 150000,
          "stock_quantity": 10,
          "image_url": "https://example.com/images/laptop.jpg",
          "category_id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
          "created_at": "2024-01-01T12:00:00Z",
          "updated_at": "2024-01-01T12:00:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no product exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the product details.

---

### `PATCH /api/v1/admin/products/{id}`

*   **Description:** Update an existing product.
*   **Method:** `PATCH`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the product.
*   **Request Body:** `application/json` (partial update allowed)
    ```json
    {
      "price_cents": 145000,
      "stock_quantity": 8
    }
    ```
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
          "name": "Laptop",
          "description": "High-performance laptop",
          "price_cents": 145000,
          "stock_quantity": 8,
          "image_url": "https://example.com/images/laptop.jpg",
          "category_id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
          "created_at": "2024-01-01T12:00:00Z",
          "updated_at": "2024-02-01T11:30:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no product exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure updating the product.

---

### `DELETE /api/v1/admin/products/{id}`

*   **Description:** Delete a specific product.
*   **Method:** `DELETE`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the product.
*   **Response:**
    *   **Code:** `204 No Content`
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no product exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure deleting the product.

---

### `GET /api/v1/admin/products`

*   **Description:** List all products (admin view).
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Query Parameters:**
    *   `page` (Optional, `integer`): Page number for pagination (1-indexed). Defaults to `1`.
    *   `limit` (Optional, `integer`): Number of products per page. Defaults to `20`.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          // ... same product objects as GET /api/v1/products ...
        ]
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the product list.

---

## Admin Orders (`/api/v1/admin/orders`)

*   **Access:** Requires a valid admin JWT token in the `Authorization: Bearer <token>` header.

### `GET /api/v1/admin/orders/all`

*   **Description:** List all orders across all users with optional pagination.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Query Parameters:**
    *   `page` (Optional, `integer`): Page number for pagination (1-indexed). Defaults to `1`.
    *   `limit` (Optional, `integer`): Number of orders per page. Defaults to `20`.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          // ... order objects ...
        ]
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the order list.

---

### `GET /api/v1/admin/orders/{id}`

*   **Description:** Get details of *any* specific order.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the order.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        // ... full order object ...
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no order exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the order details.

---

### `PUT /api/v1/admin/orders/{id}/status`

*   **Description:** Update the status of *any* specific order.
*   **Method:** `PUT`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the order.
*   **Request Body:** `application/json`
    ```json
    {
      "status": "shipped" // Valid values: pending, confirmed, shipped, delivered, cancelled
    }
    ```
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        // ... updated order object ...
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON, contains validation errors, or specifies an invalid status.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no order exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure updating the order status.

---

### `PUT /api/v1/admin/orders/{id}/cancel`

*   **Description:** Cancel *any* specific order.
*   **Method:** `PUT`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the order.
*   **Request Body:** None.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        // ... updated order object with status "cancelled" ...
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no order exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure cancelling the order.

---

## Admin Delivery Services (`/api/v1/admin/delivery-services`)

*   **Access:** Requires a valid admin JWT token in the `Authorization: Bearer <token>` header.

### `POST /api/v1/admin/delivery-services`

*   **Description:** Create a new delivery service.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Request Body:** `application/json`
    ```json
    {
      "name": "Express Delivery",
      "description": "Delivered within 2-3 business days",
      "base_cost_cents": 1500,
      "estimated_days": 3,
      "is_active": true
    }
    ```
*   **Response:**
    *   **Code:** `201 Created`
    *   **Body:** `application/json`
        ```json
        {
          "id": "g1h2i3j4-k5l6-7890-mnop-qrstuvwxyzab",
          "name": "Express Delivery",
          "description": "Delivered within 2-3 business days",
          "base_cost_cents": 1500,
          "estimated_days": 3,
          "is_active": true,
          "created_at": "2024-02-01T11:15:00Z",
          "updated_at": "2024-02-01T11:15:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `500 Internal Server Error`: If there's a server-side failure creating the delivery service.

---

### `GET /api/v1/admin/delivery-services/{id}`

*   **Description:** Get details of a specific delivery service.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the delivery service.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "id": "d1e2f3g4-h5i6-7890-jklm-nopqrstuvwx",
          "name": "Standard Delivery",
          "description": "Delivered within 5-7 business days",
          "base_cost_cents": 500,
          "estimated_days": 7,
          "is_active": true,
          "created_at": "2024-01-01T12:00:00Z",
          "updated_at": "2024-01-01T12:00:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no delivery service exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the delivery service details.

---

### `GET /api/v1/admin/delivery-services`

*   **Description:** List delivery services with optional filtering by active status.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Query Parameters:**
    *   `active_only` (Optional, `string`): If `"true"`, only returns active services. Defaults to `"false"` (returns all).
    *   `page` (Optional, `integer`): Page number for pagination (1-indexed). Defaults to `1`.
    *   `limit` (Optional, `integer`): Number of services per page. Defaults to `20`.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          // ... delivery service objects ...
        ]
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the delivery service list.

---

### `PATCH /api/v1/admin/delivery-services/{id}`

*   **Description:** Update an existing delivery service.
*   **Method:** `PATCH`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the delivery service.
*   **Request Body:** `application/json` (partial update allowed)
    ```json
    {
      "is_active": false
    }
    ```
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "id": "d1e2f3g4-h5i6-7890-jklm-nopqrstuvwx",
          "name": "Standard Delivery",
          "description": "Delivered within 5-7 business days",
          "base_cost_cents": 500,
          "estimated_days": 7,
          "is_active": false,
          "created_at": "2024-01-01T12:00:00Z",
          "updated_at": "2024-02-01T11:45:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no delivery service exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure updating the delivery service.

---

### `DELETE /api/v1/admin/delivery-services/{id}`

*   **Description:** Delete a specific delivery service.
*   **Method:** `DELETE`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the delivery service.
*   **Response:**
    *   **Code:** `204 No Content`
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no delivery service exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure deleting the delivery service.

---

## Admin User Management (`/api/v1/admin/users`)

*   **Access:** Requires a valid admin JWT token in the `Authorization: Bearer <token>` header.

### `GET /api/v1/admin/users`

*   **Description:** List users with optional filtering and pagination.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Query Parameters:**
    *   `active_only` (Optional, `string`): If `"true"`, only returns users who are not soft-deleted. Defaults to `"false"` (returns all users).
    *   `page` (Optional, `integer`): Page number for pagination (1-indexed). Defaults to `1`.
    *   `limit` (Optional, `integer`): Number of users per page. Defaults to `20`.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          {
            "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
            "name": "John Doe", // Full name if available, otherwise email
            "email": "john.doe@example.com",
            "registration_date": "2024-01-01T12:00:00Z",
            "last_order_date": "2024-02-15T10:30:00Z", // Omitted if no orders
            "order_count": 5,
            "activity_status": "Active" // "Active" or "Inactive"
          },
          // ... more users ...
        ]
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the user list.

---

### `GET /api/v1/admin/users/{id}`

*   **Description:** Retrieve detailed information for a specific user.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the user.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
          "name": "John Doe", // Full name if available, otherwise email
          "email": "john.doe@example.com",
          "registration_date": "2024-01-01T12:00:00Z",
          "last_order_date": "2024-02-15T10:30:00Z", // Omitted if no orders
          "order_count": 5,
          "activity_status": "Active" // "Active" or "Inactive"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no user exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the user details.

---

### `POST /api/v1/admin/users/{id}/activate`

*   **Description:** Reactivate a previously deactivated (soft-deleted) user account.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the user to activate.
*   **Request Body:** None (Empty body).
*   **Response:**
    *   **Code:** `204 No Content`
    *   **Body:** None
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `500 Internal Server Error`: If there's a server-side failure activating the user.

---

### `POST /api/v1/admin/users/{id}/deactivate`

*   **Description:** Deactivate a user account by soft-deleting it.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the user to deactivate.
*   **Request Body:** None (Empty body).
*   **Response:**
    *   **Code:** `204 No Content`
    *   **Body:** None
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `500 Internal Server Error`: If there's a server-side failure deactivating the user.

---

## Health Check

### `GET /health`

*   **Description:** Check the health of the service.
*   **Method:** `GET`
*   **Headers:** None required.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "status": "ok",
          "timestamp": "2026-02-03T10:00:00Z"
        }
        ```
*   **Errors:**
    *   `500 Internal Server Error`: If the service is unhealthy (e.g., database connection down).

---


File: internal/db/queries/calculate_discounts.sql
================================================
-- name: GetProductWithDiscountInfo :one
SELECT
    p.id,
    p.category_id,
    c.name AS category_name,
    p.name,
    p.slug,
    p.description,
    p.short_description,
    p.price_cents AS original_price_cents,
    p.stock_quantity,
    p.status,
    p.brand,
    p.image_urls,
    p.spec_highlights,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    p.avg_rating,
    p.num_ratings,
    vpcd.total_fixed_discount_cents::BIGINT,
    vpcd.combined_percentage_factor::FLOAT,
    COALESCE(vpcd.calculated_discounted_price_cents, p.price_cents) AS discounted_price_cents,
    -- Use the has_active_discount boolean directly from the view
    COALESCE(vpcd.has_active_discount, FALSE) AS has_active_discount
FROM
    products p
INNER JOIN categories c ON p.category_id = c.id -- Join with categories table
LEFT JOIN
    v_products_with_calculated_discounts vpcd ON p.id = vpcd.product_id
WHERE
    p.id = $1 AND p.deleted_at IS NULL;

-- Query: GetProductWithDiscountInfoBySlug
-- Retrieves a specific product by slug along with its calculated discount information using the pre-calculated view.

-- name: GetProductWithDiscountInfoBySlug :one
SELECT
    p.id,
    p.category_id,
    c.name AS category_name,
    p.name,
    p.slug,
    p.description,
    p.short_description,
    p.price_cents AS original_price_cents,
    p.stock_quantity,
    p.status,
    p.brand,
    p.image_urls,
    p.spec_highlights,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    p.avg_rating,
    p.num_ratings,
    vpcd.total_fixed_discount_cents::BIGINT,
    vpcd.combined_percentage_factor::FLOAT,
    COALESCE(vpcd.calculated_discounted_price_cents, p.price_cents) AS discounted_price_cents,
    -- Use the has_active_discount boolean directly from the view
    COALESCE(vpcd.has_active_discount, FALSE) AS has_active_discount
FROM
    products p
INNER JOIN categories c ON p.category_id = c.id -- Join with categories table
LEFT JOIN
    v_products_with_calculated_discounts vpcd ON p.id = vpcd.product_id
WHERE
    p.slug = $1 AND p.deleted_at IS NULL;

-- name: GetProductsWithDiscountInfo :many
SELECT
    p.id,
    p.category_id,
    c.name AS category_name,
    p.name,
    p.slug,
    p.description,
    p.short_description,
    p.price_cents AS original_price_cents,
    p.stock_quantity,
    p.status,
    p.brand,
    p.image_urls,
    p.spec_highlights,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    p.avg_rating,
    p.num_ratings,
    vpcd.total_fixed_discount_cents::BIGINT,
    vpcd.combined_percentage_factor::FLOAT,
    COALESCE(vpcd.calculated_discounted_price_cents, p.price_cents) AS discounted_price_cents,
    -- Use the has_active_discount boolean directly from the view
    COALESCE(vpcd.has_active_discount, FALSE) AS has_active_discount
FROM
    products p
INNER JOIN categories c ON p.category_id = c.id -- Join with categories table
LEFT JOIN
    v_products_with_calculated_discounts vpcd ON p.id = vpcd.product_id
WHERE
    p.deleted_at IS NULL -- Add other filters if needed (e.g., category, price range)
ORDER BY
    p.created_at DESC -- Or other ordering
LIMIT $1 OFFSET $2; -- $1 = page_limit, $2 = page_offset


-- name: GetCartWithItemsAndProductsWithDiscounts :many
-- Assuming this returns one cart object with many items
SELECT
    c.id AS cart_id,
    c.user_id,
    c.session_id,
    c.created_at,
    c.updated_at,
    -- Cart Items
    ci.id AS item_id,
    ci.cart_id AS item_cart_id,
    ci.product_id AS item_product_id,
    ci.quantity AS item_quantity,
    ci.created_at AS item_created_at,
    ci.updated_at AS item_updated_at,
    -- Product Details (with discount calculation from the view)
    p.id AS product_id,
    p.name AS product_name,
    p.price_cents AS original_price_cents,
    p.stock_quantity AS product_stock_quantity,
    p.image_urls AS product_image_urls,
    p.brand AS product_brand,
    -- Use the pre-calculated discounted price from the view
    COALESCE(vpcd.calculated_discounted_price_cents, p.price_cents, 0)::BIGINT AS final_price_cents, -- This is the price *per unit* after discount
    -- Use the has_active_discount boolean directly from the view
    COALESCE(vpcd.has_active_discount, FALSE) AS has_active_discount,
    -- Include the breakdown fields for potential use in the cart context
 COALESCE(vpcd.total_fixed_discount_cents, 0)::BIGINT AS vpcd_total_fixed_discount_cents, -- Fallback to 0
    COALESCE(vpcd.combined_percentage_factor, 1.0)::FLOAT AS vpcd_combined_percentage_factor -- Fallback to 1.0 (no discount factor)
FROM
    carts c
LEFT JOIN
    cart_items ci ON c.id = ci.cart_id AND ci.deleted_at IS NULL
LEFT JOIN
    products p ON ci.product_id = p.id AND p.deleted_at IS NULL
LEFT JOIN
    v_products_with_calculated_discounts vpcd ON p.id = vpcd.product_id -- Join with the view
WHERE
    c.id = $1 AND c.deleted_at IS NULL
ORDER BY
    ci.created_at ASC; -- Or other ordering for items


File: internal/db/queries/refresh_token.sql
================================================
-- name: CreateRefreshToken :exec
INSERT INTO refresh_tokens (jti, user_id, token_hash, expires_at)
VALUES (@jti::text, @user_id::uuid, @token_hash::char(64), @expires_at::timestamptz);

-- name: GetValidRefreshTokenRecord :one
SELECT id, jti, user_id, token_hash, expires_at, revoked_at, created_at, updated_at
FROM refresh_tokens
WHERE jti = @jti::text AND expires_at > NOW() AND revoked_at IS NULL;

-- name: RevokeRefreshTokenByJTI :exec
UPDATE refresh_tokens SET revoked_at = NOW(), updated_at = NOW() WHERE jti = @jti::text;

-- name: CleanupExpiredRefreshTokens :exec
DELETE FROM refresh_tokens WHERE expires_at < NOW() AND revoked_at IS NULL;

-- name: RevokeAllRefreshTokensByUserID :exec
-- Revokes all refresh tokens for a specific user.
UPDATE refresh_tokens
SET revoked_at = NOW(), updated_at = NOW()
WHERE user_id = @user_id::uuid AND revoked_at IS NULL; -- Only revoke non-already-revoked tokens


File: internal/handlers/delivery_service.go
================================================
package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"tech-store-backend/internal/models"
	"tech-store-backend/internal/services"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// DeliveryServiceHandler manages HTTP requests for delivery service-related operations.
type DeliveryServiceHandler struct {
	service *services.DeliveryServiceService
	logger  *slog.Logger
}

// NewDeliveryServiceHandler creates a new instance of DeliveryServiceHandler.
func NewDeliveryServiceHandler(service *services.DeliveryServiceService, logger *slog.Logger) *DeliveryServiceHandler {
	return &DeliveryServiceHandler{
		service: service,
		logger:  logger,
	}
}

// RegisterRoutes registers the delivery service-related routes with the provided Chi router.
// Assumes the router 'r' has admin middleware applied (e.g., JWT + RequireAdmin).
func (h *DeliveryServiceHandler) RegisterRoutes(r chi.Router) {
	r.Post("/", h.CreateDeliveryService)       // POST /api/v1/admin/delivery-services
	r.Get("/{id}", h.GetDeliveryService)       // GET /api/v1/admin/delivery-services/{id} (gets any status)
	r.Get("/", h.ListAllDeliveryServices)      // GET /api/v1/admin/delivery-services?page=&limit=&active_only= (admin sees all)
	r.Patch("/{id}", h.UpdateDeliveryService)  // PATCH /api/v1/admin/delivery-services/{id}
	r.Delete("/{id}", h.DeleteDeliveryService) // DELETE /api/v1/admin/delivery-services/{id}
}

// CreateDeliveryService handles creating a new delivery service.
func (h *DeliveryServiceHandler) CreateDeliveryService(w http.ResponseWriter, r *http.Request) {
	var req models.CreateDeliveryServiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON in request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if err := req.Validate(); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	deliveryService, err := h.service.CreateDeliveryService(r.Context(), req)
	if err != nil {
		// Log the error server-side
		h.logger.Error("Failed to create delivery service", "error", err, "name", req.Name)
		// Check for specific DB errors like unique_violation if needed
		http.Error(w, "Failed to create delivery service", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated) // 201 Created
	if err := json.NewEncoder(w).Encode(deliveryService); err != nil {
		// Log encoding error, but response headers might already be sent
		h.logger.Error("Failed to encode CreateDeliveryService response", "error", err)
	}
}

// GetDeliveryService handles retrieving a specific delivery service by its ID (admin: gets any status).
func (h *DeliveryServiceHandler) GetDeliveryService(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid delivery service ID format", http.StatusBadRequest)
		return
	}

	// Use the new method that ignores the active status for admin retrieval
	deliveryService, err := h.service.GetDeliveryServiceByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrDeliveryServiceNotFound) {
			http.Error(w, "Delivery service not found", http.StatusNotFound)
			return
		}
		h.logger.Error("Failed to get delivery service by ID (admin)", "error", err, "id", id)
		http.Error(w, "Failed to retrieve delivery service", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(deliveryService); err != nil {
		h.logger.Error("Failed to encode GetDeliveryService response", "error", err)
	}
}

// ListAllDeliveryServices handles listing delivery services (admin: sees all statuses).
func (h *DeliveryServiceHandler) ListAllDeliveryServices(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters for pagination and filtering
	activeOnlyStr := r.URL.Query().Get("active_only")
	activeOnly := activeOnlyStr == "true" // Default to false if not provided or not "true"
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1 // Default page
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		} // else, keep default
	}

	limit := 20 // Default limit
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		} // else, keep default
	}

	offset := (page - 1) * limit

	// Use the admin-specific list method
	deliveryServices, err := h.service.ListAllDeliveryServices(r.Context(), activeOnly, limit, offset)
	if err != nil {
		h.logger.Error("Failed to list delivery services (admin)", "error", err, "active_only", activeOnly, "page", page, "limit", limit)
		http.Error(w, "Failed to retrieve delivery services", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(deliveryServices); err != nil {
		h.logger.Error("Failed to encode ListAllDeliveryServices response", "error", err)
	}
}

// UpdateDeliveryService handles updating an existing delivery service.
func (h *DeliveryServiceHandler) UpdateDeliveryService(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid delivery service ID format", http.StatusBadRequest)
		return
	}

	var req models.UpdateDeliveryServiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON in request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Validate the partial request struct (optional, if using validator tags)
	// Note: Validator might need special handling for partial updates (e.g., omitempty rules)
	if err := req.Validate(); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	updatedDeliveryService, err := h.service.UpdateDeliveryService(r.Context(), id, req)
	if err != nil {
		if errors.Is(err, services.ErrDeliveryServiceNotFound) {
			http.Error(w, "Delivery service not found", http.StatusNotFound)
			return
		}
		h.logger.Error("Failed to update delivery service", "error", err, "id", id)
		http.Error(w, "Failed to update delivery service", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(updatedDeliveryService); err != nil {
		h.logger.Error("Failed to encode UpdateDeliveryService response", "error", err)
	}
}

// DeleteDeliveryService handles deleting a delivery service.
func (h *DeliveryServiceHandler) DeleteDeliveryService(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid delivery service ID format", http.StatusBadRequest)
		return
	}

	err = h.service.DeleteDeliveryService(r.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrDeliveryServiceNotFound) {
			// Technically, if it's already gone, is it an error? Maybe return 204 No Content?
			// For consistency with Update, let's return 404 if not found *before* the delete attempt.
			// If the delete query itself fails (e.g., foreign key constraint), it returns 500.
			// If the delete query succeeds but affected 0 rows (despite finding it earlier), might need specific handling.
			// Let's stick to the pattern used in Update.
			http.Error(w, "Delivery service not found", http.StatusNotFound)
			return
		}
		h.logger.Error("Failed to delete delivery service", "error", err, "id", id)
		http.Error(w, "Failed to delete delivery service", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent) // 204 No Content on successful delete
}


File: internal/handlers/order.go
================================================
package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"tech-store-backend/internal/models"
	"tech-store-backend/internal/services"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// OrderHandler manages HTTP requests for order-related operations.
type OrderHandler struct {
	service *services.OrderService
	logger  *slog.Logger
}

// NewOrderHandler creates a new instance of OrderHandler.
func NewOrderHandler(service *services.OrderService, logger *slog.Logger) *OrderHandler {
	return &OrderHandler{
		service: service,
		logger:  logger,
	}
}

// RegisterUserRoutes registers the order-related routes accessible to authenticated users.
func (h *OrderHandler) RegisterUserRoutes(r chi.Router) {
	r.Post("/", h.CreateOrder)   // POST /api/v1/orders (checkout)
	r.Get("/{id}", h.GetOrder)   // GET /api/v1/orders/{id}
	r.Get("/", h.ListUserOrders) // GET /api/v1/orders?page=&limit=&status=

}

// RegisterAdminRoutes registers the order-related routes accessible only to admins.
func (h *OrderHandler) RegisterAdminRoutes(r chi.Router) {
	r.Get("/all", h.ListAllOrders)             // GET /api/v1/admin/orders/all?page=&limit=&user_id=&status=
	r.Get("/{id}", h.GetOrderByID)             // GET /api/v1/admin/orders/{id} (admin access)
	r.Put("/{id}/status", h.UpdateOrderStatus) // PUT /api/v1/admin/orders/{id}/status
	r.Put("/{id}/cancel", h.CancelOrder)       // PUT /api/v1/admin/orders/{id}/cancel
}

// CreateOrder handles the creation of a new order.
// Expected JSON body: models.CreateOrderRequest
// Requires UserID from JWT context.
func (h *OrderHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	// 1. Extract UserID from JWT context (existing logic)
	var userIDVal *uuid.UUID
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user accessing order", "user_id", user.ID)
		userIDVal = &user.ID
	}
	if userIDVal == nil {
		http.Error(w, "Unauthorized: missing user context", http.StatusUnauthorized)
		return
	}
	userID := *userIDVal // Dereference for easier use

	// 2. Decode Request Body into CreateOrderFromCartRequest
	var req models.CreateOrderFromCartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON in request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 3. Validate the request struct
	if err := req.Validate(); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 4. Call the Service Method
	orderSummary, err := h.service.CreateOrder(r.Context(), req, userID) // Pass the NEW req and userID
	if err != nil {
		// Log the error server-side
		h.logger.Error("Failed to create order", "error", err, "user_id", userID)
		// Return a generic error message to the client
		http.Error(w, "Failed to create order: "+err.Error(), http.StatusInternalServerError) // More specific error message
		return
	}

	// 5. Send Success Response (201 Created) (existing logic)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated) // 201 Created
	if err := json.NewEncoder(w).Encode(orderSummary); err != nil {
		// Log encoding error, but response headers might already be sent
		h.logger.Error("Failed to encode CreateOrder response", "error", err)
	}
}

// GetOrder handles retrieving a specific order by its ID.
// Requires the order to belong to the authenticated user (UserID from JWT context).
func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	// Extract OrderID from URL path
	orderIDStr := chi.URLParam(r, "id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		http.Error(w, "Invalid order ID format", http.StatusBadRequest)
		return
	}

	// Extract UserID from JWT context
	var userIDVal *uuid.UUID
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user accessing cart", "user_id", user.ID)
		userIDVal = &user.ID
		// sessionID remains empty for authenticated users
	}
	if userIDVal == nil {
		http.Error(w, "Unauthorized: missing user context", http.StatusUnauthorized)
		return
	}

	orderWithItems, err := h.service.GetOrder(r.Context(), orderID)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			http.Error(w, "Order not found", http.StatusNotFound)
			return
		}
		h.logger.Error("Failed to get order", "error", err, "order_id", orderID, "user_id", *userIDVal)
		http.Error(w, "Failed to retrieve order", http.StatusInternalServerError)
		return
	}

	// Check if the order belongs to the requesting user
	if orderWithItems.Order.UserID != *userIDVal {
		// Log potential security issue
		h.logger.Warn("User attempted to access another user's order", "requesting_user_id", *userIDVal, "order_owner_id", orderWithItems.Order.UserID, "order_id", orderID)
		http.Error(w, "Forbidden: access denied", http.StatusForbidden)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(orderWithItems); err != nil {
		h.logger.Error("Failed to encode GetOrder response", "error", err)
	}
}

// GetOrderByID handles retrieving a specific order by its ID (admin only).
// Does NOT check if the order belongs to the requesting user.
func (h *OrderHandler) GetOrderByID(w http.ResponseWriter, r *http.Request) {
	// Extract OrderID from URL path
	orderIDStr := chi.URLParam(r, "id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		http.Error(w, "Invalid order ID format", http.StatusBadRequest)
		return
	}
	var userID *uuid.UUID
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user accessing cart", "user_id", user.ID)
		userID = &user.ID
		// sessionID remains empty for authenticated users
	}
	if userID == nil {
		http.Error(w, "Unauthorized: missing user context", http.StatusUnauthorized)
		return
	}

	// Fetch the order with items using the service
	orderWithItems, err := h.service.GetOrder(r.Context(), orderID)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			http.Error(w, "Order not found", http.StatusNotFound)
			return
		}
		h.logger.Error("Failed to get order by ID (admin)", "error", err, "order_id", orderID, "user_id", userID)
		http.Error(w, "Failed to retrieve order", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(orderWithItems); err != nil {
		h.logger.Error("Failed to encode GetOrderByID response", "error", err)
	}
}

// ListUserOrders handles listing orders for the authenticated user.
// Requires UserID from JWT context.
func (h *OrderHandler) ListUserOrders(w http.ResponseWriter, r *http.Request) {
	// Extract UserID from JWT context
	var userIDVal *uuid.UUID
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user accessing cart", "user_id", user.ID)
		userIDVal = &user.ID
		// sessionID remains empty for authenticated users
	}
	if userIDVal == nil {
		http.Error(w, "Unauthorized: missing user context", http.StatusUnauthorized)
		return
	}

	// Parse query parameters for pagination and filtering
	statusFilter := r.URL.Query().Get("status")
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1 // Default page
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		} // else, keep default
	}

	limit := 20 // Default limit
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		} // else, keep default
	}

	orders, err := h.service.ListUserOrders(r.Context(), *userIDVal, statusFilter, page, limit)
	if err != nil {
		h.logger.Error("Failed to list user orders", "error", err, "user_id", *userIDVal)
		http.Error(w, "Failed to retrieve orders", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(orders); err != nil {
		h.logger.Error("Failed to encode ListUserOrders response", "error", err)
	}
}

// ListAllOrders handles listing all orders (admin only).
// Requires UserID from JWT context and admin privileges
func (h *OrderHandler) ListAllOrders(w http.ResponseWriter, r *http.Request) {
	// Extract UserID from JWT context
	var userIDVal *uuid.UUID
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user accessing cart", "user_id", user.ID)
		userIDVal = &user.ID
		// sessionID remains empty for authenticated users
	}
	if userIDVal == nil {
		http.Error(w, "Unauthorized: missing user context", http.StatusUnauthorized)
		return
	}
	// Parse query parameters for pagination and filtering
	userFilterStr := r.URL.Query().Get("user_id")
	statusFilter := r.URL.Query().Get("status")
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	var userFilterID uuid.UUID // Zero value if not provided
	if userFilterStr != "" {
		if parsedID, err := uuid.Parse(userFilterStr); err != nil {
			http.Error(w, "Invalid user ID filter format", http.StatusBadRequest)
			return
		} else {
			userFilterID = parsedID
		}
	}

	page := 1 // Default page
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		} // else, keep default
	}

	limit := 20 // Default limit
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		} // else, keep default
	}

	orders, err := h.service.ListAllOrders(r.Context(), userFilterID, statusFilter, page, limit)
	if err != nil {
		h.logger.Error("Failed to list all orders", "error", err, "user_id", *userIDVal) // Log the admin user ID making the request
		http.Error(w, "Failed to retrieve orders", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(orders); err != nil {
		h.logger.Error("Failed to encode ListAllOrders response", "error", err)
	}
}

// UpdateOrderStatus handles updating the status of an order (admin only).
// Expected JSON body: models.UpdateOrderStatusRequest
// Requires UserID from JWT context and admin privileges.
func (h *OrderHandler) UpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	// Extract OrderID from URL path
	orderIDStr := chi.URLParam(r, "id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		http.Error(w, "Invalid order ID format", http.StatusBadRequest)
		return
	}

	var userIDVal *uuid.UUID
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user accessing cart", "user_id", user.ID)
		userIDVal = &user.ID
		// sessionID remains empty for authenticated users
	}
	if userIDVal == nil {
		http.Error(w, "Unauthorized: missing user context", http.StatusUnauthorized)
		return
	}

	var req models.UpdateOrderStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON in request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Validate the request struct (optional, if using validator tags)
	if err := req.Validate(); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	updatedOrder, err := h.service.UpdateOrderStatus(r.Context(), orderID, req)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			http.Error(w, "Order not found", http.StatusNotFound)
			return
		}
		// Check for other specific errors like invalid status transition
		var statusErr *services.StatusTransitionError //
		if errors.As(err, &statusErr) {
			http.Error(w, err.Error(), http.StatusConflict) // 409 Conflict for invalid transitions
			return
		}
		h.logger.Error("Failed to update order status", "error", err, "order_id", orderID, "user_id", *userIDVal, "new_status", req.Status)
		http.Error(w, "Failed to update order status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(updatedOrder); err != nil {
		h.logger.Error("Failed to encode UpdateOrderStatus response", "error", err)
	}
}

// CancelOrder handles cancelling an order (admin only).
// Requires UserID from JWT context and admin privileges.
func (h *OrderHandler) CancelOrder(w http.ResponseWriter, r *http.Request) {
	// Extract OrderID from URL path
	orderIDStr := chi.URLParam(r, "id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		http.Error(w, "Invalid order ID format", http.StatusBadRequest)
		return
	}

	var userIDVal *uuid.UUID
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user accessing cart", "user_id", user.ID)
		userIDVal = &user.ID
		// sessionID remains empty for authenticated users
	}
	if userIDVal == nil {
		http.Error(w, "Unauthorized: missing user context", http.StatusUnauthorized)
		return
	}

	updatedOrder, err := h.service.CancelOrder(r.Context(), orderID)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			http.Error(w, "Order not found", http.StatusNotFound)
			return
		}
		// Check for other specific errors like cannot cancel in current state
		var cancelErr *services.CannotCancelError //
		if errors.As(err, &cancelErr) {
			http.Error(w, err.Error(), http.StatusConflict) // 409 Conflict for invalid cancellation
			return
		}
		h.logger.Error("Failed to cancel order", "error", err, "order_id", orderID, "user_id", *userIDVal)
		http.Error(w, "Failed to cancel order", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(updatedOrder); err != nil {
		h.logger.Error("Failed to encode CancelOrder response", "error", err)
	}
}


File: internal/services/auth_service.go
================================================
package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"tech-store-backend/internal/db"
	"tech-store-backend/internal/models"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// AuthService handles authentication-related business logic, including JWT and refresh tokens.
type AuthService struct {
	querier     db.Querier
	userService *UserService
	cartService *CartService
	jwtSecret   []byte // Secret for access/refresh token signing
	logger      *slog.Logger
}

// NewAuthService creates a new instance of AuthService.
func NewAuthService(querier db.Querier, userService *UserService, cartService *CartService, jwtSecret string, logger *slog.Logger) *AuthService {
	return &AuthService{
		querier:     querier,
		userService: userService,
		cartService: cartService,
		jwtSecret:   []byte(jwtSecret),
		logger:      logger,
	}
}

// Login authenticates a user and returns access token, refresh token string, and user details.
func (s *AuthService) Login(ctx context.Context, email, password string, sessionID string) (*models.LoginResponse, string, error) {
	user, err := s.userService.Authenticate(ctx, email, password)
	if err != nil {
		return nil, "", err
	}
	err = s.querier.RevokeAllRefreshTokensByUserID(ctx, user.ID)
	if err != nil {
		s.logger.Error("Failed to revoke existing refresh tokens during login", "error", err, "user_id", user.ID)
	}
	accessToken, refreshTokenStr, err := s.generateTokens(ctx, user.ID, user.Email, user.IsAdmin)
	if err != nil {
		s.logger.Error("Failed to generate tokens during login", "error", err, "user_id", user.ID)
		return nil, "", fmt.Errorf("failed to generate tokens: %w", err)
	}
	if sessionID != "" {
		err = s.cartService.SyncGuestCartToUserCart(ctx, sessionID, user.ID) // Call the new method
		if err != nil {
			s.logger.Error("Failed to sync guest cart to user cart after login", "user_id", user.ID, "session_id", sessionID, "error", err)
		} else {
			s.logger.Info("Guest cart synced successfully after login", "user_id", user.ID, "session_id", sessionID)
		}
	}
	return &models.LoginResponse{
		Token: accessToken,
		User:  *user,
	}, refreshTokenStr, nil
}

// Register registers a new user and returns access token, refresh token string, and user details.
func (s *AuthService) Register(ctx context.Context, email, password, fullName string, sessionID string) (*models.LoginResponse, string, error) {
	userID, err := s.userService.Register(ctx, email, password, fullName)
	if err != nil {
		return nil, "", err
	}

	user, err := s.userService.GetByID(ctx, userID.String())
	if err != nil {
		s.logger.Error("Failed to fetch user details after registration", "error", err, "user_id", userID)
		return nil, "", fmt.Errorf("failed to fetch user details after registration: %w", err)
	}

	err = s.querier.RevokeAllRefreshTokensByUserID(ctx, user.ID)
	if err != nil {
		s.logger.Error("Failed to revoke existing refresh tokens during registration", "error", err, "user_id", user.ID)
	}
	accessToken, refreshTokenStr, err := s.generateTokens(ctx, user.ID, user.Email, user.IsAdmin)
	if err != nil {
		s.logger.Error("Failed to generate tokens during registration", "error", err, "user_id", user.ID)
		return nil, "", fmt.Errorf("failed to generate tokens: %w", err)
	}
	if sessionID != "" {
		err = s.cartService.SyncGuestCartToUserCart(ctx, sessionID, user.ID) // Call the new method
		if err != nil {
			s.logger.Error("Failed to sync guest cart to user cart after login", "user_id", user.ID, "session_id", sessionID, "error", err)
		} else {
			s.logger.Info("Guest cart synced successfully after login", "user_id", user.ID, "session_id", sessionID)
		}
	}

	return &models.LoginResponse{
		Token: accessToken,
		User:  *user,
	}, refreshTokenStr, nil
}

// Refresh exchanges a valid refresh token (received from cookie) for a new access token and refresh token.
func (s *AuthService) Refresh(ctx context.Context, refreshTokenStr string) (string, string, error) {
	s.logger.Debug("Refreshing token", "received_token_str_len", len(refreshTokenStr))

	// Hash the received token string for DB lookup comparison
	receivedTokenHash := s.hashToken(refreshTokenStr)

	// Parse the JWT to extract the JTI and verify its signature
	token, err := jwt.ParseWithClaims(refreshTokenStr, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil || !token.Valid {
		s.logger.Warn("Invalid or malformed refresh token JWT during refresh", "error", err, "token_valid", token.Valid)
		return "", "", errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok {
		s.logger.Warn("Could not parse claims from refresh token JWT during refresh")
		return "", "", errors.New("invalid refresh token")
	}

	jti := claims.ID
	if jti == "" {
		s.logger.Warn("Missing JTI in refresh token JWT during refresh")
		return "", "", errors.New("invalid refresh token")
	}

	// Lookup DB record by JTI (this gets the stored hash)
	dbRefreshToken, err := s.querier.GetValidRefreshTokenRecord(ctx, jti)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			s.logger.Warn("Refresh token JTI not found in DB or is expired/revoked", "jti", jti)
			return "", "", errors.New("invalid or expired refresh token")
		}
		s.logger.Error("Failed to fetch refresh token record from DB", "error", err, "jti", jti)
		return "", "", fmt.Errorf("failed to validate refresh token: %w", err)
	}

	// Compare the *received token's hash* with the *stored hash*
	if receivedTokenHash != dbRefreshToken.TokenHash {
		s.logger.Warn("Refresh token hash verification failed", "jti", jti)
		return "", "", errors.New("invalid refresh token")
	}

	// --- IMMEDIATELY REVOKE THE OLD TOKEN (Token Rotation) ---
	err = s.querier.RevokeRefreshTokenByJTI(ctx, jti)
	if err != nil {
		s.logger.Warn("Could not revoke old refresh token during refresh (might be concurrent request)", "jti", jti, "error", err)
	}

	dbUser, err := s.querier.GetUser(ctx, dbRefreshToken.UserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", "", errors.New("user associated with refresh token not found")
		}
		s.logger.Error("Failed to fetch user associated with refresh token", "error", err, "user_id", dbRefreshToken.UserID)
		return "", "", fmt.Errorf("failed to validate user for refresh: %w", err)
	}

	user := &models.User{
		ID:      dbUser.ID,
		Email:   dbUser.Email,
		IsAdmin: dbUser.IsAdmin,
	}

	newAccessToken, newRefreshTokenStr, err := s.generateTokens(ctx, user.ID, user.Email, user.IsAdmin)
	if err != nil {
		s.logger.Error("Failed to generate new tokens during refresh", "error", err, "user_id", user.ID)
		return "", "", fmt.Errorf("failed to generate new tokens: %w", err)
	}

	return newAccessToken, newRefreshTokenStr, nil
}

// Logout revokes the provided refresh token (received from cookie).
func (s *AuthService) Logout(ctx context.Context, refreshTokenStr string) error {
	s.logger.Debug("Logging out", "refresh_token_str_len", len(refreshTokenStr))

	// Parse the JWT to extract the JTI and verify its signature
	token, err := jwt.ParseWithClaims(refreshTokenStr, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil || !token.Valid {
		s.logger.Warn("Invalid or malformed refresh token JWT during logout", "error", err, "token_valid", token.Valid)
		return errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok {
		s.logger.Warn("Could not parse claims from refresh token JWT during logout")
		return errors.New("invalid refresh token")
	}

	jti := claims.ID
	if jti == "" {
		s.logger.Warn("Missing JTI in refresh token JWT during logout")
		return errors.New("invalid refresh token")
	}

	// Attempt to revoke the token in the database using its JTI
	err = s.querier.RevokeRefreshTokenByJTI(ctx, jti)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			s.logger.Warn("Attempted to revoke non-existent or already revoked refresh token", "jti", jti)
			return nil // Treat as success for the client
		}
		s.logger.Error("Failed to revoke refresh token in DB", "error", err, "jti", jti)
		return fmt.Errorf("failed to revoke refresh token: %w", err)
	}

	s.logger.Info("Refresh token revoked successfully", "jti", jti)
	return nil
}

// generateTokens creates a new access token and refresh token pair.
// It stores the refresh token hash in the database using the token's JTI.
// The hash is SHA-256 of the *entire signed refresh token string*.
func (s *AuthService) generateTokens(ctx context.Context, userID uuid.UUID, email string, isAdmin bool) (accessToken, refreshTokenStr string, err error) {
	// Generate a unique JTI (JWT ID) - this will be the unique identifier for the DB record
	refreshTokenJTI := uuid.NewString()

	// Define expiry times
	accessTokenExpiry := time.Now().Add(15 * time.Minute)    // Short-lived
	refreshTokenExpiry := time.Now().Add(7 * 24 * time.Hour) // Long-lived (7 days)

	// Create the access token
	accessToken, err = s.createAccessToken(userID, email, isAdmin, accessTokenExpiry)
	if err != nil {
		return "", "", fmt.Errorf("failed to create access token: %w", err)
	}

	// Create the refresh token JWT containing the JTI and expiry
	refreshTokenClaims := jwt.RegisteredClaims{
		ID:        refreshTokenJTI,            // Use the generated JTI
		Subject:   userID.String(),            // Link to user
		Issuer:    "tech-store-backend",       // Optional: Identify the issuer
		Audience:  jwt.ClaimStrings{"client"}, // Optional: Intended audience
		ExpiresAt: &jwt.NumericDate{Time: refreshTokenExpiry},
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshTokenClaims)
	refreshTokenStr, err = refreshToken.SignedString(s.jwtSecret) // Sign with the main app secret
	if err != nil {
		return "", "", fmt.Errorf("failed to sign refresh token: %w", err)
	}

	// Hash the *entire signed refresh token string* using SHA-256
	tokenHash := s.hashToken(refreshTokenStr)

	// Store the JTI (as identifier) and the SHA-256 hash of the *entire signed token string* in the database
	err = s.querier.CreateRefreshToken(ctx, db.CreateRefreshTokenParams{
		Jti:       refreshTokenJTI, // Store the JTI as the lookup key
		UserID:    userID,          // Link to the user
		TokenHash: tokenHash,       // Store the SHA-256 hash of the *entire signed token string*
		ExpiresAt: pgtype.Timestamptz{Time: refreshTokenExpiry, Valid: true},
	})
	if err != nil {
		s.logger.Error("Failed to store refresh token in DB", "error", err, "user_id", userID, "jti", refreshTokenJTI)
		return "", "", fmt.Errorf("failed to store refresh token: %w", err)
	}

	return accessToken, refreshTokenStr, nil
}

// hashToken creates a SHA-256 hash of the input string and returns it as a hex string.
func (s *AuthService) hashToken(token string) string {
	hasher := sha256.New()
	hasher.Write([]byte(token))
	return hex.EncodeToString(hasher.Sum(nil))
}

// createAccessToken generates the actual JWT access token string.
func (s *AuthService) createAccessToken(userID uuid.UUID, email string, isAdmin bool, expiry time.Time) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  userID.String(),
		"email":    email,
		"is_admin": isAdmin,
		"exp":      expiry.Unix(),
		// Add other claims as needed
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// --- Error Definitions ---
var (
	ErrInvalidRefreshToken = errors.New("invalid or expired refresh token")
)


File: internal/services/admin_user_service.go
================================================
package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"tech-store-backend/internal/db"
	"tech-store-backend/internal/models"

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

func (s *AdminUserService) ActivateUser(ctx context.Context, id uuid.UUID) error {
	err := s.querier.ActivateUser(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to activate user: %w", err)
	}
	return nil
}

func (s *AdminUserService) DeactivateUser(ctx context.Context, id uuid.UUID) error {
	err := s.querier.SoftDeleteUser(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to deactivate user: %w", err)
	}
	return nil
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


File: justfile
================================================
# Load .env file
set dotenv-load := true

# Justfile - Backend Helper Commands
default:
  @just --list

[group('migration')]
[doc('Migrate the database up one time')]
migrate-up:
  goose -dir migrations up

[group('migration')]
[doc('Migrate the database down one time')]
migrate-down:
  goose -dir migrations down

[group('migration')]
[doc('Return the migration status')]
migrate-status:
  goose -dir migrations status

[group('migration')]
[doc('Create a new migration based on the argument provided')]
migrate-create name:
  echo "Creating migration: {{name}}"
  goose -s -dir migrations create {{name}} sql

[group('database')]
[doc('Create tech_store_dev Datebase')]
db-create:
  createdb tech_store_dev

[group('database')]
[doc('Drop tech_store_dev Database')]
db-drop:
  dropdb tech_store_dev

[group('development')]
[doc('Start the server (Default Port: 8080)')]
dev:
  go run cmd/server/main.go

[group('development')]
[doc('Run the seed script')]
seed:
  go run scripts/seed.go

[group('development')]
[doc('Run all the tests')]
test:
  go test ./...

[group('development')]
[doc('Build the backend API')]
build:
  go build -o bin/server cmd/server/main.go

[group('development')]
[doc('Run the database migration & Start the server')]
serve:
  just migrate-up
  just dev

[group('development')]
[doc('Reset the entire database')]
reset:
  just db-drop
  just db-create
  just migrate-up


File: internal/db/order.sql.go
================================================
// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.30.0
// source: order.sql

package db

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

const cancelOrder = `-- name: CancelOrder :one

UPDATE orders
SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    completed_at = COALESCE(completed_at, NOW()), -- Set completed_at if it wasn't already
    updated_at = NOW()
WHERE id = $1
RETURNING 
    id, user_id, user_full_name, status, total_amount_cents, payment_method,
    province, city, phone_number_1, phone_number_2,
    notes, delivery_service_id, 
    created_at, updated_at, completed_at, cancelled_at
`

// Order items consistently
// Updates the status of an order to 'cancelled' and sets the cancelled_at and completed_at timestamps.
// This is a soft cancellation.
func (q *Queries) CancelOrder(ctx context.Context, orderID uuid.UUID) (Order, error) {
	row := q.db.QueryRow(ctx, cancelOrder, orderID)
	var i Order
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.UserFullName,
		&i.Status,
		&i.TotalAmountCents,
		&i.PaymentMethod,
		&i.Province,
		&i.City,
		&i.PhoneNumber1,
		&i.PhoneNumber2,
		&i.Notes,
		&i.DeliveryServiceID,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.CompletedAt,
		&i.CancelledAt,
	)
	return i, err
}

const createOrder = `-- name: CreateOrder :one
INSERT INTO orders (
    user_id, user_full_name, status, total_amount_cents, payment_method,
    province, city, phone_number_1, phone_number_2,
    notes, delivery_service_id
) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9,
    $10, $11
)
RETURNING id, user_id, user_full_name, status, total_amount_cents, payment_method,
         province, city, phone_number_1, phone_number_2,
         notes, delivery_service_id, created_at, updated_at, completed_at, cancelled_at
`

type CreateOrderParams struct {
	UserID            uuid.UUID `json:"user_id"`
	UserFullName      string    `json:"user_full_name"`
	Status            string    `json:"status"`
	TotalAmountCents  int64     `json:"total_amount_cents"`
	PaymentMethod     string    `json:"payment_method"`
	Province          string    `json:"province"`
	City              string    `json:"city"`
	PhoneNumber1      string    `json:"phone_number_1"`
	PhoneNumber2      *string   `json:"phone_number_2"`
	Notes             *string   `json:"notes"`
	DeliveryServiceID uuid.UUID `json:"delivery_service_id"`
}

// Creates a new order with denormalized address fields and returns its details.
func (q *Queries) CreateOrder(ctx context.Context, arg CreateOrderParams) (Order, error) {
	row := q.db.QueryRow(ctx, createOrder,
		arg.UserID,
		arg.UserFullName,
		arg.Status,
		arg.TotalAmountCents,
		arg.PaymentMethod,
		arg.Province,
		arg.City,
		arg.PhoneNumber1,
		arg.PhoneNumber2,
		arg.Notes,
		arg.DeliveryServiceID,
	)
	var i Order
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.UserFullName,
		&i.Status,
		&i.TotalAmountCents,
		&i.PaymentMethod,
		&i.Province,
		&i.City,
		&i.PhoneNumber1,
		&i.PhoneNumber2,
		&i.Notes,
		&i.DeliveryServiceID,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.CompletedAt,
		&i.CancelledAt,
	)
	return i, err
}

const decrementStockIfSufficient = `-- name: DecrementStockIfSufficient :one
UPDATE products
SET stock_quantity = stock_quantity - $1
WHERE id = $2 AND stock_quantity >= $1 -- The crucial condition
RETURNING id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at, deleted_at
`

type DecrementStockIfSufficientParams struct {
	DecrementAmount int32     `json:"decrement_amount"`
	ProductID       uuid.UUID `json:"product_id"`
}

type DecrementStockIfSufficientRow struct {
	ID               uuid.UUID          `json:"id"`
	CategoryID       uuid.UUID          `json:"category_id"`
	Name             string             `json:"name"`
	Slug             string             `json:"slug"`
	Description      *string            `json:"description"`
	ShortDescription *string            `json:"short_description"`
	PriceCents       int64              `json:"price_cents"`
	StockQuantity    int32              `json:"stock_quantity"`
	Status           string             `json:"status"`
	Brand            string             `json:"brand"`
	ImageUrls        []byte             `json:"image_urls"`
	SpecHighlights   []byte             `json:"spec_highlights"`
	CreatedAt        pgtype.Timestamptz `json:"created_at"`
	UpdatedAt        pgtype.Timestamptz `json:"updated_at"`
	DeletedAt        pgtype.Timestamptz `json:"deleted_at"`
}

// Attempts to decrement the stock_quantity for a product by a given amount.
// Succeeds only if the resulting stock_quantity would be >= 0.
// Returns the updated product row if successful, or an error if insufficient stock.
// Note: The RETURNING clause might not be strictly necessary if we only care about RowsAffected.
// If RETURNING is omitted, the querier function will likely return sql.Result.
// Let's include RETURNING to get the updated stock if needed for debugging/logging.
func (q *Queries) DecrementStockIfSufficient(ctx context.Context, arg DecrementStockIfSufficientParams) (DecrementStockIfSufficientRow, error) {
	row := q.db.QueryRow(ctx, decrementStockIfSufficient, arg.DecrementAmount, arg.ProductID)
	var i DecrementStockIfSufficientRow
	err := row.Scan(
		&i.ID,
		&i.CategoryID,
		&i.Name,
		&i.Slug,
		&i.Description,
		&i.ShortDescription,
		&i.PriceCents,
		&i.StockQuantity,
		&i.Status,
		&i.Brand,
		&i.ImageUrls,
		&i.SpecHighlights,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.DeletedAt,
	)
	return i, err
}

const getOrder = `-- name: GetOrder :one

SELECT 
    id, user_id, user_full_name, status, total_amount_cents, payment_method,
    province, city, phone_number_1, phone_number_2,
    notes, delivery_service_id, created_at, updated_at, completed_at, cancelled_at
FROM orders
WHERE id = $1
`

// Array of quantities
// Retrieves an order by its ID with denormalized address fields.
func (q *Queries) GetOrder(ctx context.Context, orderID uuid.UUID) (Order, error) {
	row := q.db.QueryRow(ctx, getOrder, orderID)
	var i Order
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.UserFullName,
		&i.Status,
		&i.TotalAmountCents,
		&i.PaymentMethod,
		&i.Province,
		&i.City,
		&i.PhoneNumber1,
		&i.PhoneNumber2,
		&i.Notes,
		&i.DeliveryServiceID,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.CompletedAt,
		&i.CancelledAt,
	)
	return i, err
}

const getOrderItemsByOrderID = `-- name: GetOrderItemsByOrderID :many
SELECT 
    id, order_id, product_id, product_name, price_cents, quantity, subtotal_cents, created_at, updated_at
FROM order_items
WHERE order_id = $1
ORDER BY created_at ASC
`

// Retrieves all items for a specific order ID.
func (q *Queries) GetOrderItemsByOrderID(ctx context.Context, orderID uuid.UUID) ([]OrderItem, error) {
	rows, err := q.db.Query(ctx, getOrderItemsByOrderID, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []OrderItem
	for rows.Next() {
		var i OrderItem
		if err := rows.Scan(
			&i.ID,
			&i.OrderID,
			&i.ProductID,
			&i.ProductName,
			&i.PriceCents,
			&i.Quantity,
			&i.SubtotalCents,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getOrderWithItems = `-- name: GetOrderWithItems :many
SELECT 
    o.id, o.user_id, o.user_full_name, o.status, o.total_amount_cents, o.payment_method,
    o.province, o.city, o.phone_number_1, o.phone_number_2,
    o.notes, o.delivery_service_id, o.created_at, o.updated_at, o.completed_at, o.cancelled_at,
    oi.id AS item_id, oi.order_id AS item_order_id, oi.product_id AS item_product_id,
    oi.product_name AS item_product_name, oi.price_cents AS item_price_cents,
    oi.quantity AS item_quantity, oi.subtotal_cents AS item_subtotal_cents,
    oi.created_at AS item_created_at, oi.updated_at AS item_updated_at
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.id = $1
ORDER BY oi.created_at ASC
`

type GetOrderWithItemsRow struct {
	ID                uuid.UUID          `json:"id"`
	UserID            uuid.UUID          `json:"user_id"`
	UserFullName      string             `json:"user_full_name"`
	Status            string             `json:"status"`
	TotalAmountCents  int64              `json:"total_amount_cents"`
	PaymentMethod     string             `json:"payment_method"`
	Province          string             `json:"province"`
	City              string             `json:"city"`
	PhoneNumber1      string             `json:"phone_number_1"`
	PhoneNumber2      *string            `json:"phone_number_2"`
	Notes             *string            `json:"notes"`
	DeliveryServiceID uuid.UUID          `json:"delivery_service_id"`
	CreatedAt         pgtype.Timestamptz `json:"created_at"`
	UpdatedAt         pgtype.Timestamptz `json:"updated_at"`
	CompletedAt       pgtype.Timestamptz `json:"completed_at"`
	CancelledAt       pgtype.Timestamptz `json:"cancelled_at"`
	ItemID            uuid.UUID          `json:"item_id"`
	ItemOrderID       uuid.UUID          `json:"item_order_id"`
	ItemProductID     uuid.UUID          `json:"item_product_id"`
	ItemProductName   *string            `json:"item_product_name"`
	ItemPriceCents    *int64             `json:"item_price_cents"`
	ItemQuantity      *int32             `json:"item_quantity"`
	ItemSubtotalCents *int64             `json:"item_subtotal_cents"`
	ItemCreatedAt     pgtype.Timestamptz `json:"item_created_at"`
	ItemUpdatedAt     pgtype.Timestamptz `json:"item_updated_at"`
}

// Retrieves an order by its ID along with all its items, including denormalized address fields.
// This query uses a join and might return multiple rows if there are items.
// The service layer needs to aggregate these rows into a single Order object with a slice of OrderItems.
func (q *Queries) GetOrderWithItems(ctx context.Context, orderID uuid.UUID) ([]GetOrderWithItemsRow, error) {
	rows, err := q.db.Query(ctx, getOrderWithItems, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetOrderWithItemsRow
	for rows.Next() {
		var i GetOrderWithItemsRow
		if err := rows.Scan(
			&i.ID,
			&i.UserID,
			&i.UserFullName,
			&i.Status,
			&i.TotalAmountCents,
			&i.PaymentMethod,
			&i.Province,
			&i.City,
			&i.PhoneNumber1,
			&i.PhoneNumber2,
			&i.Notes,
			&i.DeliveryServiceID,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.CompletedAt,
			&i.CancelledAt,
			&i.ItemID,
			&i.ItemOrderID,
			&i.ItemProductID,
			&i.ItemProductName,
			&i.ItemPriceCents,
			&i.ItemQuantity,
			&i.ItemSubtotalCents,
			&i.ItemCreatedAt,
			&i.ItemUpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const incrementStock = `-- name: IncrementStock :one
UPDATE products
SET stock_quantity = stock_quantity + $1
WHERE id = $2
RETURNING id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at, deleted_at
`

type IncrementStockParams struct {
	IncrementAmount int32     `json:"increment_amount"`
	ProductID       uuid.UUID `json:"product_id"`
}

type IncrementStockRow struct {
	ID               uuid.UUID          `json:"id"`
	CategoryID       uuid.UUID          `json:"category_id"`
	Name             string             `json:"name"`
	Slug             string             `json:"slug"`
	Description      *string            `json:"description"`
	ShortDescription *string            `json:"short_description"`
	PriceCents       int64              `json:"price_cents"`
	StockQuantity    int32              `json:"stock_quantity"`
	Status           string             `json:"status"`
	Brand            string             `json:"brand"`
	ImageUrls        []byte             `json:"image_urls"`
	SpecHighlights   []byte             `json:"spec_highlights"`
	CreatedAt        pgtype.Timestamptz `json:"created_at"`
	UpdatedAt        pgtype.Timestamptz `json:"updated_at"`
	DeletedAt        pgtype.Timestamptz `json:"deleted_at"`
}

// Increments the stock_quantity for a product by a given amount.
// Suitable for releasing stock back when cancelling an order.
func (q *Queries) IncrementStock(ctx context.Context, arg IncrementStockParams) (IncrementStockRow, error) {
	row := q.db.QueryRow(ctx, incrementStock, arg.IncrementAmount, arg.ProductID)
	var i IncrementStockRow
	err := row.Scan(
		&i.ID,
		&i.CategoryID,
		&i.Name,
		&i.Slug,
		&i.Description,
		&i.ShortDescription,
		&i.PriceCents,
		&i.StockQuantity,
		&i.Status,
		&i.Brand,
		&i.ImageUrls,
		&i.SpecHighlights,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.DeletedAt,
	)
	return i, err
}

const insertOrderItemsBulk = `-- name: InsertOrderItemsBulk :exec
INSERT INTO order_items (order_id, product_id, product_name, price_cents, quantity)
SELECT
    $1 AS order_id, -- The single order ID for all items
    unnest($2::UUID[]) AS product_id, -- Array of product IDs
    unnest($3::TEXT[]) AS product_name, -- Array of product names (denormalized)
    unnest($4::BIGINT[]) AS price_cents, -- Array of final prices (including discounts)
    unnest($5::INTEGER[]) AS quantity
`

type InsertOrderItemsBulkParams struct {
	OrderID      uuid.UUID   `json:"order_id"`
	ProductIds   []uuid.UUID `json:"product_ids"`
	ProductNames []string    `json:"product_names"`
	PricesCents  []int64     `json:"prices_cents"`
	Quantities   []int32     `json:"quantities"`
}

// Inserts multiple order items efficiently in a single query.
// Requires arrays of equal length for product_ids, quantities, names, and prices_cents.
func (q *Queries) InsertOrderItemsBulk(ctx context.Context, arg InsertOrderItemsBulkParams) error {
	_, err := q.db.Exec(ctx, insertOrderItemsBulk,
		arg.OrderID,
		arg.ProductIds,
		arg.ProductNames,
		arg.PricesCents,
		arg.Quantities,
	)
	return err
}

const insertOrderItemsFromCart = `-- name: InsertOrderItemsFromCart :exec
INSERT INTO order_items (order_id, product_id, product_name, price_cents, quantity, created_at)
SELECT
    $1 AS order_id, -- The single order ID for all items
    ci.product_id,
    p.name AS product_name, -- Get the name from the products table
    COALESCE(vpcd.calculated_discounted_price_cents, p.price_cents) AS price_cents, -- Use the final price from the cart or fallback to original
    ci.quantity,
    NOW() -- Set the created_at timestamp for the order item
FROM
    cart_items ci
JOIN
    products p ON ci.product_id = p.id -- Join to get product name
LEFT JOIN
    v_products_with_calculated_discounts vpcd ON p.id = vpcd.product_id -- Join with the discount view to get final price
WHERE
    ci.cart_id = $2 -- Fetch items from the specific cart
    AND ci.deleted_at IS NULL
`

type InsertOrderItemsFromCartParams struct {
	OrderID uuid.UUID `json:"order_id"`
	CartID  uuid.UUID `json:"cart_id"`
}

// Inserts order items into the order_items table by copying them from the user's current cart.
// This ensures the item details (product, name, price, quantity) reflect the exact state of the cart at order creation time.
// It fetches the final price (including discounts) from the cart_items joined with the calculated discount view.
func (q *Queries) InsertOrderItemsFromCart(ctx context.Context, arg InsertOrderItemsFromCartParams) error {
	_, err := q.db.Exec(ctx, insertOrderItemsFromCart, arg.OrderID, arg.CartID)
	return err
}

const listAllOrders = `-- name: ListAllOrders :many

SELECT 
    id, user_id, user_full_name, status, total_amount_cents, payment_method,
    province, city, phone_number_1, phone_number_2,
    notes, delivery_service_id, created_at, updated_at, completed_at, cancelled_at
FROM orders
WHERE ($1::UUID = '00000000-0000-0000-0000-000000000000'::UUID OR user_id = $1) -- Filter by user_id if provided
  AND ($2::TEXT = '' OR status = $2) -- Filter by status if provided
ORDER BY created_at DESC
LIMIT $4 OFFSET $3
`

type ListAllOrdersParams struct {
	FilterUserID uuid.UUID `json:"filter_user_id"`
	FilterStatus string    `json:"filter_status"`
	PageOffset   int32     `json:"page_offset"`
	PageLimit    int32     `json:"page_limit"`
}

// Page limit and offset
// Retrieves a paginated list of all orders with denormalized address fields, optionally filtered by status or user_id.
// Intended for admin use. Includes cancelled orders.
// If filter_user_id is the zero UUID ('00000000-0000-0000-0000-000000000000'), it retrieves orders for all users.
// If filter_status is an empty string (”), it retrieves orders of all statuses.
func (q *Queries) ListAllOrders(ctx context.Context, arg ListAllOrdersParams) ([]Order, error) {
	rows, err := q.db.Query(ctx, listAllOrders,
		arg.FilterUserID,
		arg.FilterStatus,
		arg.PageOffset,
		arg.PageLimit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Order
	for rows.Next() {
		var i Order
		if err := rows.Scan(
			&i.ID,
			&i.UserID,
			&i.UserFullName,
			&i.Status,
			&i.TotalAmountCents,
			&i.PaymentMethod,
			&i.Province,
			&i.City,
			&i.PhoneNumber1,
			&i.PhoneNumber2,
			&i.Notes,
			&i.DeliveryServiceID,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.CompletedAt,
			&i.CancelledAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listUserOrders = `-- name: ListUserOrders :many

SELECT 
    id, user_id, user_full_name, status, total_amount_cents, payment_method,
    province, city, phone_number_1, phone_number_2,
    notes, delivery_service_id, created_at, updated_at, completed_at, cancelled_at
FROM orders
WHERE user_id = $1
  AND ($2::TEXT = '' OR status = $2) -- Filter by status if provided
  -- Explicitly exclude cancelled orders for user list
  AND cancelled_at IS NULL 
ORDER BY created_at DESC
LIMIT $4 OFFSET $3
`

type ListUserOrdersParams struct {
	UserID       uuid.UUID `json:"user_id"`
	FilterStatus string    `json:"filter_status"`
	PageOffset   int32     `json:"page_offset"`
	PageLimit    int32     `json:"page_limit"`
}

// Order items consistently
// Retrieves a paginated list of orders for a specific user with denormalized address fields, optionally filtered by status.
// Excludes cancelled orders by default. Admins should use ListAllOrders.
func (q *Queries) ListUserOrders(ctx context.Context, arg ListUserOrdersParams) ([]Order, error) {
	rows, err := q.db.Query(ctx, listUserOrders,
		arg.UserID,
		arg.FilterStatus,
		arg.PageOffset,
		arg.PageLimit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Order
	for rows.Next() {
		var i Order
		if err := rows.Scan(
			&i.ID,
			&i.UserID,
			&i.UserFullName,
			&i.Status,
			&i.TotalAmountCents,
			&i.PaymentMethod,
			&i.Province,
			&i.City,
			&i.PhoneNumber1,
			&i.PhoneNumber2,
			&i.Notes,
			&i.DeliveryServiceID,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.CompletedAt,
			&i.CancelledAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const updateOrder = `-- name: UpdateOrder :one

UPDATE orders
SET
    notes = COALESCE($1, notes), -- Use narg for potentially nil values
    updated_at = NOW()
WHERE id = $2
RETURNING id, user_id, user_full_name, status, total_amount_cents, payment_method,
         province, city, phone_number_1, phone_number_2,
         notes, delivery_service_id, created_at, updated_at, completed_at, cancelled_at
`

type UpdateOrderParams struct {
	Notes   *string   `json:"notes"`
	OrderID uuid.UUID `json:"order_id"`
}

// Page limit and offset
// Updates other details of an order (notes, timestamps).
// Address fields are denormalized and set during creation.
func (q *Queries) UpdateOrder(ctx context.Context, arg UpdateOrderParams) (Order, error) {
	row := q.db.QueryRow(ctx, updateOrder, arg.Notes, arg.OrderID)
	var i Order
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.UserFullName,
		&i.Status,
		&i.TotalAmountCents,
		&i.PaymentMethod,
		&i.Province,
		&i.City,
		&i.PhoneNumber1,
		&i.PhoneNumber2,
		&i.Notes,
		&i.DeliveryServiceID,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.CompletedAt,
		&i.CancelledAt,
	)
	return i, err
}

const updateOrderStatus = `-- name: UpdateOrderStatus :one
UPDATE orders
SET status = $1,
    updated_at = NOW(),
    completed_at = CASE
        WHEN $1 IN ('delivered', 'cancelled') AND completed_at IS NULL THEN NOW()
        ELSE completed_at -- Don't overwrite if already set
    END,
    cancelled_at = CASE
        WHEN $1 = 'cancelled' AND cancelled_at IS NULL THEN NOW()
        ELSE cancelled_at -- Don't overwrite if already set
    END
WHERE id = $2
RETURNING id, user_id, user_full_name, status, total_amount_cents, payment_method,
         province, city, phone_number_1, phone_number_2,
         notes, delivery_service_id, created_at, updated_at, completed_at, cancelled_at
`

type UpdateOrderStatusParams struct {
	Status  string    `json:"status"`
	OrderID uuid.UUID `json:"order_id"`
}

// Updates the status of an order and manages completion/cancellation timestamps.
func (q *Queries) UpdateOrderStatus(ctx context.Context, arg UpdateOrderStatusParams) (Order, error) {
	row := q.db.QueryRow(ctx, updateOrderStatus, arg.Status, arg.OrderID)
	var i Order
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.UserFullName,
		&i.Status,
		&i.TotalAmountCents,
		&i.PaymentMethod,
		&i.Province,
		&i.City,
		&i.PhoneNumber1,
		&i.PhoneNumber2,
		&i.Notes,
		&i.DeliveryServiceID,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.CompletedAt,
		&i.CancelledAt,
	)
	return i, err
}


File: internal/db/querier.go
================================================
// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.30.0

package db

import (
	"context"

	"github.com/google/uuid"
)

type Querier interface {
	// Removes the soft-delete marker by setting deleted_at to NULL.
	ActivateUser(ctx context.Context, userID uuid.UUID) error
	// Include deleted_at to see if undeletion happened
	// Adds multiple items to a cart, handling upserts and soft deletes.
	// Checks stock availability for each item during the insert/update process.
	// Join with products table to validate existence, status, deletion, and stock for the INSERT
	AddCartItemsBulk(ctx context.Context, arg AddCartItemsBulkParams) (int64, error)
	// Gets a specific user by ID, regardless of soft-delete status.
	// Useful for admin to see any user, active or inactive.
	AdminGetUser(ctx context.Context, userID uuid.UUID) (User, error)
	// Associates a discount with a specific category (simplified version, might need more checks).
	ApplyDiscountToCategory(ctx context.Context, arg ApplyDiscountToCategoryParams) error
	// Include usage limit check
	// Associates a discount with a specific product (simplified version, might need more checks).
	ApplyDiscountToProduct(ctx context.Context, arg ApplyDiscountToProductParams) error
	// Calculates the average rating and count of non-deleted reviews for a specific product.
	// Used to update the products table.
	CalculateReviewStatsForProduct(ctx context.Context, productID uuid.UUID) (CalculateReviewStatsForProductRow, error)
	// Order items consistently
	// Updates the status of an order to 'cancelled' and sets the cancelled_at and completed_at timestamps.
	// This is a soft cancellation.
	CancelOrder(ctx context.Context, orderID uuid.UUID) (Order, error)
	// Checks if a product slug already exists (excluding soft-deleted products).
	CheckSlugExists(ctx context.Context, slug string) (bool, error)
	CleanupExpiredRefreshTokens(ctx context.Context) error
	ClearCart(ctx context.Context, cartID uuid.UUID) error
	CountAllProducts(ctx context.Context) (int64, error)
	// Counts discounts based on the same filters as ListDiscounts.
	CountDiscounts(ctx context.Context, arg CountDiscountsParams) (int64, error)
	CountProducts(ctx context.Context, arg CountProductsParams) (int64, error)
	// Counts users matching the search term, optionally filtered by active status.
	// Useful for pagination metadata with search.
	CountSearchUsers(ctx context.Context, arg CountSearchUsersParams) (int64, error)
	// Counts total users, optionally filtered by active status (soft-deleted).
	// Useful for pagination metadata.
	CountUsers(ctx context.Context, activeOnly bool) (int64, error)
	// Cart Item Management
	CreateCartItem(ctx context.Context, arg CreateCartItemParams) (CartItem, error)
	CreateDeliveryService(ctx context.Context, arg CreateDeliveryServiceParams) (DeliveryService, error)
	// Inserts a new discount record.
	CreateDiscount(ctx context.Context, arg CreateDiscountParams) (Discount, error)
	CreateGuestCart(ctx context.Context, sessionID *string) (Cart, error)
	// Creates a new order with denormalized address fields and returns its details.
	CreateOrder(ctx context.Context, arg CreateOrderParams) (Order, error)
	CreateProduct(ctx context.Context, arg CreateProductParams) (Product, error)
	CreateRefreshToken(ctx context.Context, arg CreateRefreshTokenParams) error
	// Inserts a new review and returns its details.
	// NOTE: This query alone does not update the product's avg_rating/num_ratings.
	CreateReview(ctx context.Context, arg CreateReviewParams) (CreateReviewRow, error)
	CreateUser(ctx context.Context, arg CreateUserParams) (User, error)
	// Cart Management
	CreateUserCart(ctx context.Context, userID uuid.UUID) (Cart, error)
	// Attempts to decrement the stock_quantity for a product by a given amount.
	// Succeeds only if the resulting stock_quantity would be >= 0.
	// Returns the updated product row if successful, or an error if insufficient stock.
	// Note: The RETURNING clause might not be strictly necessary if we only care about RowsAffected.
	// If RETURNING is omitted, the querier function will likely return sql.Result.
	// Let's include RETURNING to get the updated stock if needed for debugging/logging.
	DecrementStockIfSufficient(ctx context.Context, arg DecrementStockIfSufficientParams) (DecrementStockIfSufficientRow, error)
	DeleteCart(ctx context.Context, cartID uuid.UUID) error
	// Cart Cleanup
	DeleteCartItem(ctx context.Context, itemID uuid.UUID) error
	// Soft delete could be achieved by updating is_active to FALSE
	// For hard delete:
	DeleteDeliveryService(ctx context.Context, id uuid.UUID) error
	// Deletes a discount record (and associated links via CASCADE).
	DeleteDiscount(ctx context.Context, id uuid.UUID) error
	DeleteProduct(ctx context.Context, productID uuid.UUID) error
	// Soft deletes a review by setting deleted_at.
	// NOTE: This query alone does not update the product's avg_rating/num_ratings.
	DeleteReview(ctx context.Context, arg DeleteReviewParams) (DeleteReviewRow, error)
	// Retrieves all delivery services that are currently active.
	// Suitable for user-facing contexts like checkout.
	GetActiveDeliveryServices(ctx context.Context) ([]DeliveryService, error)
	// Check usage limit
	// Fetches all currently active discounts (within date range and usage limits).
	GetActiveDiscounts(ctx context.Context) ([]Discount, error)
	// Calculates the average time between order confirmation and shipment/delivery completion.
	// Assumes 'confirmed' status is the start and 'shipped' or 'delivered' is the end.
	GetAverageFulfillmentTime(ctx context.Context, arg GetAverageFulfillmentTimeParams) (float64, error)
	// $1 = start_date, $2 = end_date
	// Calculates the average order value (AOV) for delivered orders within a given time range.
	GetAverageOrderValue(ctx context.Context, arg GetAverageOrderValueParams) (float64, error)
	GetCartByID(ctx context.Context, cartID uuid.UUID) (GetCartByIDRow, error)
	GetCartBySessionID(ctx context.Context, sessionID *string) (GetCartBySessionIDRow, error)
	GetCartByUserID(ctx context.Context, userID uuid.UUID) (GetCartByUserIDRow, error)
	GetCartItemByCartAndProduct(ctx context.Context, arg GetCartItemByCartAndProductParams) (GetCartItemByCartAndProductRow, error)
	GetCartItemByID(ctx context.Context, itemID uuid.UUID) (GetCartItemByIDRow, error)
	// Update the timestamp
	// Counts the number of active (non-deleted) items in a specific cart.
	GetCartItemsCount(ctx context.Context, cartID uuid.UUID) (int64, error)
	// Enhanced Cart Data Retrieval
	GetCartItemsWithProductDetails(ctx context.Context, cartID uuid.UUID) ([]GetCartItemsWithProductDetailsRow, error)
	GetCartStats(ctx context.Context, cartID uuid.UUID) (GetCartStatsRow, error)
	GetCartWithItemsAndProducts(ctx context.Context, cartID uuid.UUID) ([]GetCartWithItemsAndProductsRow, error)
	// $1 = page_limit, $2 = page_offset
	// Assuming this returns one cart object with many items
	GetCartWithItemsAndProductsWithDiscounts(ctx context.Context, id uuid.UUID) ([]GetCartWithItemsAndProductsWithDiscountsRow, error)
	GetCategory(ctx context.Context, categoryID uuid.UUID) (Category, error)
	GetCategoryBySlug(ctx context.Context, slug string) (Category, error)
	GetDeliveryService(ctx context.Context, arg GetDeliveryServiceParams) (DeliveryService, error)
	// Retrieves a delivery service by its ID, regardless of its active status.
	// Suitable for admin operations.
	GetDeliveryServiceByID(ctx context.Context, id uuid.UUID) (DeliveryService, error)
	// Allow filtering by active status
	GetDeliveryServiceByName(ctx context.Context, arg GetDeliveryServiceByNameParams) (DeliveryService, error)
	// Fetches a discount by its unique code.
	GetDiscountByCode(ctx context.Context, code string) (Discount, error)
	// Fetches a discount by its ID.
	GetDiscountByID(ctx context.Context, id uuid.UUID) (Discount, error)
	// --- Discount Effectiveness ---
	// Retrieves usage count and revenue attributed to specific discount codes within a time range.
	GetDiscountUsage(ctx context.Context, arg GetDiscountUsageParams) ([]GetDiscountUsageRow, error)
	// Fetches active discounts applicable to a specific category.
	GetDiscountsByCategoryID(ctx context.Context, categoryID uuid.UUID) ([]Discount, error)
	// Fetches active discounts applicable to a specific product.
	GetDiscountsByProductID(ctx context.Context, productID uuid.UUID) ([]Discount, error)
	// $3 = number of top categories to return (N)
	// --- Product Performance ---
	// Retrieves products with stock quantity below a specified threshold.
	GetLowStockProducts(ctx context.Context, stockQuantity int32) ([]GetLowStockProductsRow, error)
	// --- Customer Insights ---
	// Counts the number of new customers registered within a given time range.
	GetNewCustomersCount(ctx context.Context, arg GetNewCustomersCountParams) (int64, error)
	// Array of quantities
	// Retrieves an order by its ID with denormalized address fields.
	GetOrder(ctx context.Context, orderID uuid.UUID) (Order, error)
	// Retrieves all items for a specific order ID.
	GetOrderItemsByOrderID(ctx context.Context, orderID uuid.UUID) ([]OrderItem, error)
	// Exclude soft-deleted users
	// --- Order Metrics ---
	// Counts the number of orders in each status (pending, confirmed, shipped, delivered, cancelled).
	GetOrderStatusCounts(ctx context.Context, arg GetOrderStatusCountsParams) ([]GetOrderStatusCountsRow, error)
	// Retrieves an order by its ID along with all its items, including denormalized address fields.
	// This query uses a join and might return multiple rows if there are items.
	// The service layer needs to aggregate these rows into a single Order object with a slice of OrderItems.
	GetOrderWithItems(ctx context.Context, orderID uuid.UUID) ([]GetOrderWithItemsRow, error)
	// $1 = start_date, $2 = end_date
	// Note: This query is complex because order status updates modify the same row.
	// A more robust approach might involve an order_status_history table or window functions.
	// Simplified version assuming statuses are updated sequentially and we just compare timestamps.
	// A better way might be to track status change events explicitly.
	// For now, let's simplify the logic assuming we just want the difference between created_at and updated_at
	// for 'shipped' or 'delivered' orders, IF created_at represents the time it became confirmed.
	// This might not be accurate depending on how status transitions are handled.
	// Let's revise:
	// Assume 'confirmed' status sets confirmed_at, 'shipped' sets shipped_at, 'delivered' sets delivered_at.
	// Add these timestamp fields to the orders table if they don't exist.
	// ALTER TABLE orders ADD COLUMN confirmed_at TIMESTAMPTZ, shipped_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ;
	// Then update these timestamps in the service layer upon status changes.
	// Query would then be:
	// SELECT AVG(EXTRACT(EPOCH FROM (delivered_at - confirmed_at))) FROM orders WHERE status = 'delivered' AND ...;
	// For now, acknowledging this complexity, we'll note it and move on, assuming status timestamps exist or are derivable.
	// This query might need adjustment based on how status changes are tracked in the DB.
	// Let's add a simpler one based on status counts for now.
	// Counts orders by status within a time range.
	// This is similar to GetOrderStatusCounts but with a time filter.
	GetOrdersByStatusWithinTimeRange(ctx context.Context, arg GetOrdersByStatusWithinTimeRangeParams) ([]GetOrdersByStatusWithinTimeRangeRow, error)
	GetProduct(ctx context.Context, productID uuid.UUID) (Product, error)
	GetProductBySlug(ctx context.Context, slug string) (Product, error)
	// Retrieves average rating and number of ratings for a specific product.
	// (This might already be covered by the existing product queries selecting avg_rating, num_ratings)
	// But here's a dedicated query if needed:
	GetProductReviewStats(ctx context.Context, id uuid.UUID) (GetProductReviewStatsRow, error)
	GetProductWithDiscountInfo(ctx context.Context, id uuid.UUID) (GetProductWithDiscountInfoRow, error)
	// Query: GetProductWithDiscountInfoBySlug
	// Retrieves a specific product by slug along with its calculated discount information using the pre-calculated view.
	GetProductWithDiscountInfoBySlug(ctx context.Context, slug string) (GetProductWithDiscountInfoBySlugRow, error)
	// Fetches a product and its active product-specific discounts.
	// This might return multiple rows if there are multiple discounts.
	// Aggregation into a list happens in Go.
	GetProductWithMultiDiscountDetails(ctx context.Context, id uuid.UUID) (GetProductWithMultiDiscountDetailsRow, error)
	GetProductsWithDiscountInfo(ctx context.Context, arg GetProductsWithDiscountInfoParams) ([]GetProductsWithDiscountInfoRow, error)
	GetProductsWithDiscountInfoView(ctx context.Context) ([]VProductsWithCurrentDiscount, error)
	// Retrieves a specific review by its ID and verifies the user owns it.
	GetReviewByIDAndUser(ctx context.Context, arg GetReviewByIDAndUserParams) (GetReviewByIDAndUserRow, error)
	// Retrieves a review by a specific user for a specific product.
	GetReviewByUserAndProduct(ctx context.Context, arg GetReviewByUserAndProductParams) (GetReviewByUserAndProductRow, error)
	// Retrieves all reviews for a specific product, including the reviewer's name, potentially paginated.
	GetReviewsByProductID(ctx context.Context, arg GetReviewsByProductIDParams) ([]GetReviewsByProductIDRow, error)
	// Retrieves all reviews submitted by a specific user, including the product name, potentially paginated.
	GetReviewsByUserID(ctx context.Context, arg GetReviewsByUserIDParams) ([]GetReviewsByUserIDRow, error)
	// $1 = start_date, $2 = end_date
	// Counts the total number of delivered orders within a given time range.
	GetSalesVolume(ctx context.Context, arg GetSalesVolumeParams) (int64, error)
	// $3 = number of top products to return (N)
	// Retrieves the top N selling categories (by quantity sold) within a given time range.
	GetTopSellingCategories(ctx context.Context, arg GetTopSellingCategoriesParams) ([]GetTopSellingCategoriesRow, error)
	// $1 = start_date, $2 = end_date
	// Retrieves the top N selling products (by quantity sold) within a given time range.
	GetTopSellingProducts(ctx context.Context, arg GetTopSellingProductsParams) ([]GetTopSellingProductsRow, error)
	// --- Sales Performance ---
	// Calculates the total revenue from all delivered orders within a given time range.
	GetTotalRevenue(ctx context.Context, arg GetTotalRevenueParams) (int64, error)
	GetUser(ctx context.Context, id uuid.UUID) (User, error)
	GetUserByEmail(ctx context.Context, email string) (User, error)
	// Fetches a specific user by ID along with order count and last order date.
	// Joins with the orders table to get aggregated details.
	// Includes soft-deleted users as well.
	GetUserWithDetails(ctx context.Context, userID uuid.UUID) (GetUserWithDetailsRow, error)
	GetValidRefreshTokenRecord(ctx context.Context, jti string) (RefreshToken, error)
	// Pagination using limit and offset
	// Increments the current_uses count for a specific discount.
	// This should ideally be called within a transaction when applying the discount.
	IncrementDiscountUsage(ctx context.Context, id uuid.UUID) error
	// Increments the stock_quantity for a product by a given amount.
	// Suitable for releasing stock back when cancelling an order.
	IncrementStock(ctx context.Context, arg IncrementStockParams) (IncrementStockRow, error)
	// Inserts multiple order items efficiently in a single query.
	// Requires arrays of equal length for product_ids, quantities, names, and prices_cents.
	InsertOrderItemsBulk(ctx context.Context, arg InsertOrderItemsBulkParams) error
	// Inserts order items into the order_items table by copying them from the user's current cart.
	// This ensures the item details (product, name, price, quantity) reflect the exact state of the cart at order creation time.
	// It fetches the final price (including discounts) from the cart_items joined with the calculated discount view.
	InsertOrderItemsFromCart(ctx context.Context, arg InsertOrderItemsFromCartParams) error
	// Check usage limit
	// Associates a category with a discount.
	LinkCategoryToDiscount(ctx context.Context, arg LinkCategoryToDiscountParams) error
	// Prevent exceeding max_uses
	// --- Link/Unlink Queries ---
	// Associates a product with a discount.
	LinkProductToDiscount(ctx context.Context, arg LinkProductToDiscountParams) error
	// Retrieves delivery services, optionally filtered by active status.
	// Suitable for admin operations.
	ListAllDeliveryServices(ctx context.Context, arg ListAllDeliveryServicesParams) ([]DeliveryService, error)
	// Page limit and offset
	// Retrieves a paginated list of all orders with denormalized address fields, optionally filtered by status or user_id.
	// Intended for admin use. Includes cancelled orders.
	// If filter_user_id is the zero UUID ('00000000-0000-0000-0000-000000000000'), it retrieves orders for all users.
	// If filter_status is an empty string (''), it retrieves orders of all statuses.
	ListAllOrders(ctx context.Context, arg ListAllOrdersParams) ([]Order, error)
	ListCategories(ctx context.Context) ([]Category, error)
	// Fetches a list of discounts, potentially with filters and pagination.
	ListDiscounts(ctx context.Context, arg ListDiscountsParams) ([]Discount, error)
	ListProducts(ctx context.Context, arg ListProductsParams) ([]Product, error)
	ListProductsByCategory(ctx context.Context, arg ListProductsByCategoryParams) ([]Product, error)
	ListProductsWithCategory(ctx context.Context, arg ListProductsWithCategoryParams) ([]ListProductsWithCategoryRow, error)
	ListProductsWithCategoryDetail(ctx context.Context, arg ListProductsWithCategoryDetailParams) ([]ListProductsWithCategoryDetailRow, error)
	// Order items consistently
	// Retrieves a paginated list of orders for a specific user with denormalized address fields, optionally filtered by status.
	// Excludes cancelled orders by default. Admins should use ListAllOrders.
	ListUserOrders(ctx context.Context, arg ListUserOrdersParams) ([]Order, error)
	// Lists users, optionally filtered by active status (soft-deleted).
	// Paginated using LIMIT and OFFSET.
	ListUsers(ctx context.Context, arg ListUsersParams) ([]User, error)
	// Lists users with essential details for admin list view (name, email, registration date, last order date, order count, status).
	// Optionally filter by active status.
	// Paginated using LIMIT and OFFSET.
	ListUsersWithListDetails(ctx context.Context, arg ListUsersWithListDetailsParams) ([]ListUsersWithListDetailsRow, error)
	// Lists users with their total order counts.
	// Optionally filter by active status.
	// Paginated using LIMIT and OFFSET.
	ListUsersWithOrderCounts(ctx context.Context, arg ListUsersWithOrderCountsParams) ([]ListUsersWithOrderCountsRow, error)
	// Revokes all refresh tokens for a specific user.
	RevokeAllRefreshTokensByUserID(ctx context.Context, userID uuid.UUID) error
	RevokeRefreshTokenByJTI(ctx context.Context, jti string) error
	SearchProductsWithCategory(ctx context.Context, arg SearchProductsWithCategoryParams) ([]SearchProductsWithCategoryRow, error)
	// Searches for products and includes pre-calculated discount information using the view.
	// Includes a flexible spec highlight filter for partial matching within values.
	SearchProductsWithDiscounts(ctx context.Context, arg SearchProductsWithDiscountsParams) ([]SearchProductsWithDiscountsRow, error)
	// Searches users by email or full_name, optionally filtered by active status.
	// Paginated using LIMIT and OFFSET.
	SearchUsers(ctx context.Context, arg SearchUsersParams) ([]User, error)
	// Marks a user as soft-deleted by setting deleted_at to NOW().
	SoftDeleteUser(ctx context.Context, userID uuid.UUID) error
	// Merges items from a guest cart into a user's cart using upsert logic.
	// Handles quantity updates, stock checks, and soft-delete state transitions (undeletion).
	// This query performs the core merge operation efficiently in a single statement.
	SyncGuestCartItemsToUserCart(ctx context.Context, arg SyncGuestCartItemsToUserCartParams) error
	// Removes association between a category and a discount.
	UnlinkCategoryFromDiscount(ctx context.Context, arg UnlinkCategoryFromDiscountParams) error
	// Removes association between a product and a discount.
	UnlinkProductFromDiscount(ctx context.Context, arg UnlinkProductFromDiscountParams) error
	UpdateCartItemQuantity(ctx context.Context, arg UpdateCartItemQuantityParams) (UpdateCartItemQuantityRow, error)
	// Allow filtering by active status
	UpdateDeliveryService(ctx context.Context, arg UpdateDeliveryServiceParams) (DeliveryService, error)
	// Updates an existing discount record.
	UpdateDiscount(ctx context.Context, arg UpdateDiscountParams) (Discount, error)
	// Page limit and offset
	// Updates other details of an order (notes, timestamps).
	// Address fields are denormalized and set during creation.
	UpdateOrder(ctx context.Context, arg UpdateOrderParams) (Order, error)
	// Updates the status of an order and manages completion/cancellation timestamps.
	UpdateOrderStatus(ctx context.Context, arg UpdateOrderStatusParams) (Order, error)
	UpdateProduct(ctx context.Context, arg UpdateProductParams) (Product, error)
	// Updates the avg_rating and num_ratings fields in the products table for a specific product.
	UpdateProductReviewStats(ctx context.Context, arg UpdateProductReviewStatsParams) error
	// Updates the rating of an existing review.
	// NOTE: This query alone does not update the product's avg_rating/num_ratings.
	UpdateReview(ctx context.Context, arg UpdateReviewParams) (UpdateReviewRow, error)
}

var _ Querier = (*Queries)(nil)


File: internal/db/products_view.sql.go
================================================
// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.30.0
// source: products_view.sql

package db

import (
	"context"
)

const getProductsWithDiscountInfoView = `-- name: GetProductsWithDiscountInfoView :many
SELECT product_id, category_id, product_name, product_slug, product_description, product_short_description, original_price_cents, product_stock_quantity, product_status, product_brand, product_image_urls, product_spec_highlights, product_created_at, product_updated_at, product_deleted_at, avg_rating, num_ratings, discounted_price_cents, active_discount_code, active_discount_type, active_discount_value, has_active_discount
FROM v_products_with_current_discounts
`

func (q *Queries) GetProductsWithDiscountInfoView(ctx context.Context) ([]VProductsWithCurrentDiscount, error) {
	rows, err := q.db.Query(ctx, getProductsWithDiscountInfoView)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []VProductsWithCurrentDiscount
	for rows.Next() {
		var i VProductsWithCurrentDiscount
		if err := rows.Scan(
			&i.ProductID,
			&i.CategoryID,
			&i.ProductName,
			&i.ProductSlug,
			&i.ProductDescription,
			&i.ProductShortDescription,
			&i.OriginalPriceCents,
			&i.ProductStockQuantity,
			&i.ProductStatus,
			&i.ProductBrand,
			&i.ProductImageUrls,
			&i.ProductSpecHighlights,
			&i.ProductCreatedAt,
			&i.ProductUpdatedAt,
			&i.ProductDeletedAt,
			&i.AvgRating,
			&i.NumRatings,
			&i.DiscountedPriceCents,
			&i.ActiveDiscountCode,
			&i.ActiveDiscountType,
			&i.ActiveDiscountValue,
			&i.HasActiveDiscount,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}


File: internal/db/queries/multi_discounts.sql
================================================
-- name: GetProductWithMultiDiscountDetails :one
-- Fetches a product and its active product-specific discounts.
-- This might return multiple rows if there are multiple discounts.
-- Aggregation into a list happens in Go.
SELECT
    p.id,
    p.category_id,
    p.name,
    p.price_cents AS original_price_cents,
    -- ... other product fields ...
    d.id AS discount_id,
    d.code AS discount_code,
    d.discount_type AS discount_type,
    d.discount_value AS discount_value,
    d.created_at 
FROM products p
LEFT JOIN product_discounts pd ON p.id = pd.product_id
LEFT JOIN discounts d ON pd.discount_id = d.id AND d.is_active = TRUE AND NOW() BETWEEN d.valid_from AND d.valid_until
WHERE p.id = $1 AND p.deleted_at IS NULL
ORDER BY d.created_at ASC;


File: internal/db/queries/delivery_services.sql
================================================
-- name: GetDeliveryServiceByID :one
-- Retrieves a delivery service by its ID, regardless of its active status.
-- Suitable for admin operations.
SELECT id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at
FROM delivery_services
WHERE id = sqlc.arg(id);

-- name: GetActiveDeliveryServices :many
-- Retrieves all delivery services that are currently active.
-- Suitable for user-facing contexts like checkout.
SELECT id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at
FROM delivery_services
WHERE is_active = TRUE
ORDER BY name ASC;

-- name: ListAllDeliveryServices :many
-- Retrieves delivery services, optionally filtered by active status.
-- Suitable for admin operations.
SELECT id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at
FROM delivery_services
WHERE is_active = sqlc.arg(active_filter) -- Filter by active status
ORDER BY name ASC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CreateDeliveryService :one
INSERT INTO delivery_services (
    name, description, base_cost_cents, estimated_days, is_active
) VALUES (
    sqlc.arg(name), sqlc.arg(description), sqlc.arg(base_cost_cents), sqlc.arg(estimated_days), sqlc.arg(is_active)
)
RETURNING id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at;

-- name: GetDeliveryService :one
SELECT id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at
FROM delivery_services
WHERE id = sqlc.arg(id) AND is_active = sqlc.arg(active_filter); -- Allow filtering by active status

-- name: GetDeliveryServiceByName :one
SELECT id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at
FROM delivery_services
WHERE name = sqlc.arg(name) AND is_active = sqlc.arg(active_filter); -- Allow filtering by active status

-- name: UpdateDeliveryService :one
UPDATE delivery_services
SET
    name = COALESCE(sqlc.narg(name), name),
    description = COALESCE(sqlc.narg(description), description),
    base_cost_cents = COALESCE(sqlc.narg(base_cost_cents), base_cost_cents),
    estimated_days = COALESCE(sqlc.narg(estimated_days), estimated_days),
    is_active = COALESCE(sqlc.narg(is_active), is_active),
    updated_at = NOW()
WHERE id = sqlc.arg(id)
RETURNING id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at;

-- name: DeleteDeliveryService :exec
-- Soft delete could be achieved by updating is_active to FALSE
-- For hard delete:
DELETE FROM delivery_services WHERE id = sqlc.arg(id);


File: internal/models/cart.go
================================================
package models

import (
	"time"

	"github.com/google/uuid"
)

// Cart represents the main cart entity.
type Cart struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id,omitempty"`
	SessionID *string   `json:"session_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CartItem represents an individual item within a cart.
type CartItem struct {
	ID        uuid.UUID `json:"id"`
	CartID    uuid.UUID `json:"cart_id"`
	ProductID uuid.UUID `json:"product_id"`
	Quantity  int       `json:"quantity"`
}

// CartItemSummary includes the cart item details plus the associated product information.
type CartItemSummary struct {
	ID       uuid.UUID    `json:"id"`
	CartID   uuid.UUID    `json:"cart_id"`
	Product  *ProductLite `json:"product"`
	Quantity int          `json:"quantity"`
}

// ProductLite holds essential product info for display in cart/order summaries.
type ProductLite struct {
	ID                 uuid.UUID `json:"id"`
	Name               string    `json:"name"`
	OriginalPriceCents int64     `json:"original_price_cents"` // The base price from the product table
	FinalPriceCents    int64     `json:"final_price_cents"`    // The price after applying any active discounts
	StockQuantity      int32     `json:"stock_quantity"`
	ImageUrls          []string  `json:"image_urls"`
	Brand              string    `json:"brand"`
	DiscountCode       *string   `json:"discount_code,omitempty"`
	DiscountType       *string   `json:"discount_type,omitempty"`
	DiscountValue      *int64    `json:"discount_value,omitempty"`
	HasActiveDiscount  bool      `json:"has_active_discount"`
}

// CartSummary represents the complete state of a cart for display purposes.
type CartSummary struct {
	ID                        uuid.UUID         `json:"id"`
	UserID                    uuid.UUID         `json:"user_id,omitempty"`
	SessionID                 *string           `json:"session_id,omitempty"`
	CreatedAt                 time.Time         `json:"created_at"`
	UpdatedAt                 time.Time         `json:"updated_at"`
	Items                     []CartItemSummary `json:"items"`
	TotalItems                int               `json:"total_items"`                  // Number of distinct items in the cart
	TotalQty                  int               `json:"total_quantity"`               // Total quantity of all items
	TotalOriginalValueCents   int64             `json:"total_original_value_cents"`   // Sum of (original_price * quantity) for all items
	TotalDiscountedValueCents int64             `json:"total_discounted_value_cents"` // Sum of (final_price * quantity) for all items (what the user pays)
	TotalSavingsCents         int64             `json:"total_savings_cents"`          // TotalOriginal - TotalDiscounted
}
type AddItemRequest struct {
	ProductID string `json:"product_id" validate:"required,uuid"` // Expecting UUID string
	Quantity  int    `json:"quantity" validate:"required,min=1"`  // Minimum quantity is 1
}
type BulkAddItemRequest_Item struct {
	ProductID uuid.UUID `json:"product_id"`
	Quantity  int       `json:"quantity"`
}
type BulkAddItemRequest struct {
	Items []BulkAddItemRequest_Item `json:"items"`
}

func (ir *AddItemRequest) Validate() error {
	return Validate.Struct(ir)
}

type UpdateItemQuantityRequest struct {
	Quantity int `json:"quantity" validate:"required,min=1"` // Minimum quantity is 1
}

func (uir *UpdateItemQuantityRequest) Validate() error {
	return Validate.Struct(uir)
}


File: internal/models/admin_user.go
================================================
package models

import (
	"time"

	"github.com/google/uuid"
)

// AdminUserListItem represents a user entry in the admin user list/detail view.
type AdminUserListItem struct {
	ID               uuid.UUID  `json:"id"`
	Name             string     `json:"name"` // Derived from FullName
	Email            string     `json:"email"`
	RegistrationDate time.Time  `json:"registration_date"`         // From users.created_at
	LastOrderDate    *time.Time `json:"last_order_date,omitempty"` // From latest order's created_at
	OrderCount       int64      `json:"order_count"`               // Aggregated from orders
	ActivityStatus   string     `json:"activity_status"`           // "Active" or "Inactive"
}

// AdminUpdateUserRequest represents data to update a user's details/status.
type AdminUpdateUserRequest struct {
	IsActive *bool   `json:"is_active,omitempty"` // Admin can set active/inactive (via soft delete)
	IsAdmin  *bool   `json:"is_admin,omitempty"`  // Admin can promote/demote admin status
	FullName *string `json:"full_name,omitempty"` // Admin can potentially update name (be careful)
}

// AdminActivateUserRequest represents data for activating a user (currently empty, could add audit reason later).
type AdminActivateUserRequest struct {
	// Potentially add fields like 'reason' for activation if needed
}

// AdminDeactivateUserRequest represents data for deactivating a user (currently empty, could add audit reason later).
type AdminDeactivateUserRequest struct {
	// Potentially add fields like 'reason' for deactivation if needed
}


File: internal/models/discount.go
================================================
package models

import (
	"errors"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

// DiscountType defines the type of discount.
type DiscountType string

const (
	DiscountTypePercentage DiscountType = "percentage"
	DiscountTypeFixed      DiscountType = "fixed" // Matches the schema
)

// Discount represents a discount rule.
// This model maps directly to the 'discounts' table in the database.
type Discount struct {
	ID                 uuid.UUID    `json:"id"`
	Code               string       `json:"code"`                  // Unique code for the discount
	Description        *string      `json:"description,omitempty"` // Nullable description
	DiscountType       DiscountType `json:"discount_type"`         // Either 'percentage' or 'fixed'
	DiscountValue      int64        `json:"discount_value"`        // e.g., 10 for 10%, 500 for $5
	MinOrderValueCents int64        `json:"min_order_value_cents"` // Minimum order value (default 0)
	MaxUses            *int         `json:"max_uses,omitempty"`    // Nullable maximum uses (NULL means unlimited)
	CurrentUses        int          `json:"current_uses"`          // Counter for current usage (default 0)
	ValidFrom          time.Time    `json:"valid_from"`            // Start date for the discount
	ValidUntil         time.Time    `json:"valid_until"`           // End date for the discount
	IsActive           bool         `json:"is_active"`             // Whether the discount is currently active
	CreatedAt          time.Time    `json:"created_at"`            // Timestamp of creation
	UpdatedAt          time.Time    `json:"updated_at"`            // Timestamp of last update
}

// --- Request Models ---

// CreateDiscountRequest holds data for creating a new discount.
type CreateDiscountRequest struct {
	Code               string       `json:"code" validate:"required,alphanum,max=50"`                   // Required, alphanumeric, max 50 chars
	Description        *string      `json:"description,omitempty"`                                      // Optional description
	DiscountType       DiscountType `json:"discount_type" validate:"required,oneof=percentage fixed"`   // Required, must be percentage or fixed
	DiscountValue      int64        `json:"discount_value" validate:"required,min=0"`                   // Required, non-negative
	MinOrderValueCents *int64       `json:"min_order_value_cents,omitempty" validate:"omitempty,min=0"` // Optional, non-negative
	MaxUses            *int         `json:"max_uses,omitempty" validate:"omitempty,min=1"`              // Optional, minimum 1 if provided
	ValidFrom          time.Time    `json:"valid_from" validate:"required"`                             // Required
	ValidUntil         time.Time    `json:"valid_until" validate:"required,gtfield=ValidFrom"`          // Required, must be after ValidFrom
	IsActive           bool         `json:"is_active"`                                                  // Required (true/false)
}

// UpdateDiscountRequest holds data for updating an existing discount.
// All fields are pointers, allowing partial updates.
type UpdateDiscountRequest struct {
	Code               *string       `json:"code,omitempty" validate:"omitempty,alphanum,max=50"`                   // Optional, alphanumeric, max 50 chars
	Description        *string       `json:"description,omitempty"`                                                 // Optional description
	DiscountType       *DiscountType `json:"discount_type,omitempty" validate:"omitempty,oneof=percentage fixed"`   // Optional, must be percentage or fixed
	DiscountValue      *int64        `json:"discount_value,omitempty" validate:"omitempty,min=0"`                   // Optional, non-negative
	MinOrderValueCents *int64        `json:"min_order_value_cents,omitempty" validate:"omitempty,min=0"`            // Optional, non-negative
	MaxUses            *int          `json:"max_uses,omitempty" validate:"omitempty,min=1"`                         // Optional, minimum 1 if provided
	ValidFrom          *time.Time    `json:"valid_from,omitempty" validate:"omitempty,datetime"`                    // Optional datetime
	ValidUntil         *time.Time    `json:"valid_until,omitempty" validate:"omitempty,datetime,gtfield=ValidFrom"` // Optional datetime, must be after ValidFrom if both are provided
	IsActive           *bool         `json:"is_active,omitempty"`                                                   // Optional (true/false)
}

// LinkDiscountRequest holds data for linking a discount to a product.
type LinkDiscountRequest struct {
	ProductID uuid.UUID `json:"product_id" validate:"required,uuid"` // Required product ID
}

// UnlinkDiscountRequest holds data for unlinking a discount from a product.
// This is identical to LinkDiscountRequest for this use case.
type UnlinkDiscountRequest struct {
	ProductID uuid.UUID `json:"product_id" validate:"required,uuid"` // Required product ID
}

// ListDiscountsRequest holds parameters for filtering and paginating discount lists.
type ListDiscountsRequest struct {
	IsActive   *bool      `json:"is_active,omitempty"`                      // Filter by active status (true/false)
	ValidFrom  *time.Time `json:"valid_from,omitempty"`                     // Filter by valid from date (discount starts on or after this date)
	ValidUntil *time.Time `json:"valid_until,omitempty"`                    // Filter by valid until date (discount ends on or before this date)
	Page       int        `json:"page" validate:"omitempty,min=1"`          // Page number (default 1)
	Limit      int        `json:"limit" validate:"omitempty,min=1,max=100"` // Number of items per page (default 20, max 100)
}

// --- Response Models ---

// DiscountListResponse wraps a list of discounts with pagination info.
type DiscountListResponse struct {
	Data       []Discount `json:"data"`
	Page       int        `json:"page"`
	Limit      int        `json:"limit"`
	Total      int64      `json:"total"`       // Total number of discounts matching the filter
	TotalPages int        `json:"total_pages"` // Total number of pages
}

// --- Validation Methods ---

// Validator instance (shared for efficiency)
var ValidateDiscount = validator.New()

// Validate runs validations defined by the 'validate' tags on the struct.
func (r *CreateDiscountRequest) Validate() error {
	return ValidateDiscount.Struct(r)
}

func (r *UpdateDiscountRequest) Validate() error {
	return ValidateDiscount.Struct(r)
}

func (r *LinkDiscountRequest) Validate() error {
	return ValidateDiscount.Struct(r)
}

func (r *UnlinkDiscountRequest) Validate() error {
	return ValidateDiscount.Struct(r)
}

// Validate runs validations defined by the 'validate' tags on the struct.
func (r *ListDiscountsRequest) Validate() error {
	// Basic struct tag validation
	if err := ValidateDiscount.Struct(r); err != nil {
		return err
	}

	// Custom validation: if both dates are provided, ensure ValidUntil is not before ValidFrom
	if r.ValidFrom != nil && r.ValidUntil != nil && r.ValidUntil.Before(*r.ValidFrom) {
		return errors.New("valid_until cannot be before valid_from")
	}

	return nil
}

// --- Helper Methods (if needed) ---

// IsValid checks if the discount is currently valid based on its dates and usage limits.
// This is a business logic method on the model.
func (d *Discount) IsValid() bool {
	now := time.Now()
	return d.IsActive &&
		d.ValidFrom.Before(now) &&
		d.ValidUntil.After(now) &&
		(d.MaxUses == nil || d.CurrentUses < *d.MaxUses)
}


File: internal/handlers/admin_user_handler.go
================================================
package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"tech-store-backend/internal/services"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// AdminUserHandler manages HTTP requests for admin user management operations.
type AdminUserHandler struct {
	service *services.AdminUserService
	logger  *slog.Logger
}

// NewAdminUserHandler creates a new instance of AdminUserHandler.
func NewAdminUserHandler(service *services.AdminUserService, logger *slog.Logger) *AdminUserHandler {
	return &AdminUserHandler{
		service: service,
		logger:  logger,
	}
}

// RegisterRoutes registers the admin user management-related routes with the provided Chi router.
// Assumes the router 'r' has admin middleware applied (e.g., JWT + RequireAdmin).
func (h *AdminUserHandler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.ListUsers)                      // GET /api/v1/admin/users (with ?active_only=&page=&limit=)
	r.Get("/{id}", h.GetUser)                    // GET /api/v1/admin/users/{id}
	r.Post("/{id}/activate", h.ActivateUser)     // POST /api/v1/admin/users/{id}/activate
	r.Post("/{id}/deactivate", h.DeactivateUser) // POST /api/v1/admin/users/{id}/deactivate
}

// ListUsers handles listing users.
func (h *AdminUserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters for filtering and pagination
	activeOnlyStr := r.URL.Query().Get("active_only")
	activeOnly := activeOnlyStr == "true" // Default to false if not provided or not "true"
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1 // Default page
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		} // else, keep default
	}

	limit := 20 // Default limit
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		} // else, keep default
	}

	offset := (page - 1) * limit

	users, err := h.service.ListUsers(r.Context(), activeOnly, limit, offset)
	if err != nil {
		h.logger.Error("Failed to list users", "error", err, "active_only", activeOnly, "page", page, "limit", limit)
		http.Error(w, "Failed to retrieve users", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(users); err != nil {
		h.logger.Error("Failed to encode ListUsers response", "error", err)
	}
}

// GetUser handles retrieving a specific user's details by their ID.
func (h *AdminUserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}

	userInfo, err := h.service.GetUser(r.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		h.logger.Error("Failed to get user details", "error", err, "user_id", id)
		http.Error(w, "Failed to retrieve user details", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(userInfo); err != nil {
		h.logger.Error("Failed to encode GetUser response", "error", err, "user_id", id)
	}
}

// ActivateUser handles activating a user.
func (h *AdminUserHandler) ActivateUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}

	err = h.service.ActivateUser(r.Context(), id)
	if err != nil {
		h.logger.Error("Failed to activate user", "error", err, "user_id", id)
		http.Error(w, "Failed to activate user", http.StatusInternalServerError)
		return
	}

	// Return 204 No Content on successful activation
	w.WriteHeader(http.StatusNoContent) // 204 No Content
}

// DeactivateUser handles deactivating a user.
func (h *AdminUserHandler) DeactivateUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}

	err = h.service.DeactivateUser(r.Context(), id)
	if err != nil {
		h.logger.Error("Failed to deactivate user", "error", err, "user_id", id)
		http.Error(w, "Failed to deactivate user", http.StatusInternalServerError)
		return
	}

	// Return 204 No Content on successful deactivation
	w.WriteHeader(http.StatusNoContent) // 204 No Content
}


File: internal/services/product_service.go
================================================
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

	"tech-store-backend/internal/db"
	"tech-store-backend/internal/models"
	"tech-store-backend/internal/storage"
	"tech-store-backend/internal/utils"
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
	// FIX: Corrected the mapping call
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

func (s *ProductService) ListCategories(ctx context.Context) ([]*models.Category, error) {
	dbCategories, err := s.querier.ListCategories(ctx)
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


File: internal/services/refresh_payload.json
================================================
{
  "refresh_token": "10ftYYN6ELRHcee0MRIsLmrPi2hd7ej2fOEHIGbgZfo="
}


File: migrations/00008_insert_test_data.sql
================================================
-- -- +goose Up
-- -- +goose StatementBegin
-- -- Insert random products for each category
-- -- Placeholder images are used for all products

-- -- CPU Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), '8c4cfda5-ecc8-4eef-a40d-cb5877351b77', 'Intel Core i9-13900K', 'intel-core-i9-13900k', 79999, 15, 'active', 'Intel', '["https://placehold.co/300x300?text=Intel+Core+i9-13900K"]', '{"cores": 24, "base_clock_ghz": 3.0, "boost_clock_ghz": 5.8}', NOW(), NOW()
-- );

-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), '8c4cfda5-ecc8-4eef-a40d-cb5877351b77', 'AMD Ryzen 9 7950X', 'amd-ryzen-9-7950x', 69999, 20, 'active', 'AMD', '["https://placehold.co/300x300?text=AMD+Ryzen+9+7950X"]', '{"cores": 16, "base_clock_ghz": 4.5, "boost_clock_ghz": 5.7}', NOW(), NOW()
-- );

-- -- GPU Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), '2d21b8db-9fc4-43c5-8acc-e150e85b2252', 'NVIDIA RTX 4090', 'nvidia-rtx-4090', 199999, 8, 'active', 'NVIDIA', '["https://placehold.co/300x300?text=NVIDIA+RTX+4090"]', '{"cores": 16384, "memory_gb": 24, "boost_clock_ghz": 2.5}', NOW(), NOW()
-- );

-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), '2d21b8db-9fc4-43c5-8acc-e150e85b2252', 'AMD Radeon RX 7900 XTX', 'amd-radeon-rx-7900-xtx', 149999, 12, 'active', 'AMD', '["https://placehold.co/300x300?text=AMD+Radeon+RX+7900+XTX"]', '{"cores": 6144, "memory_gb": 24, "boost_clock_ghz": 2.3}', NOW(), NOW()
-- );

-- -- Motherboard Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), 'b2e74ef7-fb6e-479f-a6ad-8cb84b7d88f9', 'ASUS ROG Strix Z790-E', 'asus-rog-strix-z790-e', 39999, 12, 'active', 'ASUS', '["https://placehold.co/300x300?text=ASUS+ROG+Strix+Z790-E"]', '{"form_factor": "ATX", "memory_slots": 4, "max_memory_gb": 128}', NOW(), NOW()
-- );

-- -- RAM Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), '316cab45-abe7-4370-bc31-28be8cc7b114', 'Corsair Vengeance RGB 32GB', 'corsair-vengeance-rgb-32gb', 14999, 20, 'active', 'Corsair', '["https://placehold.co/300x300?text=Corsair+Vengeance+RGB+32GB"]', '{"capacity_gb": 32, "speed_mhz": 3600, "type": "DDR4"}', NOW(), NOW()
-- );

-- -- Storage Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), 'c3c93459-a7ce-4f62-ac04-483d6b3ed87e', 'Samsung 980 Pro 1TB', 'samsung-980-pro-1tb', 12999, 18, 'active', 'Samsung', '["https://placehold.co/300x300?text=Samsung+980+Pro+1TB"]', '{"capacity_gb": 1000, "interface": "PCIe 4.0", "read_speed_mbps": 7000}', NOW(), NOW()
-- );

-- -- Power Supply Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), 'ee496395-3373-44e2-9063-1d3df4ce06fa', 'Corsair RM850x', 'corsair-rm850x', 17999, 10, 'active', 'Corsair', '["https://placehold.co/300x300?text=Corsair+RM850x"]', '{"wattage": 850, "efficiency": "80+ Gold", "modular": "Fully"}', NOW(), NOW()
-- );

-- -- Case Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), '02f90259-a0e9-4e0a-b2ed-138a6f0cf02e', 'NZXT H5 Flow', 'nzxt-h5-flow', 9999, 14, 'active', 'NZXT', '["https://placehold.co/300x300?text=NZXT+H5+Flow"]', '{"form_factor": "ATX", "material": "Steel/Tempered Glass", "fans_included": 2}', NOW(), NOW()
-- );

-- -- Laptop Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), '8af9d2a7-50bf-41df-913e-3f3423bdfa30', 'MacBook Pro 14-inch', 'macbook-pro-14-inch', 249999, 5, 'active', 'Apple', '["https://placehold.co/300x300?text=MacBook+Pro+14-inch"]', '{"cpu": "M2 Pro", "ram_gb": 16, "storage_gb": 512, "display": "14.2-inch Liquid Retina XDR"}', NOW(), NOW()
-- );

-- -- Accessories Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), 'cfb1f1da-166e-4d4a-a253-f4e1158dc957', 'Logitech MX Master 3S', 'logitech-mx-master-3s', 11999, 22, 'active', 'Logitech', '["https://placehold.co/300x300?text=Logitech+MX+Master+3S"]', '{"type": "Wireless Mouse", "dpi": 8000, "battery_life_days": 70}', NOW(), NOW()
-- );

-- -- +goose StatementEnd

-- -- +goose Down
-- -- +goose StatementBegin
-- DELETE FROM products WHERE slug IN (
--     'intel-core-i9-13900k',
--     'amd-ryzen-9-7950x',
--     'nvidia-rtx-4090',
--     'amd-radeon-rx-7900-xtx',
--     'asus-rog-strix-z790-e',
--     'corsair-vengeance-rgb-32gb',
--     'samsung-980-pro-1tb',
--     'corsair-rm850x',
--     'nzxt-h5-flow',
--     'macbook-pro-14-inch',
--     'logitech-mx-master-3s'
-- );
-- -- +goose StatementEnd


File: migrations/00007_create_refresh_token_table.sql
================================================
-- +goose Up
-- Refresh Tokens Table
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    jti VARCHAR(255) UNIQUE NOT NULL,      -- Unique JWT ID from the token
    user_id UUID NOT NULL,                 -- Reference to the user
    token_hash CHAR(64) NOT NULL,          -- Hash of the *entire signed refresh token string* (SHA-256 produces 64 hex chars)
    expires_at TIMESTAMPTZ NOT NULL,       -- Expiration time
    revoked_at TIMESTAMPTZ DEFAULT NULL,   -- Track revocation (e.g., on logout)
    created_at TIMESTAMPTZ DEFAULT NOW(),  -- When it was issued
    updated_at TIMESTAMPTZ DEFAULT NOW()   -- When it was last updated
);

-- Indexes
CREATE INDEX idx_refresh_tokens_jti ON refresh_tokens(jti);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at);
CREATE INDEX idx_refresh_tokens_active_lookup ON refresh_tokens(jti, expires_at, revoked_at);

ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
-- +goose Down
DROP TABLE IF EXISTS refresh_token;


File: backup.sql
================================================
--
-- PostgreSQL database dump
--

\restrict 30xu0dfJnWvLwv5sq4dh22gjMhem8kZsxgEa4drqM2nqWSkmGX9l6bjmHOJ284M

-- Dumped from database version 17.7
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cart_id uuid,
    product_id uuid,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.cart_items OWNER TO tech_user;

--
-- Name: carts; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.carts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    session_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT user_or_session_id CHECK ((((user_id IS NOT NULL) AND (session_id IS NULL)) OR ((user_id IS NULL) AND (session_id IS NOT NULL))))
);


ALTER TABLE public.carts OWNER TO tech_user;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.categories OWNER TO tech_user;

--
-- Name: category_discounts; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.category_discounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    category_id uuid NOT NULL,
    discount_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.category_discounts OWNER TO tech_user;

--
-- Name: delivery_services; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.delivery_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    base_cost_cents bigint DEFAULT 0 NOT NULL,
    estimated_days integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.delivery_services OWNER TO tech_user;

--
-- Name: TABLE delivery_services; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON TABLE public.delivery_services IS 'Stores available delivery service options.';


--
-- Name: COLUMN delivery_services.name; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON COLUMN public.delivery_services.name IS 'Unique name identifying the delivery service.';


--
-- Name: COLUMN delivery_services.description; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON COLUMN public.delivery_services.description IS 'Optional description of the delivery service.';


--
-- Name: COLUMN delivery_services.base_cost_cents; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON COLUMN public.delivery_services.base_cost_cents IS 'Base cost of the delivery service in cents.';


--
-- Name: COLUMN delivery_services.estimated_days; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON COLUMN public.delivery_services.estimated_days IS 'Estimated number of days for delivery.';


--
-- Name: COLUMN delivery_services.is_active; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON COLUMN public.delivery_services.is_active IS 'Indicates if the delivery service is currently offered.';


--
-- Name: discounts; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.discounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    discount_type character varying(10) NOT NULL,
    discount_value bigint NOT NULL,
    min_order_value_cents bigint DEFAULT 0,
    max_uses integer,
    current_uses integer DEFAULT 0,
    valid_from timestamp with time zone NOT NULL,
    valid_until timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT discounts_discount_type_check CHECK (((discount_type)::text = ANY ((ARRAY['percentage'::character varying, 'fixed'::character varying])::text[]))),
    CONSTRAINT discounts_discount_value_check CHECK ((discount_value >= 0)),
    CONSTRAINT discounts_min_order_value_cents_check CHECK ((min_order_value_cents >= 0))
);


ALTER TABLE public.discounts OWNER TO tech_user;

--
-- Name: goose_db_version; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.goose_db_version (
    id integer NOT NULL,
    version_id bigint NOT NULL,
    is_applied boolean NOT NULL,
    tstamp timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.goose_db_version OWNER TO tech_user;

--
-- Name: goose_db_version_id_seq; Type: SEQUENCE; Schema: public; Owner: tech_user
--

ALTER TABLE public.goose_db_version ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.goose_db_version_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_name character varying(255) NOT NULL,
    price_cents bigint NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    subtotal_cents bigint GENERATED ALWAYS AS ((price_cents * quantity)) STORED,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.order_items OWNER TO tech_user;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_full_name character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    total_amount_cents bigint DEFAULT 0 NOT NULL,
    payment_method character varying(50) DEFAULT 'Cash on Delivery'::character varying NOT NULL,
    province character varying(255) NOT NULL,
    city character varying(255) NOT NULL,
    phone_number_1 character varying(255) NOT NULL,
    phone_number_2 character varying(255),
    notes text,
    delivery_service_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'shipped'::character varying, 'delivered'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.orders OWNER TO tech_user;

--
-- Name: product_discounts; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.product_discounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    discount_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_discounts OWNER TO tech_user;

--
-- Name: products; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    category_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    short_description character varying(255),
    price_cents bigint NOT NULL,
    stock_quantity integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    brand character varying(100) NOT NULL,
    avg_rating numeric(3,2) DEFAULT NULL::numeric,
    num_ratings integer DEFAULT 0,
    image_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    spec_highlights jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT products_price_cents_check CHECK ((price_cents >= 0)),
    CONSTRAINT products_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'discontinued'::character varying])::text[]))),
    CONSTRAINT products_stock_quantity_check CHECK ((stock_quantity >= 0))
);


ALTER TABLE public.products OWNER TO tech_user;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    jti character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    token_hash character(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.refresh_tokens OWNER TO tech_user;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: tech_user
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.refresh_tokens_id_seq OWNER TO tech_user;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tech_user
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    rating integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO tech_user;

--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.schema_migrations (
    version bigint NOT NULL,
    is_applied boolean DEFAULT true NOT NULL,
    applied_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.schema_migrations OWNER TO tech_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash bytea,
    full_name character varying(255),
    is_admin boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO tech_user;

--
-- Name: v_products_with_calculated_discounts; Type: VIEW; Schema: public; Owner: tech_user
--

CREATE VIEW public.v_products_with_calculated_discounts AS
 WITH discount_calculations AS (
         SELECT p.id,
            p.price_cents,
            COALESCE(sum(
                CASE
                    WHEN ((d.discount_type)::text = 'fixed'::text) THEN d.discount_value
                    ELSE (0)::bigint
                END) FILTER (WHERE (d.is_active AND ((now() >= d.valid_from) AND (now() <= d.valid_until)))), (0)::numeric) AS total_fixed_discount_cents,
            COALESCE(exp(sum(
                CASE
                    WHEN (((d.discount_type)::text = 'percentage'::text) AND (d.discount_value < 100)) THEN ln(((1)::numeric - ((d.discount_value)::numeric / 100.0)))
                    ELSE (0)::numeric
                END) FILTER (WHERE (d.is_active AND ((now() >= d.valid_from) AND (now() <= d.valid_until))))), 1.0) AS combined_percentage_factor
           FROM ((public.products p
             LEFT JOIN public.product_discounts pd ON ((p.id = pd.product_id)))
             LEFT JOIN public.discounts d ON ((pd.discount_id = d.id)))
          GROUP BY p.id, p.price_cents
        )
 SELECT id AS product_id,
    total_fixed_discount_cents,
    combined_percentage_factor,
    ((((price_cents)::numeric - total_fixed_discount_cents) * combined_percentage_factor))::bigint AS calculated_discounted_price_cents,
        CASE
            WHEN (((((price_cents)::numeric - total_fixed_discount_cents) * combined_percentage_factor))::bigint < price_cents) THEN true
            ELSE false
        END AS has_active_discount
   FROM discount_calculations dc;


ALTER VIEW public.v_products_with_calculated_discounts OWNER TO tech_user;

--
-- Name: v_products_with_current_discounts; Type: VIEW; Schema: public; Owner: tech_user
--

CREATE VIEW public.v_products_with_current_discounts AS
 SELECT p.id AS product_id,
    p.category_id,
    p.name AS product_name,
    p.slug AS product_slug,
    p.description AS product_description,
    p.short_description AS product_short_description,
    p.price_cents AS original_price_cents,
    p.stock_quantity AS product_stock_quantity,
    p.status AS product_status,
    p.brand AS product_brand,
    p.image_urls AS product_image_urls,
    p.spec_highlights AS product_spec_highlights,
    p.created_at AS product_created_at,
    p.updated_at AS product_updated_at,
    p.deleted_at AS product_deleted_at,
    p.avg_rating,
    p.num_ratings,
        CASE
            WHEN (pd.discount_id IS NOT NULL) THEN
            CASE
                WHEN ((d.discount_type)::text = 'percentage'::text) THEN ((p.price_cents * (100 - d.discount_value)) / 100)
                ELSE (p.price_cents - d.discount_value)
            END
            ELSE p.price_cents
        END AS discounted_price_cents,
    d.code AS active_discount_code,
    d.discount_type AS active_discount_type,
    d.discount_value AS active_discount_value,
    (pd.discount_id IS NOT NULL) AS has_active_discount
   FROM ((public.products p
     LEFT JOIN public.product_discounts pd ON ((p.id = pd.product_id)))
     LEFT JOIN public.discounts d ON (((pd.discount_id = d.id) AND (d.is_active = true) AND ((now() >= d.valid_from) AND (now() <= d.valid_until)))));


ALTER VIEW public.v_products_with_current_discounts OWNER TO tech_user;

--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.cart_items (id, cart_id, product_id, quantity, created_at, updated_at, deleted_at) FROM stdin;
1321e93a-983b-45d2-a7ab-5025c341099d	c25fc9b7-4610-49fa-9753-839f519832ac	45d8fc3a-5aae-42d7-b226-f35e72f0c196	8	2026-02-08 12:12:18.321415+01	2026-02-09 12:02:44.703927+01	\N
87b07e7c-51d4-4090-a418-28581c9427f3	c25fc9b7-4610-49fa-9753-839f519832ac	9ae3aa55-d0cf-4a27-9079-3b78c44cb78d	8	2026-02-09 12:00:45.502642+01	2026-02-09 12:04:24.755234+01	\N
4f60db7a-c3f9-4a62-ac71-a61105d904ee	b1c60cb1-b798-4f85-ab44-a493f617847a	9ae3aa55-d0cf-4a27-9079-3b78c44cb78d	6	2026-02-09 12:06:35.870618+01	2026-02-09 12:06:35.870618+01	\N
4b240d59-4b31-4452-bec6-872c30ce8516	0845cba4-9037-486e-95e8-7488bb0be875	45d8fc3a-5aae-42d7-b226-f35e72f0c196	6	2026-02-09 09:56:16.019216+01	2026-02-09 12:02:31.467589+01	2026-02-09 12:06:35.872165+01
9a47ad24-df8a-4eb5-87bf-241def31a6d7	0845cba4-9037-486e-95e8-7488bb0be875	9ae3aa55-d0cf-4a27-9079-3b78c44cb78d	6	2026-02-09 11:45:59.327222+01	2026-02-09 12:05:18.403387+01	2026-02-09 12:06:35.872165+01
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.carts (id, user_id, session_id, created_at, updated_at, deleted_at) FROM stdin;
c25fc9b7-4610-49fa-9753-839f519832ac	6410aff2-e22f-4b84-b180-ce10cfc3b53f	\N	2026-02-07 15:05:23.344633+01	2026-02-07 15:05:23.344633+01	\N
0845cba4-9037-486e-95e8-7488bb0be875	\N	305904ed-0e22-427b-a01e-5151fe7cc746	2026-02-09 09:54:37.686897+01	2026-02-09 09:54:37.686897+01	\N
b1c60cb1-b798-4f85-ab44-a493f617847a	3f4b1d1a-8eab-4fe3-aa4d-6ffaddec1563	\N	2026-02-09 12:06:35.868226+01	2026-02-09 12:06:35.868226+01	\N
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.categories (id, name, slug, type, parent_id, created_at) FROM stdin;
b96767eb-0f87-4589-b105-fbe49f3a5e70	CPU	cpu	component	\N	2026-02-05 19:04:35.47935+01
697f0b46-e83c-4252-acef-22600245282d	GPU	gpu	component	\N	2026-02-05 19:04:35.47935+01
d4b24d9d-2eb9-4ff3-8d1d-6a887493b58a	Motherboard	motherboard	component	\N	2026-02-05 19:04:35.47935+01
834da835-1d86-4e12-9864-49ca6957b791	RAM	ram	component	\N	2026-02-05 19:04:35.47935+01
04d99e20-13df-4a8d-bb2f-1094a7857fd0	Storage	storage	component	\N	2026-02-05 19:04:35.47935+01
87a92ccc-026f-4a41-8cef-783e175442bc	Power Supply	psu	component	\N	2026-02-05 19:04:35.47935+01
1331d1e6-fcfb-4169-a7c9-c6aa1d00e6aa	Case	case	component	\N	2026-02-05 19:04:35.47935+01
4170de4a-88cd-454c-9f3a-90ee03715640	Laptop	laptop	laptop	\N	2026-02-05 19:04:35.47935+01
a9f76070-02da-4c50-85e1-57895589ce98	Accessories	accessories	accessory	\N	2026-02-05 19:04:35.47935+01
\.


--
-- Data for Name: category_discounts; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.category_discounts (id, category_id, discount_id, created_at) FROM stdin;
\.


--
-- Data for Name: delivery_services; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.delivery_services (id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at) FROM stdin;
2e37f410-4f52-4e62-9042-a685ea120dec	Express Shipping	Fast delivery within 1-2 business days.	1500	2	t	2026-02-08 14:05:17.506308+01	2026-02-08 14:05:17.506308+01
b12a779c-7a43-450c-b809-9544454f236e	Standard Shipping	Regular delivery within 3-5 business days.	800	4	t	2026-02-08 14:05:17.506308+01	2026-02-08 14:05:17.506308+01
bd94a565-4cd4-4430-ba1b-75020b2a18b4	Economy Shipping	Low-cost option with longer delivery time.	400	7	t	2026-02-08 14:05:17.506308+01	2026-02-08 14:05:17.506308+01
0687ef94-8337-4fec-96e0-d1cf15fe52d6	Overnight Delivery	Next-day delivery by 10 AM.	2500	1	t	2026-02-08 14:05:17.506308+01	2026-02-08 14:05:17.506308+01
dea0f103-ca1d-4a27-8cba-7f263a149e33	Freight Service	For heavy or bulk items.	5000	5	t	2026-02-08 14:05:17.506308+01	2026-02-08 14:05:17.506308+01
\.


--
-- Data for Name: discounts; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.discounts (id, code, description, discount_type, discount_value, min_order_value_cents, max_uses, current_uses, valid_from, valid_until, is_active, created_at, updated_at) FROM stdin;
3f643242-3f95-47ea-8d25-9d3ec4a2ec23	EARLY_BIRD_10	\N	percentage	10	0	\N	0	2026-02-09 12:20:37.34722+01	2026-02-10 12:20:37.34722+01	t	2026-02-09 12:20:37.34722+01	2026-02-09 12:20:37.34722+01
0554d9b8-af10-4933-b6dd-44a809a79ecb	FLASH_SALE_5USD	\N	fixed	500	0	\N	0	2026-02-09 12:20:37.34722+01	2026-02-10 12:20:37.34722+01	t	2026-02-09 12:20:37.34722+01	2026-02-09 12:20:37.34722+01
a34ef07f-5897-4970-89f8-9e48c12fd2bb	PROMO_20PCNT	\N	percentage	20	0	\N	0	2026-02-09 12:20:37.34722+01	2026-02-10 12:20:37.34722+01	t	2026-02-09 12:20:37.34722+01	2026-02-09 12:20:37.34722+01
\.


--
-- Data for Name: goose_db_version; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.goose_db_version (id, version_id, is_applied, tstamp) FROM stdin;
1	0	t	2026-02-05 19:04:35.466164
2	1	t	2026-02-05 19:04:35.472436
3	2	t	2026-02-05 19:04:35.47616
4	3	t	2026-02-05 19:04:35.47935
5	4	t	2026-02-05 19:04:35.487892
6	5	t	2026-02-05 19:04:35.495606
7	6	t	2026-02-05 19:04:35.500223
8	7	t	2026-02-05 19:04:35.507203
9	8	t	2026-02-05 19:04:35.513908
10	9	t	2026-02-05 19:04:35.515078
11	10	t	2026-02-05 19:04:35.523237
15	11	t	2026-02-08 11:54:34.437912
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.order_items (id, order_id, product_id, product_name, price_cents, quantity, created_at, updated_at) FROM stdin;
195bf34a-5d57-404c-831c-e4641ca27d2a	a31b1fcc-3347-414e-893c-62ffe8dcabb3	45d8fc3a-5aae-42d7-b226-f35e72f0c196	laptop without slug	99999	2	2026-02-08 14:05:52.707821+01	2026-02-08 14:05:52.707821+01
4a07203c-a3dc-4c18-b0fc-c460913d06fa	7c516487-fe7e-4954-b781-c1d40d88243d	45d8fc3a-5aae-42d7-b226-f35e72f0c196	laptop without slug	99999	2	2026-02-08 14:15:54.680265+01	2026-02-08 14:15:54.680265+01
66042156-7142-4012-8d92-f77ec06cc96e	ae08f226-accc-4f9e-b156-ed82fd27890d	45d8fc3a-5aae-42d7-b226-f35e72f0c196	laptop without slug	99999	2	2026-02-08 14:29:47.660541+01	2026-02-08 14:29:47.660541+01
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.orders (id, user_id, user_full_name, status, total_amount_cents, payment_method, province, city, phone_number_1, phone_number_2, notes, delivery_service_id, created_at, updated_at, completed_at, cancelled_at) FROM stdin;
a31b1fcc-3347-414e-893c-62ffe8dcabb3	6410aff2-e22f-4b84-b180-ce10cfc3b53f	John Doe	pending	201498	Cash on Delivery	Luzon	Manila	1234567890	\N	Please deliver after 5 PM.	2e37f410-4f52-4e62-9042-a685ea120dec	2026-02-08 14:05:52.707821+01	2026-02-08 14:05:52.707821+01	\N	\N
7c516487-fe7e-4954-b781-c1d40d88243d	6410aff2-e22f-4b84-b180-ce10cfc3b53f	John Doe	pending	201498	Cash on Delivery	Luzon	Manila	1234567890	\N	Please deliver after 5 PM.	2e37f410-4f52-4e62-9042-a685ea120dec	2026-02-08 14:15:54.680265+01	2026-02-08 14:15:54.680265+01	\N	\N
ae08f226-accc-4f9e-b156-ed82fd27890d	6410aff2-e22f-4b84-b180-ce10cfc3b53f	John Doe	pending	201498	Cash on Delivery	Luzon	Manila	1234567890	\N	Please deliver after 5 PM.	2e37f410-4f52-4e62-9042-a685ea120dec	2026-02-08 14:29:47.660541+01	2026-02-08 14:29:47.660541+01	\N	\N
\.


--
-- Data for Name: product_discounts; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.product_discounts (id, product_id, discount_id, created_at) FROM stdin;
8b932145-d1fc-42cc-bdcc-7674710d4794	6f6cff3c-6dc4-4f3b-bec6-b773b97af6b1	3f643242-3f95-47ea-8d25-9d3ec4a2ec23	2026-02-09 12:21:09.650294+01
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.products (id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, avg_rating, num_ratings, image_urls, spec_highlights, created_at, updated_at, deleted_at) FROM stdin;
9f7904e8-492a-44b6-8e5e-925e28f156ab	b96767eb-0f87-4589-b105-fbe49f3a5e70	AMD Ryzen 9 7950X	amd-ryzen-9-7950x	\N	\N	69999	20	active	AMD	\N	0	["https://placehold.co/300x300?text=AMD+Ryzen+9+7950X"]	{"cores": 16, "base_clock_ghz": 4.5, "boost_clock_ghz": 5.7}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
9ae3aa55-d0cf-4a27-9079-3b78c44cb78d	697f0b46-e83c-4252-acef-22600245282d	NVIDIA RTX 4090	nvidia-rtx-4090	\N	\N	199999	8	active	NVIDIA	\N	0	["https://placehold.co/300x300?text=NVIDIA+RTX+4090"]	{"cores": 16384, "memory_gb": 24, "boost_clock_ghz": 2.5}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
34136c26-fcdb-4c79-bf77-d4b21fcb0333	d4b24d9d-2eb9-4ff3-8d1d-6a887493b58a	ASUS ROG Strix Z790-E	asus-rog-strix-z790-e	\N	\N	39999	12	active	ASUS	\N	0	["https://placehold.co/300x300?text=ASUS+ROG+Strix+Z790-E"]	{"form_factor": "ATX", "memory_slots": 4, "max_memory_gb": 128}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
9209ce07-f887-4cf5-b662-a35e77da88de	834da835-1d86-4e12-9864-49ca6957b791	Corsair Vengeance RGB 32GB	corsair-vengeance-rgb-32gb	\N	\N	14999	20	active	Corsair	\N	0	["https://placehold.co/300x300?text=Corsair+Vengeance+RGB+32GB"]	{"type": "DDR4", "speed_mhz": 3600, "capacity_gb": 32}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
5ebd3980-a02d-4949-8457-7174e1932f4b	04d99e20-13df-4a8d-bb2f-1094a7857fd0	Samsung 980 Pro 1TB	samsung-980-pro-1tb	\N	\N	12999	18	active	Samsung	\N	0	["https://placehold.co/300x300?text=Samsung+980+Pro+1TB"]	{"interface": "PCIe 4.0", "capacity_gb": 1000, "read_speed_mbps": 7000}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
35651ddd-4be2-4611-aeda-897c556e6675	87a92ccc-026f-4a41-8cef-783e175442bc	Corsair RM850x	corsair-rm850x	\N	\N	17999	10	active	Corsair	\N	0	["https://placehold.co/300x300?text=Corsair+RM850x"]	{"modular": "Fully", "wattage": 850, "efficiency": "80+ Gold"}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
f102008d-b368-470c-8789-945115b5a67d	1331d1e6-fcfb-4169-a7c9-c6aa1d00e6aa	NZXT H5 Flow	nzxt-h5-flow	\N	\N	9999	14	active	NZXT	\N	0	["https://placehold.co/300x300?text=NZXT+H5+Flow"]	{"material": "Steel/Tempered Glass", "form_factor": "ATX", "fans_included": 2}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
8d9aee78-06b0-458a-833a-2953fd80262e	4170de4a-88cd-454c-9f3a-90ee03715640	MacBook Pro 14-inch	macbook-pro-14-inch	\N	\N	249999	5	active	Apple	\N	0	["https://placehold.co/300x300?text=MacBook+Pro+14-inch"]	{"cpu": "M2 Pro", "ram_gb": 16, "display": "14.2-inch Liquid Retina XDR", "storage_gb": 512}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
aa882d7d-1b43-4d94-a2aa-3916eec70540	a9f76070-02da-4c50-85e1-57895589ce98	Logitech MX Master 3S	logitech-mx-master-3s	\N	\N	11999	22	active	Logitech	\N	0	["https://placehold.co/300x300?text=Logitech+MX+Master+3S"]	{"dpi": 8000, "type": "Wireless Mouse", "battery_life_days": 70}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
1b1c976e-a0a6-4556-990d-8e69c0c30a7f	b96767eb-0f87-4589-b105-fbe49f3a5e70	Intel Core i9-13900K	intel-core-i9-13900k	\N	\N	79999	15	active	Intel	5.00	1	["https://placehold.co/300x300?text=Intel+Core+i9-13900K"]	{"cores": 24, "base_clock_ghz": 3.0, "boost_clock_ghz": 5.8}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
70c42277-3ce1-4ba8-b4dc-59198a474f87	b96767eb-0f87-4589-b105-fbe49f3a5e70	laptop without slug	laptop-without-slug	\N	\N	99999	25	active	AMD	\N	0	["https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"]	{"cores": 16, "base_clock_ghz": 4}	2026-02-07 12:21:08.954886+01	2026-02-07 12:21:08.954886+01	\N
45d8fc3a-5aae-42d7-b226-f35e72f0c196	b96767eb-0f87-4589-b105-fbe49f3a5e70	laptop without slug	laptop-without-slug-1	\N	\N	99999	25	active	AMD	\N	0	["https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"]	{"cores": 16, "base_clock_ghz": 4}	2026-02-07 12:21:23.372657+01	2026-02-07 12:21:23.372657+01	\N
7cfa100b-898c-4a17-8bb5-ffdc2f951728	b96767eb-0f87-4589-b105-fbe49f3a5e70	Updated Multipart Product image	updated-multipart-product-image	A product created via multipart with an image4.	\N	12345	5	active	TestBrand2	\N	0	["/uploads/3ed7b91b-69b6-46dc-b734-bb01d0e5fee8.png"]	{}	2026-02-07 13:05:56.472018+01	2026-02-07 13:12:18.248475+01	2026-02-07 13:13:15.022636+01
6f6cff3c-6dc4-4f3b-bec6-b773b97af6b1	697f0b46-e83c-4252-acef-22600245282d	AMD Radeon RX 7900 XTX	amd-radeon-rx-7900-xtx	\N	\N	149999	12	active	AMD	5.00	1	["https://placehold.co/300x300?text=AMD+Radeon+RX+7900+XTX"]	{"cores": 6144, "memory_gb": 24, "boost_clock_ghz": 2.3}	2026-02-05 20:59:14.573901+01	2026-02-07 14:17:19.827946+01	\N
78897acb-bea7-4a35-b8a8-ed49bcf94b81	697f0b46-e83c-4252-acef-22600245282d	AMD Ryzen 9 7900X	amd-ryzen-9-7900x	High-performance desktop processor with 12 cores and 24 threads, ideal for gaming and content creation.	12-core, 24-thread desktop CPU	49999	50	active	AMD	\N	0	["https://example.com/images/ryzen-9-7900x.jpg"]	{"cores": 12, "socket": "AM5", "threads": 24, "tdp_watts": 170, "process_nm": 5, "l3_cache_mb": 64, "base_clock_ghz": 4.7, "boost_clock_ghz": 5.6}	2026-02-09 16:21:17.620806+01	2026-02-09 16:21:17.620806+01	\N
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.refresh_tokens (id, jti, user_id, token_hash, expires_at, revoked_at, created_at, updated_at) FROM stdin;
1	f8e1a960-29e8-46bd-bd11-7b8d1d9e5be3	6410aff2-e22f-4b84-b180-ce10cfc3b53f	697e139dcb3f7e2b2752996d7c58968ea98a430d4fc44228b6d21601273a3daf	2026-02-12 20:58:42.973653+01	2026-02-06 16:36:28.807619+01	2026-02-05 20:58:42.973898+01	2026-02-06 16:36:28.807619+01
2	4113c6ae-5564-4420-95d6-366f7c36272b	6410aff2-e22f-4b84-b180-ce10cfc3b53f	01a60c6bf87c6a431b5bac5ba0931528f6c1c64664bc3c5cb8abf5de350df0d5	2026-02-13 16:36:28.812068+01	2026-02-06 16:54:15.447295+01	2026-02-06 16:36:28.812941+01	2026-02-06 16:54:15.447295+01
3	6243a16d-0fe2-4438-b8d0-c591af1a88c0	6410aff2-e22f-4b84-b180-ce10cfc3b53f	e797179e1e11e6d477ccf7f21193bfe89281757a6683f81e9ac32de987558c09	2026-02-13 16:54:15.448754+01	2026-02-06 17:36:52.735463+01	2026-02-06 16:54:15.449109+01	2026-02-06 17:36:52.735463+01
4	ca99242e-cc0c-46cf-8514-dfbe0f478f1e	6410aff2-e22f-4b84-b180-ce10cfc3b53f	7d996ee86e90a8c10ace255f1b9dc37f77160c8ab0c105eb7a9650a247a3502c	2026-02-13 17:36:52.737079+01	2026-02-06 17:47:36.557984+01	2026-02-06 17:36:52.737651+01	2026-02-06 17:47:36.557984+01
5	e58feeb6-0532-4053-9402-aec684eb35d6	6410aff2-e22f-4b84-b180-ce10cfc3b53f	42717aa0e51f6993091f9b66cbd60814a54c55e11550790d31cbf8c0e249a40c	2026-02-13 17:47:36.559459+01	2026-02-07 12:16:47.070776+01	2026-02-06 17:47:36.559743+01	2026-02-07 12:16:47.070776+01
6	1de25da0-049a-4df7-96fe-e9e2412c7008	6410aff2-e22f-4b84-b180-ce10cfc3b53f	dc4fa0dc79812b30e29ea4f99c42035c059e06695f2f9ad41b146084cc774dd5	2026-02-14 12:16:47.075658+01	2026-02-07 12:19:58.329645+01	2026-02-07 12:16:47.076197+01	2026-02-07 12:19:58.329645+01
7	d099a93b-787e-420f-9bc2-1d8a4db7ea65	6410aff2-e22f-4b84-b180-ce10cfc3b53f	c6eeb3539cc3a939fac214061e7929eeec863579b3a9aa7969b4aad46ceacf2e	2026-02-14 12:19:58.331364+01	2026-02-07 13:01:55.340286+01	2026-02-07 12:19:58.331584+01	2026-02-07 13:01:55.340286+01
8	0b28e11b-81be-4d97-b5e1-5cc69cb4f41c	6410aff2-e22f-4b84-b180-ce10cfc3b53f	e6854c18c20e8e6303df2a8571af7f5e2592185daab841be7769fa4a9f3a0fa2	2026-02-14 13:01:55.342621+01	2026-02-07 14:11:27.496727+01	2026-02-07 13:01:55.343158+01	2026-02-07 14:11:27.496727+01
9	baed54e1-734e-4201-ab33-e7b4e17b9900	6410aff2-e22f-4b84-b180-ce10cfc3b53f	d34a51ebe82a9262c5e4e880b9276454ff9d0bfb486eb2dfe697b49cf70c0ba1	2026-02-14 14:11:27.498464+01	2026-02-07 14:32:11.360373+01	2026-02-07 14:11:27.499062+01	2026-02-07 14:32:11.360373+01
10	e70bbeec-b3bc-4149-ad97-0c774382b805	6410aff2-e22f-4b84-b180-ce10cfc3b53f	1916b927b7e0ef122129c22e72c2708c04556e4343e7c47a7ca0e58b7f014b2e	2026-02-14 14:32:11.362241+01	2026-02-07 15:05:08.604023+01	2026-02-07 14:32:11.362751+01	2026-02-07 15:05:08.604023+01
11	05537d01-8a3a-4e50-8358-4dd211c2b553	6410aff2-e22f-4b84-b180-ce10cfc3b53f	3c51682bb4c14db4a3ba55f7d0ff01b487f0c57913f61610a1357aac797e4f00	2026-02-14 15:05:08.605718+01	2026-02-07 15:34:55.052198+01	2026-02-07 15:05:08.606149+01	2026-02-07 15:34:55.052198+01
12	0a97c12c-90d4-41ed-9400-356ead14683b	6410aff2-e22f-4b84-b180-ce10cfc3b53f	b20c5993bfc67c39a2f979dcba4ac8a91e11963c70f0888201ac86693fb16dbf	2026-02-14 15:34:55.054108+01	2026-02-08 08:26:21.0366+01	2026-02-07 15:34:55.054496+01	2026-02-08 08:26:21.0366+01
13	9a5d3d6d-d6d6-4aa1-af21-ef195d14f27b	6410aff2-e22f-4b84-b180-ce10cfc3b53f	04b6761f1f95ad0ec81cf2f7198d548c14aee4031c0202dcb65c148fe69b9067	2026-02-15 08:26:21.041286+01	2026-02-08 12:10:28.774698+01	2026-02-08 08:26:21.042044+01	2026-02-08 12:10:28.774698+01
14	9a522d82-ce64-46be-83d2-487789af9b3c	6410aff2-e22f-4b84-b180-ce10cfc3b53f	8a14036816c209a2765d8b88be0473567a0aab1ce62265c175fcb690eb079e46	2026-02-15 12:10:28.776666+01	2026-02-08 13:06:04.331489+01	2026-02-08 12:10:28.77727+01	2026-02-08 13:06:04.331489+01
15	7d71a56b-3ce3-413a-bdba-278dcb34d4df	6410aff2-e22f-4b84-b180-ce10cfc3b53f	ded1341b34d1b81481b203739e7b5ac2146fde65214126769fb6133806ceaab3	2026-02-15 13:06:04.333266+01	2026-02-08 13:26:12.579152+01	2026-02-08 13:06:04.333909+01	2026-02-08 13:26:12.579152+01
16	e4a2c5ca-e70c-49c6-8bad-b8689b42e460	6410aff2-e22f-4b84-b180-ce10cfc3b53f	af423564e7a906898044ae1f868bf2c21044f53ba301dafb9bad8f5018ec8489	2026-02-15 13:26:12.580774+01	2026-02-08 14:01:53.867832+01	2026-02-08 13:26:12.581235+01	2026-02-08 14:01:53.867832+01
17	a69afce5-03ab-45ea-8412-f8e5ca44cfcd	6410aff2-e22f-4b84-b180-ce10cfc3b53f	3ba5b7a9416d281d58f30dd2857cad3aa1f296e5303c9993ca3c07dc86887015	2026-02-15 14:01:53.869535+01	2026-02-08 14:25:15.444278+01	2026-02-08 14:01:53.870218+01	2026-02-08 14:25:15.444278+01
18	605ebf0c-206a-4761-b8ff-cff1e274d17d	6410aff2-e22f-4b84-b180-ce10cfc3b53f	9c46f1531858e463bf77816feceddb9f05c83ecdb2b411f3247f2a2cc80d0b35	2026-02-15 14:25:15.445836+01	2026-02-09 09:56:40.0367+01	2026-02-08 14:25:15.446245+01	2026-02-09 09:56:40.0367+01
19	600c8684-3286-40bb-b713-b775104e930b	6410aff2-e22f-4b84-b180-ce10cfc3b53f	299da0cda886ca9685c556431eb557c00846dfe22a015feade03f96c49ff3400	2026-02-16 09:56:40.040941+01	2026-02-09 11:48:48.120175+01	2026-02-09 09:56:40.041676+01	2026-02-09 11:48:48.120175+01
20	642961de-27d0-4fef-b68e-b167ea03b38d	6410aff2-e22f-4b84-b180-ce10cfc3b53f	60e02ee9e70c2a8820bba4e57c7543f7b02d634a0f7c1b57572ea7e27d8b5782	2026-02-16 11:48:48.122148+01	2026-02-09 11:51:43.773162+01	2026-02-09 11:48:48.122822+01	2026-02-09 11:51:43.773162+01
21	9bdd1fa3-a0c8-4108-a2c9-df96b224d8c6	6410aff2-e22f-4b84-b180-ce10cfc3b53f	ac7b70d857ce94730cca9d8fdd2d14861777db547f9d8f3ff65bff41411fadaa	2026-02-16 11:51:43.774854+01	2026-02-09 12:00:45.49799+01	2026-02-09 11:51:43.775245+01	2026-02-09 12:00:45.49799+01
22	18fff26f-5737-478d-9f0a-867a4ca778f0	6410aff2-e22f-4b84-b180-ce10cfc3b53f	82036b6a8d47d2af90a74052a514c9ed6a99b3cf9f0ede7ebae3da25aef76b53	2026-02-16 12:00:45.499765+01	2026-02-09 12:02:44.699559+01	2026-02-09 12:00:45.500241+01	2026-02-09 12:02:44.699559+01
23	4145359c-1e03-40e6-9f09-24e1017225ed	6410aff2-e22f-4b84-b180-ce10cfc3b53f	64cd6e1aa09a716c78ad878064fd01a1929886775a46e9d5e49e4b83a80f1e1a	2026-02-16 12:02:44.701397+01	2026-02-09 12:04:24.750484+01	2026-02-09 12:02:44.701614+01	2026-02-09 12:04:24.750484+01
24	f30f69c2-d360-42f7-9804-8679fecb7b73	6410aff2-e22f-4b84-b180-ce10cfc3b53f	6965c4b9ae4a7fa7f7d5b5b010a087a3cb2cf29cf4008e811c1939a657702c5c	2026-02-16 12:04:24.753622+01	\N	2026-02-09 12:04:24.753743+01	2026-02-09 12:04:24.753743+01
25	46ae5ad7-2f95-4d02-beb3-08c9416e1230	799afb24-9daa-42e8-a0f0-6224e0849969	e10796a2bcdcc5a9f1d96ba24d1b9b3dca416f2c44430ab35ce9786b9adb33eb	2026-02-16 12:06:01.569355+01	\N	2026-02-09 12:06:01.569502+01	2026-02-09 12:06:01.569502+01
26	5a1cbc05-c2d2-4363-a7b8-f4449ae2b912	3f4b1d1a-8eab-4fe3-aa4d-6ffaddec1563	73d6ed8782c8d0a991a32e49ba4021b663202ae4c0fad4ac2d5e9bb4346fafef	2026-02-16 12:06:35.866212+01	\N	2026-02-09 12:06:35.866321+01	2026-02-09 12:06:35.866321+01
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.reviews (id, user_id, product_id, rating, created_at, updated_at, deleted_at) FROM stdin;
302b2084-5447-47e5-9ff0-51893df4dae7	6410aff2-e22f-4b84-b180-ce10cfc3b53f	1b1c976e-a0a6-4556-990d-8e69c0c30a7f	5	2026-02-05 21:00:54.991681+01	2026-02-05 21:00:54.991681+01	\N
5b0fdf94-baf1-4a22-b35d-05846f1a9bf8	6410aff2-e22f-4b84-b180-ce10cfc3b53f	6f6cff3c-6dc4-4f3b-bec6-b773b97af6b1	5	2026-02-07 14:17:19.827946+01	2026-02-07 14:17:19.827946+01	\N
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.schema_migrations (version, is_applied, applied_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.users (id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at) FROM stdin;
6410aff2-e22f-4b84-b180-ce10cfc3b53f	dztech@example.com	\\x2432612431302445487932795052575461317748695a63514355523165416e4c5a714b7437375642694775307834446c5252565a6c5733656b2e3832	Test User	t	2026-02-05 20:58:42.969226+01	2026-02-05 20:58:42.969226+01	\N
799afb24-9daa-42e8-a0f0-6224e0849969	cartdzh@example.com	\\x2432612431302473307a725a6b6f583133363541505645664d6a6a56753169692e4e374459706c756c4a6a42495076633549444264702f6d61633836	Test User cart sync	f	2026-02-09 12:06:01.564392+01	2026-02-09 12:06:01.564392+01	\N
3f4b1d1a-8eab-4fe3-aa4d-6ffaddec1563	dzcarth@example.com	\\x24326124313024594b38754d4b704666686b2e49684d4c53594d37432e646142703244332e5a32644d5662677448437a3078636d4b346b6b526d796d	Test User cart sync	f	2026-02-09 12:06:35.864294+01	2026-02-09 12:06:35.864294+01	\N
\.


--
-- Name: goose_db_version_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tech_user
--

SELECT pg_catalog.setval('public.goose_db_version_id_seq', 15, true);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tech_user
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 26, true);


--
-- Name: cart_items cart_items_cart_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_product_id_key UNIQUE (cart_id, product_id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: carts carts_session_id_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_session_id_key UNIQUE (session_id);


--
-- Name: carts carts_user_id_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_key UNIQUE (user_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: category_discounts category_discounts_category_id_discount_id_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.category_discounts
    ADD CONSTRAINT category_discounts_category_id_discount_id_key UNIQUE (category_id, discount_id);


--
-- Name: category_discounts category_discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.category_discounts
    ADD CONSTRAINT category_discounts_pkey PRIMARY KEY (id);


--
-- Name: delivery_services delivery_services_name_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.delivery_services
    ADD CONSTRAINT delivery_services_name_key UNIQUE (name);


--
-- Name: delivery_services delivery_services_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.delivery_services
    ADD CONSTRAINT delivery_services_pkey PRIMARY KEY (id);


--
-- Name: discounts discounts_code_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_code_key UNIQUE (code);


--
-- Name: discounts discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_pkey PRIMARY KEY (id);


--
-- Name: goose_db_version goose_db_version_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.goose_db_version
    ADD CONSTRAINT goose_db_version_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_discounts product_discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.product_discounts
    ADD CONSTRAINT product_discounts_pkey PRIMARY KEY (id);


--
-- Name: product_discounts product_discounts_product_id_discount_id_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.product_discounts
    ADD CONSTRAINT product_discounts_product_id_discount_id_key UNIQUE (product_id, discount_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: refresh_tokens refresh_tokens_jti_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_jti_key UNIQUE (jti);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_cart_items_cart_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_cart_items_cart_id ON public.cart_items USING btree (cart_id);


--
-- Name: idx_cart_items_product_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_cart_items_product_id ON public.cart_items USING btree (product_id);


--
-- Name: idx_carts_session_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_carts_session_id ON public.carts USING btree (session_id);


--
-- Name: idx_carts_user_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_carts_user_id ON public.carts USING btree (user_id);


--
-- Name: idx_categories_parent; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_categories_parent ON public.categories USING btree (parent_id);


--
-- Name: idx_categories_slug; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);


--
-- Name: idx_category_discounts_category_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_category_discounts_category_id ON public.category_discounts USING btree (category_id);


--
-- Name: idx_category_discounts_discount_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_category_discounts_discount_id ON public.category_discounts USING btree (discount_id);


--
-- Name: idx_delivery_services_is_active; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_delivery_services_is_active ON public.delivery_services USING btree (is_active);


--
-- Name: idx_discounts_active_period; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_discounts_active_period ON public.discounts USING btree (is_active, valid_from, valid_until);


--
-- Name: idx_discounts_code; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_discounts_code ON public.discounts USING btree (code);


--
-- Name: idx_discounts_is_active; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_discounts_is_active ON public.discounts USING btree (is_active);


--
-- Name: idx_discounts_valid_from; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_discounts_valid_from ON public.discounts USING btree (valid_from);


--
-- Name: idx_discounts_valid_until; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_discounts_valid_until ON public.discounts USING btree (valid_until);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- Name: idx_orders_delivery_service_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_orders_delivery_service_id ON public.orders USING btree (delivery_service_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_product_discounts_discount_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_product_discounts_discount_id ON public.product_discounts USING btree (discount_id);


--
-- Name: idx_product_discounts_product_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_product_discounts_product_id ON public.product_discounts USING btree (product_id);


--
-- Name: idx_products_active; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_active ON public.products USING btree (id) WHERE (((status)::text = 'active'::text) AND (deleted_at IS NULL));


--
-- Name: idx_products_brand; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_brand ON public.products USING btree (brand);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- Name: idx_products_category_created; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_category_created ON public.products USING btree (category_id, created_at);


--
-- Name: idx_products_price; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_price ON public.products USING btree (price_cents);


--
-- Name: idx_products_search; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_search ON public.products USING gin (to_tsvector('english'::regconfig, (((name)::text || ' '::text) || (COALESCE(short_description, ''::character varying))::text)));


--
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- Name: idx_products_stock; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_stock ON public.products USING btree (stock_quantity);


--
-- Name: idx_refresh_tokens_active_lookup; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_refresh_tokens_active_lookup ON public.refresh_tokens USING btree (jti, expires_at, revoked_at);


--
-- Name: idx_refresh_tokens_expires_at; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_refresh_tokens_expires_at ON public.refresh_tokens USING btree (expires_at);


--
-- Name: idx_refresh_tokens_jti; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_refresh_tokens_jti ON public.refresh_tokens USING btree (jti);


--
-- Name: idx_refresh_tokens_revoked_at; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_refresh_tokens_revoked_at ON public.refresh_tokens USING btree (revoked_at);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_reviews_created_at; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_reviews_created_at ON public.reviews USING btree (created_at);


--
-- Name: idx_reviews_product_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_reviews_product_id ON public.reviews USING btree (product_id);


--
-- Name: idx_reviews_rating; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_reviews_rating ON public.reviews USING btree (rating);


--
-- Name: idx_reviews_user_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);


--
-- Name: idx_reviews_user_product_unique; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE UNIQUE INDEX idx_reviews_user_product_unique ON public.reviews USING btree (user_id, product_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_users_email ON public.users USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: category_discounts category_discounts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.category_discounts
    ADD CONSTRAINT category_discounts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: category_discounts category_discounts_discount_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.category_discounts
    ADD CONSTRAINT category_discounts_discount_id_fkey FOREIGN KEY (discount_id) REFERENCES public.discounts(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens fk_refresh_tokens_user; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: orders orders_delivery_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_delivery_service_id_fkey FOREIGN KEY (delivery_service_id) REFERENCES public.delivery_services(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: product_discounts product_discounts_discount_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.product_discounts
    ADD CONSTRAINT product_discounts_discount_id_fkey FOREIGN KEY (discount_id) REFERENCES public.discounts(id) ON DELETE CASCADE;


--
-- Name: product_discounts product_discounts_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.product_discounts
    ADD CONSTRAINT product_discounts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 30xu0dfJnWvLwv5sq4dh22gjMhem8kZsxgEa4drqM2nqWSkmGX9l6bjmHOJ284M



File: Readme.md
================================================
# MVP Plan for Tech Store (PC Parts, Laptops, and Custom Builds)

---

## **Core User Stories**

### **Customer:**

- [x] As a customer, I want to **browse products** (PC parts, laptops) so I can
      see what’s available.
- [x] As a customer, I want to **search for specific products** (e.g., "RTX
      4090," "Ryzen 9 7950X") so I can find what I need quickly.
- [x] As a customer, I want to **view detailed product specs** (e.g., clock
      speed, compatibility, benchmarks) so I can make an informed decision.
- [ ] As a customer, I want to **add products to my cart** so I can purchase
      them later.
- [x] As a customer, I want to **add items to my cart while offline** and have
      them sync once I log in.
- [ ] As a customer, I want to **save products to a wishlist** so I can consider
      them for future purchases.
- [ ] As a customer, I want to **read and leave product reviews** to gauge
      quality and share my experience.
- [ ] As a customer, I want to **create custom PC builds** by selecting
      compatible components (CPU, GPU, motherboard, etc.).
- [ ] As a customer, I want to **select a delivery service** so I can choose how
      my products are delivered.
- [x] As a customer, I want to **create an account (optional)** to finalize my
      order and access additional features.
- [ ] As a customer, I want to **view my order history** so I can track
      purchases and reorder if needed.
- [x] As a customer, I want to **confirm my order** so I can complete my
      purchase.

---

### **Admin:**

- [x] As an admin, I want to **add new PC parts and laptops** so customers can
      buy them.
- [x] As an admin, I want to **edit product details** (e.g., specs, pricing,
      stock) so I can keep the information up to date.
- [x] As an admin, I want to **remove products** so I can manage inventory.
- [ ] As an admin, I want to **add and update delivery services** and their
      details.
- [ ] As an admin, I want to **moderate product reviews** to maintain quality
      and relevance.
- [ ] As an admin, I want to **manage custom build compatibility rules** (e.g.,
      CPU socket must match motherboard).

---

## **Key Features for an MVP**

### **Product Discovery**

- [x] **Product Listing Page**: Browse and search for PC parts and laptops.
- [x] **Advanced Search Filters**: Filter by category, brand, price range, specs
      (e.g., "16GB RAM," "1TB SSD").

### **Product Details**

- [x] **Detailed Specs**: Full specifications, high-quality images,
      compatibility notes, and customer reviews.

### **Shopping Cart**

- [ ] Add/remove products.
- [ ] View total cost.
- [ ] Offline mode support with sync on login.

### **Wishlist**

- [ ] Save products for later.
- [ ] Share wishlists (e.g., for gift ideas).

### **Product Reviews**

- [ ] Star ratings and written reviews.
- [ ] Admin moderation to prevent spam/abuse.

### **Custom PC Builds**

- [ ] **Component Selector**: Choose CPU, GPU, motherboard, RAM, storage, PSU,
      and case.
- [ ] **Compatibility Check**: Real-time validation (e.g., "This CPU is not
      compatible with the selected motherboard").
- [ ] **Build Summary**: Preview the build, estimated performance, and total
      price.
- [ ] **Save/Share Builds**: Save for later or share with friends for feedback.

### **User Accounts**

- [x] Optional account creation.
- [x] Required for order finalization, wishlist, and order history.

### **Delivery Service Selection**

- [ ] Choose from available delivery options during checkout.
- [ ] Admins can configure services (e.g., standard, express, pickup).

### **Order History**

- [ ] View past orders, reorder, or track deliveries.

### **Admin Panel**

- [x] Add/edit/remove products.
- [ ] Manage delivery services.
- [ ] Moderate reviews.
- [ ] Set compatibility rules for custom builds.

---

## **Single Success Metric**

- **Conversion Rate**: The percentage of visitors who complete a purchase
  (either a product or a custom build).


File: internal/router/router.go
================================================
package router

import (
	"log/slog"
	"net/http"

	"tech-store-backend/db"
	"tech-store-backend/internal/config"
	db_queries "tech-store-backend/internal/db" // SQLC generated code
	"tech-store-backend/internal/handlers"
	"tech-store-backend/internal/middleware"
	"tech-store-backend/internal/services"
	"tech-store-backend/internal/storage"
	"github.com/go-chi/chi/v5"
	"github.com/redis/go-redis/v9"
)

func New(cfg *config.Config, redisClient *redis.Client) http.Handler {

	r := chi.NewRouter()

	// Apply middleware
	middleware.ApplyMiddleware(r)

	// Health check endpoint
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})
	// Get the database pool from the db package
	pool := db.GetPool()
	if pool == nil {
		slog.Error("Database pool is not initialized")
		panic("database pool is not initialized")
	}

	// --- Initialize Storage Client ---
	localStoragePath := "./uploads"
	localPublicPath := "/uploads"
	allowedTypes := []string{"image/jpeg", "image/png", "image/gif", "image/webp"}
	maxFileSize := int64(10 * 1024 * 1024) // 10MB

	storer := storage.NewLocalStorage(localStoragePath, localPublicPath, allowedTypes, maxFileSize)

	// Initialize database querier
	querier := db_queries.New(pool)

	// Initialize services
	userService := services.NewUserService(querier)
	productService := services.NewProductService(querier, storer, redisClient, slog.Default())
	cartService := services.NewCartService(querier, productService, slog.Default())
	orderService := services.NewOrderService(querier, pool, cartService, productService, slog.Default())
	authService := services.NewAuthService(querier, userService, cartService, cfg.JWTSecret, slog.Default())
	deliveryService := services.NewDeliveryServiceService(querier, slog.Default())
	adminUserService := services.NewAdminUserService(querier, slog.Default())
	reviewService := services.NewReviewService(querier, pool, slog.Default())
	discountService := services.NewDiscountService(querier, redisClient, slog.Default())

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	productHandler := handlers.NewProductHandler(productService)
	adminProductHandler := handlers.NewProductHandler(productService)
	adminOrderHandler := handlers.NewOrderHandler(orderService, slog.Default())
	adminDeliveryHandler := handlers.NewDeliveryServiceHandler(deliveryService, slog.Default())
	cartHandler := handlers.NewCartHandler(cartService, productService, slog.Default())
	orderHandler := handlers.NewOrderHandler(orderService, slog.Default())
	deliveryOptionsHandler := handlers.NewDeliveryOptionsHandler(deliveryService, slog.Default())
	adminUserHandler := handlers.NewAdminUserHandler(adminUserService, slog.Default())
	reviewHandler := handlers.NewReviewHandler(reviewService, slog.Default())
	discountHandler := handlers.NewDiscountHandler(discountService, slog.Default())

	// Create sub-routers
	authRouter := chi.NewRouter()
	authHandler.RegisterRoutes(authRouter)

	productRouter := chi.NewRouter()
	productRouter.Get("/", productHandler.ListAllProducts)
	productRouter.Get("/{id}", productHandler.GetProduct)
	productRouter.Get("/search", productHandler.SearchProducts)
	productRouter.Get("/categories", productHandler.ListCategories)
	productRouter.Get("/categories/{id}", productHandler.GetCategory)

	adminRouter := chi.NewRouter()
	adminRouter.Use(middleware.JWTMiddleware(cfg))
	adminRouter.Use(middleware.RequireAdmin)
	adminRouter.Route("/products", func(r chi.Router) {
		adminProductHandler.RegisterRoutes(r)
	})
	adminRouter.Route("/orders", func(r chi.Router) {
		adminOrderHandler.RegisterAdminRoutes(r)
	})
	adminRouter.Route("/delivery-services", func(r chi.Router) {
		adminDeliveryHandler.RegisterRoutes(r)
	})
	adminRouter.Route("/users", func(r chi.Router) {
		adminUserHandler.RegisterRoutes(r)
	})
	adminRouter.Route("/discounts", func(r chi.Router) {
		discountHandler.RegisterRoutes(r)
	})

	cartRouter := chi.NewRouter()
	cartRouter.Use(middleware.JWTMiddleware(cfg))
	cartHandler.RegisterRoutes(cartRouter)

	orderRouter := chi.NewRouter()
	orderRouter.Use(middleware.JWTMiddleware(cfg))
	orderHandler.RegisterUserRoutes(orderRouter)

	deliveryOptionsRouter := chi.NewRouter()
	deliveryOptionsRouter.Use(middleware.JWTMiddleware(cfg))
	deliveryOptionsHandler.RegisterRoutes(deliveryOptionsRouter)

	reviewRouter := chi.NewRouter()
	reviewRouter.Use(middleware.JWTMiddleware(cfg))
	reviewHandler.RegisterRoutes(reviewRouter)

	// Mount sub-routers
	r.Mount("/api/v1/auth", authRouter)
	r.Mount("/api/v1/products", productRouter)
	r.Mount("/api/v1/admin", adminRouter)
	r.Mount("/api/v1/cart", cartRouter)
	r.Mount("/api/v1/orders", orderRouter)
	r.Mount("/api/v1/delivery-options", deliveryOptionsRouter)
	r.Mount("/api/v1/reviews", reviewRouter)

	slog.Info("Router initialized")
	return r
}


File: internal/db/calculate_discounts.sql.go
================================================
// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.30.0
// source: calculate_discounts.sql

package db

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

const getCartWithItemsAndProductsWithDiscounts = `-- name: GetCartWithItemsAndProductsWithDiscounts :many


SELECT
    c.id AS cart_id,
    c.user_id,
    c.session_id,
    c.created_at,
    c.updated_at,
    -- Cart Items
    ci.id AS item_id,
    ci.cart_id AS item_cart_id,
    ci.product_id AS item_product_id,
    ci.quantity AS item_quantity,
    ci.created_at AS item_created_at,
    ci.updated_at AS item_updated_at,
    -- Product Details (with discount calculation from the view)
    p.id AS product_id,
    p.name AS product_name,
    p.price_cents AS original_price_cents,
    p.stock_quantity AS product_stock_quantity,
    p.image_urls AS product_image_urls,
    p.brand AS product_brand,
    -- Use the pre-calculated discounted price from the view
    COALESCE(vpcd.calculated_discounted_price_cents, p.price_cents, 0)::BIGINT AS final_price_cents, -- This is the price *per unit* after discount
    -- Use the has_active_discount boolean directly from the view
    COALESCE(vpcd.has_active_discount, FALSE) AS has_active_discount,
    -- Include the breakdown fields for potential use in the cart context
 COALESCE(vpcd.total_fixed_discount_cents, 0)::BIGINT AS vpcd_total_fixed_discount_cents, -- Fallback to 0
    COALESCE(vpcd.combined_percentage_factor, 1.0)::FLOAT AS vpcd_combined_percentage_factor -- Fallback to 1.0 (no discount factor)
FROM
    carts c
LEFT JOIN
    cart_items ci ON c.id = ci.cart_id AND ci.deleted_at IS NULL
LEFT JOIN
    products p ON ci.product_id = p.id AND p.deleted_at IS NULL
LEFT JOIN
    v_products_with_calculated_discounts vpcd ON p.id = vpcd.product_id -- Join with the view
WHERE
    c.id = $1 AND c.deleted_at IS NULL
ORDER BY
    ci.created_at ASC
`

type GetCartWithItemsAndProductsWithDiscountsRow struct {
	CartID                       uuid.UUID          `json:"cart_id"`
	UserID                       uuid.UUID          `json:"user_id"`
	SessionID                    *string            `json:"session_id"`
	CreatedAt                    pgtype.Timestamptz `json:"created_at"`
	UpdatedAt                    pgtype.Timestamptz `json:"updated_at"`
	ItemID                       uuid.UUID          `json:"item_id"`
	ItemCartID                   uuid.UUID          `json:"item_cart_id"`
	ItemProductID                uuid.UUID          `json:"item_product_id"`
	ItemQuantity                 *int32             `json:"item_quantity"`
	ItemCreatedAt                pgtype.Timestamptz `json:"item_created_at"`
	ItemUpdatedAt                pgtype.Timestamptz `json:"item_updated_at"`
	ProductID                    uuid.UUID          `json:"product_id"`
	ProductName                  *string            `json:"product_name"`
	OriginalPriceCents           *int64             `json:"original_price_cents"`
	ProductStockQuantity         *int32             `json:"product_stock_quantity"`
	ProductImageUrls             []byte             `json:"product_image_urls"`
	ProductBrand                 *string            `json:"product_brand"`
	FinalPriceCents              int64              `json:"final_price_cents"`
	HasActiveDiscount            bool               `json:"has_active_discount"`
	VpcdTotalFixedDiscountCents  int64              `json:"vpcd_total_fixed_discount_cents"`
	VpcdCombinedPercentageFactor float64            `json:"vpcd_combined_percentage_factor"`
}

// $1 = page_limit, $2 = page_offset
// Assuming this returns one cart object with many items
func (q *Queries) GetCartWithItemsAndProductsWithDiscounts(ctx context.Context, id uuid.UUID) ([]GetCartWithItemsAndProductsWithDiscountsRow, error) {
	rows, err := q.db.Query(ctx, getCartWithItemsAndProductsWithDiscounts, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetCartWithItemsAndProductsWithDiscountsRow
	for rows.Next() {
		var i GetCartWithItemsAndProductsWithDiscountsRow
		if err := rows.Scan(
			&i.CartID,
			&i.UserID,
			&i.SessionID,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.ItemID,
			&i.ItemCartID,
			&i.ItemProductID,
			&i.ItemQuantity,
			&i.ItemCreatedAt,
			&i.ItemUpdatedAt,
			&i.ProductID,
			&i.ProductName,
			&i.OriginalPriceCents,
			&i.ProductStockQuantity,
			&i.ProductImageUrls,
			&i.ProductBrand,
			&i.FinalPriceCents,
			&i.HasActiveDiscount,
			&i.VpcdTotalFixedDiscountCents,
			&i.VpcdCombinedPercentageFactor,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getProductWithDiscountInfo = `-- name: GetProductWithDiscountInfo :one
SELECT
    p.id,
    p.category_id,
    c.name AS category_name,
    p.name,
    p.slug,
    p.description,
    p.short_description,
    p.price_cents AS original_price_cents,
    p.stock_quantity,
    p.status,
    p.brand,
    p.image_urls,
    p.spec_highlights,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    p.avg_rating,
    p.num_ratings,
    vpcd.total_fixed_discount_cents::BIGINT,
    vpcd.combined_percentage_factor::FLOAT,
    COALESCE(vpcd.calculated_discounted_price_cents, p.price_cents) AS discounted_price_cents,
    -- Use the has_active_discount boolean directly from the view
    COALESCE(vpcd.has_active_discount, FALSE) AS has_active_discount
FROM
    products p
INNER JOIN categories c ON p.category_id = c.id -- Join with categories table
LEFT JOIN
    v_products_with_calculated_discounts vpcd ON p.id = vpcd.product_id
WHERE
    p.id = $1 AND p.deleted_at IS NULL
`

type GetProductWithDiscountInfoRow struct {
	ID                           uuid.UUID          `json:"id"`
	CategoryID                   uuid.UUID          `json:"category_id"`
	CategoryName                 string             `json:"category_name"`
	Name                         string             `json:"name"`
	Slug                         string             `json:"slug"`
	Description                  *string            `json:"description"`
	ShortDescription             *string            `json:"short_description"`
	OriginalPriceCents           int64              `json:"original_price_cents"`
	StockQuantity                int32              `json:"stock_quantity"`
	Status                       string             `json:"status"`
	Brand                        string             `json:"brand"`
	ImageUrls                    []byte             `json:"image_urls"`
	SpecHighlights               []byte             `json:"spec_highlights"`
	CreatedAt                    pgtype.Timestamptz `json:"created_at"`
	UpdatedAt                    pgtype.Timestamptz `json:"updated_at"`
	DeletedAt                    pgtype.Timestamptz `json:"deleted_at"`
	AvgRating                    pgtype.Numeric     `json:"avg_rating"`
	NumRatings                   *int32             `json:"num_ratings"`
	VpcdTotalFixedDiscountCents  int64              `json:"vpcd_total_fixed_discount_cents"`
	VpcdCombinedPercentageFactor float64            `json:"vpcd_combined_percentage_factor"`
	DiscountedPriceCents         int64              `json:"discounted_price_cents"`
	HasActiveDiscount            bool               `json:"has_active_discount"`
}

func (q *Queries) GetProductWithDiscountInfo(ctx context.Context, id uuid.UUID) (GetProductWithDiscountInfoRow, error) {
	row := q.db.QueryRow(ctx, getProductWithDiscountInfo, id)
	var i GetProductWithDiscountInfoRow
	err := row.Scan(
		&i.ID,
		&i.CategoryID,
		&i.CategoryName,
		&i.Name,
		&i.Slug,
		&i.Description,
		&i.ShortDescription,
		&i.OriginalPriceCents,
		&i.StockQuantity,
		&i.Status,
		&i.Brand,
		&i.ImageUrls,
		&i.SpecHighlights,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.DeletedAt,
		&i.AvgRating,
		&i.NumRatings,
		&i.VpcdTotalFixedDiscountCents,
		&i.VpcdCombinedPercentageFactor,
		&i.DiscountedPriceCents,
		&i.HasActiveDiscount,
	)
	return i, err
}

const getProductWithDiscountInfoBySlug = `-- name: GetProductWithDiscountInfoBySlug :one

SELECT
    p.id,
    p.category_id,
    c.name AS category_name,
    p.name,
    p.slug,
    p.description,
    p.short_description,
    p.price_cents AS original_price_cents,
    p.stock_quantity,
    p.status,
    p.brand,
    p.image_urls,
    p.spec_highlights,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    p.avg_rating,
    p.num_ratings,
    vpcd.total_fixed_discount_cents::BIGINT,
    vpcd.combined_percentage_factor::FLOAT,
    COALESCE(vpcd.calculated_discounted_price_cents, p.price_cents) AS discounted_price_cents,
    -- Use the has_active_discount boolean directly from the view
    COALESCE(vpcd.has_active_discount, FALSE) AS has_active_discount
FROM
    products p
INNER JOIN categories c ON p.category_id = c.id -- Join with categories table
LEFT JOIN
    v_products_with_calculated_discounts vpcd ON p.id = vpcd.product_id
WHERE
    p.slug = $1 AND p.deleted_at IS NULL
`

type GetProductWithDiscountInfoBySlugRow struct {
	ID                           uuid.UUID          `json:"id"`
	CategoryID                   uuid.UUID          `json:"category_id"`
	CategoryName                 string             `json:"category_name"`
	Name                         string             `json:"name"`
	Slug                         string             `json:"slug"`
	Description                  *string            `json:"description"`
	ShortDescription             *string            `json:"short_description"`
	OriginalPriceCents           int64              `json:"original_price_cents"`
	StockQuantity                int32              `json:"stock_quantity"`
	Status                       string             `json:"status"`
	Brand                        string             `json:"brand"`
	ImageUrls                    []byte             `json:"image_urls"`
	SpecHighlights               []byte             `json:"spec_highlights"`
	CreatedAt                    pgtype.Timestamptz `json:"created_at"`
	UpdatedAt                    pgtype.Timestamptz `json:"updated_at"`
	DeletedAt                    pgtype.Timestamptz `json:"deleted_at"`
	AvgRating                    pgtype.Numeric     `json:"avg_rating"`
	NumRatings                   *int32             `json:"num_ratings"`
	VpcdTotalFixedDiscountCents  int64              `json:"vpcd_total_fixed_discount_cents"`
	VpcdCombinedPercentageFactor float64            `json:"vpcd_combined_percentage_factor"`
	DiscountedPriceCents         int64              `json:"discounted_price_cents"`
	HasActiveDiscount            bool               `json:"has_active_discount"`
}

// Query: GetProductWithDiscountInfoBySlug
// Retrieves a specific product by slug along with its calculated discount information using the pre-calculated view.
func (q *Queries) GetProductWithDiscountInfoBySlug(ctx context.Context, slug string) (GetProductWithDiscountInfoBySlugRow, error) {
	row := q.db.QueryRow(ctx, getProductWithDiscountInfoBySlug, slug)
	var i GetProductWithDiscountInfoBySlugRow
	err := row.Scan(
		&i.ID,
		&i.CategoryID,
		&i.CategoryName,
		&i.Name,
		&i.Slug,
		&i.Description,
		&i.ShortDescription,
		&i.OriginalPriceCents,
		&i.StockQuantity,
		&i.Status,
		&i.Brand,
		&i.ImageUrls,
		&i.SpecHighlights,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.DeletedAt,
		&i.AvgRating,
		&i.NumRatings,
		&i.VpcdTotalFixedDiscountCents,
		&i.VpcdCombinedPercentageFactor,
		&i.DiscountedPriceCents,
		&i.HasActiveDiscount,
	)
	return i, err
}

const getProductsWithDiscountInfo = `-- name: GetProductsWithDiscountInfo :many
SELECT
    p.id,
    p.category_id,
    c.name AS category_name,
    p.name,
    p.slug,
    p.description,
    p.short_description,
    p.price_cents AS original_price_cents,
    p.stock_quantity,
    p.status,
    p.brand,
    p.image_urls,
    p.spec_highlights,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    p.avg_rating,
    p.num_ratings,
    vpcd.total_fixed_discount_cents::BIGINT,
    vpcd.combined_percentage_factor::FLOAT,
    COALESCE(vpcd.calculated_discounted_price_cents, p.price_cents) AS discounted_price_cents,
    -- Use the has_active_discount boolean directly from the view
    COALESCE(vpcd.has_active_discount, FALSE) AS has_active_discount
FROM
    products p
INNER JOIN categories c ON p.category_id = c.id -- Join with categories table
LEFT JOIN
    v_products_with_calculated_discounts vpcd ON p.id = vpcd.product_id
WHERE
    p.deleted_at IS NULL -- Add other filters if needed (e.g., category, price range)
ORDER BY
    p.created_at DESC -- Or other ordering
LIMIT $1 OFFSET $2
`

type GetProductsWithDiscountInfoParams struct {
	Limit  int32 `json:"limit"`
	Offset int32 `json:"offset"`
}

type GetProductsWithDiscountInfoRow struct {
	ID                           uuid.UUID          `json:"id"`
	CategoryID                   uuid.UUID          `json:"category_id"`
	CategoryName                 string             `json:"category_name"`
	Name                         string             `json:"name"`
	Slug                         string             `json:"slug"`
	Description                  *string            `json:"description"`
	ShortDescription             *string            `json:"short_description"`
	OriginalPriceCents           int64              `json:"original_price_cents"`
	StockQuantity                int32              `json:"stock_quantity"`
	Status                       string             `json:"status"`
	Brand                        string             `json:"brand"`
	ImageUrls                    []byte             `json:"image_urls"`
	SpecHighlights               []byte             `json:"spec_highlights"`
	CreatedAt                    pgtype.Timestamptz `json:"created_at"`
	UpdatedAt                    pgtype.Timestamptz `json:"updated_at"`
	DeletedAt                    pgtype.Timestamptz `json:"deleted_at"`
	AvgRating                    pgtype.Numeric     `json:"avg_rating"`
	NumRatings                   *int32             `json:"num_ratings"`
	VpcdTotalFixedDiscountCents  int64              `json:"vpcd_total_fixed_discount_cents"`
	VpcdCombinedPercentageFactor float64            `json:"vpcd_combined_percentage_factor"`
	DiscountedPriceCents         int64              `json:"discounted_price_cents"`
	HasActiveDiscount            bool               `json:"has_active_discount"`
}

func (q *Queries) GetProductsWithDiscountInfo(ctx context.Context, arg GetProductsWithDiscountInfoParams) ([]GetProductsWithDiscountInfoRow, error) {
	rows, err := q.db.Query(ctx, getProductsWithDiscountInfo, arg.Limit, arg.Offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetProductsWithDiscountInfoRow
	for rows.Next() {
		var i GetProductsWithDiscountInfoRow
		if err := rows.Scan(
			&i.ID,
			&i.CategoryID,
			&i.CategoryName,
			&i.Name,
			&i.Slug,
			&i.Description,
			&i.ShortDescription,
			&i.OriginalPriceCents,
			&i.StockQuantity,
			&i.Status,
			&i.Brand,
			&i.ImageUrls,
			&i.SpecHighlights,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.DeletedAt,
			&i.AvgRating,
			&i.NumRatings,
			&i.VpcdTotalFixedDiscountCents,
			&i.VpcdCombinedPercentageFactor,
			&i.DiscountedPriceCents,
			&i.HasActiveDiscount,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}


File: internal/db/refresh_token.sql.go
================================================
// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.30.0
// source: refresh_token.sql

package db

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

const cleanupExpiredRefreshTokens = `-- name: CleanupExpiredRefreshTokens :exec
DELETE FROM refresh_tokens WHERE expires_at < NOW() AND revoked_at IS NULL
`

func (q *Queries) CleanupExpiredRefreshTokens(ctx context.Context) error {
	_, err := q.db.Exec(ctx, cleanupExpiredRefreshTokens)
	return err
}

const createRefreshToken = `-- name: CreateRefreshToken :exec
INSERT INTO refresh_tokens (jti, user_id, token_hash, expires_at)
VALUES ($1::text, $2::uuid, $3::char(64), $4::timestamptz)
`

type CreateRefreshTokenParams struct {
	Jti       string             `json:"jti"`
	UserID    uuid.UUID          `json:"user_id"`
	TokenHash string             `json:"token_hash"`
	ExpiresAt pgtype.Timestamptz `json:"expires_at"`
}

func (q *Queries) CreateRefreshToken(ctx context.Context, arg CreateRefreshTokenParams) error {
	_, err := q.db.Exec(ctx, createRefreshToken,
		arg.Jti,
		arg.UserID,
		arg.TokenHash,
		arg.ExpiresAt,
	)
	return err
}

const getValidRefreshTokenRecord = `-- name: GetValidRefreshTokenRecord :one
SELECT id, jti, user_id, token_hash, expires_at, revoked_at, created_at, updated_at
FROM refresh_tokens
WHERE jti = $1::text AND expires_at > NOW() AND revoked_at IS NULL
`

func (q *Queries) GetValidRefreshTokenRecord(ctx context.Context, jti string) (RefreshToken, error) {
	row := q.db.QueryRow(ctx, getValidRefreshTokenRecord, jti)
	var i RefreshToken
	err := row.Scan(
		&i.ID,
		&i.Jti,
		&i.UserID,
		&i.TokenHash,
		&i.ExpiresAt,
		&i.RevokedAt,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const revokeAllRefreshTokensByUserID = `-- name: RevokeAllRefreshTokensByUserID :exec
UPDATE refresh_tokens
SET revoked_at = NOW(), updated_at = NOW()
WHERE user_id = $1::uuid AND revoked_at IS NULL
`

// Revokes all refresh tokens for a specific user.
func (q *Queries) RevokeAllRefreshTokensByUserID(ctx context.Context, userID uuid.UUID) error {
	_, err := q.db.Exec(ctx, revokeAllRefreshTokensByUserID, userID)
	return err
}

const revokeRefreshTokenByJTI = `-- name: RevokeRefreshTokenByJTI :exec
UPDATE refresh_tokens SET revoked_at = NOW(), updated_at = NOW() WHERE jti = $1::text
`

func (q *Queries) RevokeRefreshTokenByJTI(ctx context.Context, jti string) error {
	_, err := q.db.Exec(ctx, revokeRefreshTokenByJTI, jti)
	return err
}


File: internal/db/user.sql.go
================================================
// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.30.0
// source: user.sql

package db

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

const activateUser = `-- name: ActivateUser :exec
UPDATE users
SET deleted_at = NULL, updated_at = NOW()
WHERE id = $1::uuid
`

// Removes the soft-delete marker by setting deleted_at to NULL.
func (q *Queries) ActivateUser(ctx context.Context, userID uuid.UUID) error {
	_, err := q.db.Exec(ctx, activateUser, userID)
	return err
}

const adminGetUser = `-- name: AdminGetUser :one
SELECT id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at
FROM users
WHERE id = $1::uuid
`

// Gets a specific user by ID, regardless of soft-delete status.
// Useful for admin to see any user, active or inactive.
func (q *Queries) AdminGetUser(ctx context.Context, userID uuid.UUID) (User, error) {
	row := q.db.QueryRow(ctx, adminGetUser, userID)
	var i User
	err := row.Scan(
		&i.ID,
		&i.Email,
		&i.PasswordHash,
		&i.FullName,
		&i.IsAdmin,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.DeletedAt,
	)
	return i, err
}

const countSearchUsers = `-- name: CountSearchUsers :one
SELECT COUNT(*) AS total_matching_users
FROM users
WHERE 
  (LOWER(email) LIKE LOWER($1::text || '%') OR LOWER(full_name) LIKE LOWER($1::text || '%'))
  AND
  -- Filter by active status (NULL means active, NOT NULL means soft-deleted/inactive)
  CASE 
    WHEN $2::boolean THEN deleted_at IS NULL 
    WHEN NOT $2::boolean THEN TRUE -- Include both active and inactive
    ELSE TRUE -- Default if active_only is NULL (count all matching)
  END
`

type CountSearchUsersParams struct {
	SearchTerm string `json:"search_term"`
	ActiveOnly bool   `json:"active_only"`
}

// Counts users matching the search term, optionally filtered by active status.
// Useful for pagination metadata with search.
func (q *Queries) CountSearchUsers(ctx context.Context, arg CountSearchUsersParams) (int64, error) {
	row := q.db.QueryRow(ctx, countSearchUsers, arg.SearchTerm, arg.ActiveOnly)
	var total_matching_users int64
	err := row.Scan(&total_matching_users)
	return total_matching_users, err
}

const countUsers = `-- name: CountUsers :one
SELECT COUNT(*) AS total_users
FROM users
WHERE 
  -- Filter by active status (NULL means active, NOT NULL means soft-deleted/inactive)
  CASE 
    WHEN $1::boolean THEN deleted_at IS NULL 
    WHEN NOT $1::boolean THEN TRUE -- Include both active and inactive
    ELSE TRUE -- Default if active_only is NULL (count all)
  END
`

// Counts total users, optionally filtered by active status (soft-deleted).
// Useful for pagination metadata.
func (q *Queries) CountUsers(ctx context.Context, activeOnly bool) (int64, error) {
	row := q.db.QueryRow(ctx, countUsers, activeOnly)
	var total_users int64
	err := row.Scan(&total_users)
	return total_users, err
}

const createUser = `-- name: CreateUser :one
INSERT INTO users (
    email, password_hash, full_name, is_admin, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at
`

type CreateUserParams struct {
	Email        string             `json:"email"`
	PasswordHash []byte             `json:"password_hash"`
	FullName     *string            `json:"full_name"`
	IsAdmin      bool               `json:"is_admin"`
	CreatedAt    pgtype.Timestamptz `json:"created_at"`
	UpdatedAt    pgtype.Timestamptz `json:"updated_at"`
}

func (q *Queries) CreateUser(ctx context.Context, arg CreateUserParams) (User, error) {
	row := q.db.QueryRow(ctx, createUser,
		arg.Email,
		arg.PasswordHash,
		arg.FullName,
		arg.IsAdmin,
		arg.CreatedAt,
		arg.UpdatedAt,
	)
	var i User
	err := row.Scan(
		&i.ID,
		&i.Email,
		&i.PasswordHash,
		&i.FullName,
		&i.IsAdmin,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.DeletedAt,
	)
	return i, err
}

const getUser = `-- name: GetUser :one
SELECT id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at
FROM users
WHERE id = $1 AND deleted_at IS NULL
`

func (q *Queries) GetUser(ctx context.Context, id uuid.UUID) (User, error) {
	row := q.db.QueryRow(ctx, getUser, id)
	var i User
	err := row.Scan(
		&i.ID,
		&i.Email,
		&i.PasswordHash,
		&i.FullName,
		&i.IsAdmin,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.DeletedAt,
	)
	return i, err
}

const getUserByEmail = `-- name: GetUserByEmail :one
SELECT id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at
FROM users
WHERE email = $1 AND deleted_at IS NULL
`

func (q *Queries) GetUserByEmail(ctx context.Context, email string) (User, error) {
	row := q.db.QueryRow(ctx, getUserByEmail, email)
	var i User
	err := row.Scan(
		&i.ID,
		&i.Email,
		&i.PasswordHash,
		&i.FullName,
		&i.IsAdmin,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.DeletedAt,
	)
	return i, err
}

const getUserWithDetails = `-- name: GetUserWithDetails :one
SELECT 
    u.id, 
    u.email, 
    u.full_name, 
    u.created_at AS registration_date, -- User registration date
    u.deleted_at, -- Needed to determine activity status
    COUNT(o.id) AS total_order_count,
    MAX(o.created_at) AS last_order_date -- Get the latest order date
FROM 
    users u
LEFT JOIN 
    orders o ON u.id = o.user_id
WHERE 
    u.id = $1::uuid
GROUP BY 
    u.id
`

type GetUserWithDetailsRow struct {
	ID               uuid.UUID          `json:"id"`
	Email            string             `json:"email"`
	FullName         *string            `json:"full_name"`
	RegistrationDate pgtype.Timestamptz `json:"registration_date"`
	DeletedAt        pgtype.Timestamptz `json:"deleted_at"`
	TotalOrderCount  int64              `json:"total_order_count"`
	LastOrderDate    interface{}        `json:"last_order_date"`
}

// Fetches a specific user by ID along with order count and last order date.
// Joins with the orders table to get aggregated details.
// Includes soft-deleted users as well.
func (q *Queries) GetUserWithDetails(ctx context.Context, userID uuid.UUID) (GetUserWithDetailsRow, error) {
	row := q.db.QueryRow(ctx, getUserWithDetails, userID)
	var i GetUserWithDetailsRow
	err := row.Scan(
		&i.ID,
		&i.Email,
		&i.FullName,
		&i.RegistrationDate,
		&i.DeletedAt,
		&i.TotalOrderCount,
		&i.LastOrderDate,
	)
	return i, err
}

const listUsers = `-- name: ListUsers :many
SELECT id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at
FROM users
WHERE 
  -- Filter by active status (NULL means active, NOT NULL means soft-deleted/inactive)
  CASE 
    WHEN $1::boolean THEN deleted_at IS NULL 
    WHEN NOT $1::boolean THEN TRUE -- Include both active and inactive
    ELSE TRUE -- Default if active_only is NULL (list all)
  END
ORDER BY created_at DESC -- Or another relevant order
LIMIT $3::int4 OFFSET $2::int4
`

type ListUsersParams struct {
	ActiveOnly bool  `json:"active_only"`
	PageOffset int32 `json:"page_offset"`
	PageLimit  int32 `json:"page_limit"`
}

// Lists users, optionally filtered by active status (soft-deleted).
// Paginated using LIMIT and OFFSET.
func (q *Queries) ListUsers(ctx context.Context, arg ListUsersParams) ([]User, error) {
	rows, err := q.db.Query(ctx, listUsers, arg.ActiveOnly, arg.PageOffset, arg.PageLimit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []User
	for rows.Next() {
		var i User
		if err := rows.Scan(
			&i.ID,
			&i.Email,
			&i.PasswordHash,
			&i.FullName,
			&i.IsAdmin,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.DeletedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listUsersWithListDetails = `-- name: ListUsersWithListDetails :many
SELECT
    u.id,
    u.email,
    u.full_name,
    u.created_at AS registration_date, -- User's registration date
    MAX(o.created_at) AS last_order_date, -- Latest order date for the user (will be NULL if no orders)
    COUNT(o.id) AS total_order_count,
    u.deleted_at -- Needed for determining activity status
FROM
    users u
LEFT JOIN
    orders o ON u.id = o.user_id
WHERE
  CASE
    WHEN $1::boolean THEN u.deleted_at IS NULL
    WHEN NOT $1::boolean THEN TRUE
    ELSE TRUE
  END
GROUP BY
    u.id
ORDER BY
    u.created_at DESC -- Or another relevant order
LIMIT $3::int4 OFFSET $2::int4
`

type ListUsersWithListDetailsParams struct {
	ActiveOnly bool  `json:"active_only"`
	PageOffset int32 `json:"page_offset"`
	PageLimit  int32 `json:"page_limit"`
}

type ListUsersWithListDetailsRow struct {
	ID               uuid.UUID          `json:"id"`
	Email            string             `json:"email"`
	FullName         *string            `json:"full_name"`
	RegistrationDate pgtype.Timestamptz `json:"registration_date"`
	LastOrderDate    interface{}        `json:"last_order_date"`
	TotalOrderCount  int64              `json:"total_order_count"`
	DeletedAt        pgtype.Timestamptz `json:"deleted_at"`
}

// Lists users with essential details for admin list view (name, email, registration date, last order date, order count, status).
// Optionally filter by active status.
// Paginated using LIMIT and OFFSET.
func (q *Queries) ListUsersWithListDetails(ctx context.Context, arg ListUsersWithListDetailsParams) ([]ListUsersWithListDetailsRow, error) {
	rows, err := q.db.Query(ctx, listUsersWithListDetails, arg.ActiveOnly, arg.PageOffset, arg.PageLimit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListUsersWithListDetailsRow
	for rows.Next() {
		var i ListUsersWithListDetailsRow
		if err := rows.Scan(
			&i.ID,
			&i.Email,
			&i.FullName,
			&i.RegistrationDate,
			&i.LastOrderDate,
			&i.TotalOrderCount,
			&i.DeletedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listUsersWithOrderCounts = `-- name: ListUsersWithOrderCounts :many
SELECT 
    u.id, 
    u.email, 
    u.full_name, 
    u.is_admin, 
    u.created_at, 
    u.updated_at, 
    u.deleted_at,
    COUNT(o.id) AS total_order_count
FROM 
    users u
LEFT JOIN 
    orders o ON u.id = o.user_id
WHERE 
  CASE 
    WHEN $1::boolean THEN u.deleted_at IS NULL 
    WHEN NOT $1::boolean THEN TRUE 
    ELSE TRUE 
  END
GROUP BY 
    u.id
ORDER BY 
    u.created_at DESC -- Or another relevant order
LIMIT $3::int4 OFFSET $2::int4
`

type ListUsersWithOrderCountsParams struct {
	ActiveOnly bool  `json:"active_only"`
	PageOffset int32 `json:"page_offset"`
	PageLimit  int32 `json:"page_limit"`
}

type ListUsersWithOrderCountsRow struct {
	ID              uuid.UUID          `json:"id"`
	Email           string             `json:"email"`
	FullName        *string            `json:"full_name"`
	IsAdmin         bool               `json:"is_admin"`
	CreatedAt       pgtype.Timestamptz `json:"created_at"`
	UpdatedAt       pgtype.Timestamptz `json:"updated_at"`
	DeletedAt       pgtype.Timestamptz `json:"deleted_at"`
	TotalOrderCount int64              `json:"total_order_count"`
}

// Lists users with their total order counts.
// Optionally filter by active status.
// Paginated using LIMIT and OFFSET.
func (q *Queries) ListUsersWithOrderCounts(ctx context.Context, arg ListUsersWithOrderCountsParams) ([]ListUsersWithOrderCountsRow, error) {
	rows, err := q.db.Query(ctx, listUsersWithOrderCounts, arg.ActiveOnly, arg.PageOffset, arg.PageLimit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListUsersWithOrderCountsRow
	for rows.Next() {
		var i ListUsersWithOrderCountsRow
		if err := rows.Scan(
			&i.ID,
			&i.Email,
			&i.FullName,
			&i.IsAdmin,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.DeletedAt,
			&i.TotalOrderCount,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const searchUsers = `-- name: SearchUsers :many
SELECT id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at
FROM users
WHERE 
  (LOWER(email) LIKE LOWER($1::text || '%') OR LOWER(full_name) LIKE LOWER($1::text || '%'))
  AND
  -- Filter by active status (NULL means active, NOT NULL means soft-deleted/inactive)
  CASE 
    WHEN $2::boolean THEN deleted_at IS NULL 
    WHEN NOT $2::boolean THEN TRUE -- Include both active and inactive
    ELSE TRUE -- Default if active_only is NULL (list all matching)
  END
ORDER BY created_at DESC -- Or relevance if using full-text search
LIMIT $4::int4 OFFSET $3::int4
`

type SearchUsersParams struct {
	SearchTerm string `json:"search_term"`
	ActiveOnly bool   `json:"active_only"`
	PageOffset int32  `json:"page_offset"`
	PageLimit  int32  `json:"page_limit"`
}

// Searches users by email or full_name, optionally filtered by active status.
// Paginated using LIMIT and OFFSET.
func (q *Queries) SearchUsers(ctx context.Context, arg SearchUsersParams) ([]User, error) {
	rows, err := q.db.Query(ctx, searchUsers,
		arg.SearchTerm,
		arg.ActiveOnly,
		arg.PageOffset,
		arg.PageLimit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []User
	for rows.Next() {
		var i User
		if err := rows.Scan(
			&i.ID,
			&i.Email,
			&i.PasswordHash,
			&i.FullName,
			&i.IsAdmin,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.DeletedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const softDeleteUser = `-- name: SoftDeleteUser :exec
UPDATE users
SET deleted_at = NOW(), updated_at = NOW()
WHERE id = $1::uuid
`

// Marks a user as soft-deleted by setting deleted_at to NOW().
func (q *Queries) SoftDeleteUser(ctx context.Context, userID uuid.UUID) error {
	_, err := q.db.Exec(ctx, softDeleteUser, userID)
	return err
}


File: internal/models/delivery_service.go
================================================
package models

import (
	"time"

	"github.com/google/uuid"
)

type DeliveryService struct {
	ID            uuid.UUID `json:"id"`
	Name          string    `json:"name"`
	Description   *string   `json:"description,omitempty"`
	BaseCostCents int64     `json:"base_cost_cents"`          // Base cost for this service
	EstimatedDays *int32    `json:"estimated_days,omitempty"` // Estimated delivery time
	IsActive      bool      `json:"is_active"`                // Whether the service is currently offered
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// CreateDeliveryServiceRequest represents data to create a new delivery service.
type CreateDeliveryServiceRequest struct {
	Name          string  `json:"name" validate:"required,max=255"`
	Description   *string `json:"description,omitempty"`
	BaseCostCents int64   `json:"base_cost_cents" validate:"min=0"` // Cost in cents
	EstimatedDays *int32  `json:"estimated_days,omitempty" validate:"omitempty,min=1"`
	IsActive      bool    `json:"is_active"`
}

// UpdateDeliveryServiceRequest represents data to update an existing delivery service.
type UpdateDeliveryServiceRequest struct {
	Name          *string `json:"name,omitempty" validate:"omitempty,max=255"`
	Description   *string `json:"description,omitempty"`
	BaseCostCents *int64  `json:"base_cost_cents,omitempty" validate:"omitempty,min=0"`
	EstimatedDays *int32  `json:"estimated_days,omitempty" validate:"omitempty,min=1"`
	IsActive      *bool   `json:"is_active,omitempty"`
}

// Validate methods for request structs
func (r *CreateDeliveryServiceRequest) Validate() error {
	return Validate.Struct(r)
}

func (r *UpdateDeliveryServiceRequest) Validate() error {
	return Validate.Struct(r)
}


File: internal/models/order.go
================================================
package models

import (
	"time"

	"github.com/google/uuid"
)

// Address represents the structure for shipping and billing addresses stored as JSONB.
type Address struct {
	FullName     string  `json:"full_name" validate:"required"`      // Required
	PhoneNumber1 string  `json:"phone_number_1" validate:"required"` // Required
	PhoneNumber2 *string `json:"phone_number_2,omitempty"`           // Optional
	Province     string  `json:"province" validate:"required"`       // Required (formerly 'Provenance')
	City         string  `json:"city" validate:"required"`           // Required
	// Add other potential address fields if needed later
}

func (a *Address) Validate() error {
	return Validate.Struct(a)
}

func (i *BulkAddItemRequest_Item) Validate() error {
	return Validate.Struct(i)
}

// CreateOrderFromCartRequest represents the request body for creating an order from the current cart state.
type CreateOrderFromCartRequest struct {
	ShippingAddress   Address   `json:"shipping_address"`
	BillingAddress    Address   `json:"billing_address"`
	Notes             *string   `json:"notes,omitempty"`     // Optional notes for the order
	DeliveryServiceID uuid.UUID `json:"delivery_service_id"` // Required delivery service ID
}

func (r *CreateOrderFromCartRequest) Validate() error {
	return Validate.Struct(r)
}

// UpdateOrderStatusRequest represents the request body for updating an order's status.
type UpdateOrderStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=pending confirmed shipped delivered cancelled"`
}

func (r *UpdateOrderStatusRequest) Validate() error {
	return Validate.Struct(r)
}

// UpdateOrderRequest represents the request body for updating other order details (e.g., notes).
type UpdateOrderRequest struct {
	Notes *string `json:"notes,omitempty" validate:"omitempty,max=500"` // Optional notes, max length 500 chars
}

func (r *UpdateOrderRequest) Validate() error {
	return Validate.Struct(r)
}

// Order represents the main order entity returned by the service.
type Order struct {
	ID                uuid.UUID  `json:"id"`
	UserID            uuid.UUID  `json:"user_id"`
	UserFullName      string     `json:"user_full_name"`
	Status            string     `json:"status"`
	TotalAmountCents  int64      `json:"total_amount_cents"`
	PaymentMethod     string     `json:"payment_method"`
	Province          string     `json:"province"`
	City              string     `json:"city"`
	PhoneNumber1      string     `json:"phone_number_1"`
	PhoneNumber2      *string    `json:"phone_number_2"`
	DeliveryServiceID uuid.UUID  `json:"delivery_service_id"`
	Notes             *string    `json:"notes,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	CompletedAt       *time.Time `json:"completed_at,omitempty"`
	CancelledAt       *time.Time `json:"cancelled_at,omitempty"`
}

// OrderItem represents an individual item within an order.
type OrderItem struct {
	ID            uuid.UUID `json:"id"`
	OrderID       uuid.UUID `json:"order_id"`
	ProductID     uuid.UUID `json:"product_id"`
	ProductName   string    `json:"product_name"`
	PriceCents    int64     `json:"price_cents"`
	Quantity      int32     `json:"quantity"`
	SubtotalCents int64     `json:"subtotal_cents"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// OrderWithItems represents the complete state of an order for display purposes.
type OrderWithItems struct {
	Order Order       `json:"order"`
	Items []OrderItem `json:"items"`
}

// ListOrdersResponse wraps the result of a list orders query.
type ListOrdersResponse struct {
	Orders []Order `json:"orders"`
}


File: progress.md
================================================

## **Complete Project Roadmap Progress:**

### **Phase 1: Foundation & Setup** ✅ **COMPLETED**
- [x] **Database setup & migrations** (users, products, categories tables)
- [x] **Project structure setup** (handlers, services, models, db packages)
- [x] **Configuration & dependency management**
- [x] **Basic health check endpoint**

### **Phase 2: Authentication System** ✅ **COMPLETED**
- [x] **User registration functionality**
- [x] **User login with JWT authentication**
- [x] **JWT middleware for protected routes**
- [x] **Password hashing & security**
- [x] **User profile retrieval**

### **Phase 3: Product Management System** ✅ **COMPLETED**
- [x] **Product CRUD operations**
- [x] **Category management**
- [x] **Product search with filters**
- [x] **Product pagination**
- [x] **Advanced search functionality**
- [x] **Product-image relationships**

### **Phase 4: Shopping Cart System** ✅ **COMPLETED**
- [x] **Step 1: Create basic cart tables** (migration) 
- [x] **Step 2: Create cart SQL queries** (basic CRUD) 
- [x] **Step 3: Test cart creation** (xh test) 
- [x] **Step 4: Build cart models** 
- [x] **Step 5: Build cart service** (minimal functionality) 
- [x] **Step 6: Build cart handler** (minimal functionality) 
- [x] **Step 7: Test end-to-end** (xh test)

### **Phase 5: Core Cart Features** ✅ **COMPLETED**
- [x] **Step 1: Add to cart feature** 
- [x] **Step 2: Get cart feature** 
- [x] **Step 3: Update cart item** 
- [x] **Step 4: Remove from cart** 
- [x] **Step 5: Clear cart** 
- [x] **Step 6: Comprehensive testing** 

### **Phase 6: Order Management System**
- [ ] **Order creation from cart**
- [ ] **Order status tracking**
- [ ] **Order history**
- [ ] **Payment integration**

### **Phase 7: Advanced Features**
- [ ] **User reviews & ratings**
- [ ] **Wishlist functionality**
- [ ] **Product recommendations**
- [ ] **Inventory management**

### **Phase 8: Production Readiness**
- [ ] **Security enhancements**
- [ ] **Performance optimization**
- [ ] **Monitoring & logging**
- [ ] **Documentation**

**Current Status: 75% Complete** - Ready to start Phase 4, Step 1! 🚀


File: migrations/00009_create_discount_table.sql
================================================
-- +goose Up
-- Create discounts table
CREATE TABLE discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(10) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value BIGINT NOT NULL CHECK (discount_value >= 0),
    min_order_value_cents BIGINT DEFAULT 0 CHECK (min_order_value_cents >= 0),
    max_uses INT DEFAULT NULL,
    current_uses INT DEFAULT 0,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create product_discounts table
CREATE TABLE product_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, discount_id)
);

-- Create category_discounts table
CREATE TABLE category_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (category_id, discount_id)
);

-- Indexes for discounts table
CREATE INDEX idx_discounts_code ON discounts(code);
CREATE INDEX idx_discounts_is_active ON discounts(is_active);
CREATE INDEX idx_discounts_valid_from ON discounts(valid_from);
CREATE INDEX idx_discounts_valid_until ON discounts(valid_until);
CREATE INDEX idx_discounts_active_period ON discounts(is_active, valid_from, valid_until);

-- Indexes for product_discounts table
CREATE INDEX idx_product_discounts_product_id ON product_discounts(product_id);
CREATE INDEX idx_product_discounts_discount_id ON product_discounts(discount_id);

-- Indexes for category_discounts table
CREATE INDEX idx_category_discounts_category_id ON category_discounts(category_id);
CREATE INDEX idx_category_discounts_discount_id ON category_discounts(discount_id);
-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS discounts;
-- +goose StatementEnd


File: orderPayload.json
================================================
{
  "shipping_address": {
    "full_name": "John Doe",
    "phone_number_1": "1234567890",
    "province": "Luzon",
    "city": "Manila"
  },
  "billing_address": {
    "full_name": "Jane Doe",
    "phone_number_1": "0987654321",
    "province": "Luzon",
    "city": "Quezon City"
  },
  "delivery_service_id": "2e37f410-4f52-4e62-9042-a685ea120dec",
  "notes": "Please deliver after 5 PM."
}


File: internal/db/analytics.sql.go
================================================
// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.30.0
// source: analytics.sql

package db

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

const getAverageFulfillmentTime = `-- name: GetAverageFulfillmentTime :one
SELECT
    AVG(EXTRACT(EPOCH FROM (o_shipped_or_delivered.updated_at - o_confirmed.updated_at))) AS avg_seconds
FROM
    orders o_confirmed
JOIN
    orders o_shipped_or_delivered ON o_confirmed.id = o_shipped_or_delivered.id
WHERE
    o_confirmed.status = 'confirmed'
    AND (o_shipped_or_delivered.status = 'shipped' OR o_shipped_or_delivered.status = 'delivered')
    AND o_confirmed.created_at BETWEEN $1 AND $2
`

type GetAverageFulfillmentTimeParams struct {
	CreatedAt   pgtype.Timestamptz `json:"created_at"`
	CreatedAt_2 pgtype.Timestamptz `json:"created_at_2"`
}

// Calculates the average time between order confirmation and shipment/delivery completion.
// Assumes 'confirmed' status is the start and 'shipped' or 'delivered' is the end.
func (q *Queries) GetAverageFulfillmentTime(ctx context.Context, arg GetAverageFulfillmentTimeParams) (float64, error) {
	row := q.db.QueryRow(ctx, getAverageFulfillmentTime, arg.CreatedAt, arg.CreatedAt_2)
	var avg_seconds float64
	err := row.Scan(&avg_seconds)
	return avg_seconds, err
}

const getAverageOrderValue = `-- name: GetAverageOrderValue :one

SELECT
    AVG(o.total_amount_cents) AS aov_cents
FROM
    orders o
WHERE
    o.status = 'delivered'
    AND o.created_at BETWEEN $1 AND $2
`

type GetAverageOrderValueParams struct {
	CreatedAt   pgtype.Timestamptz `json:"created_at"`
	CreatedAt_2 pgtype.Timestamptz `json:"created_at_2"`
}

// $1 = start_date, $2 = end_date
// Calculates the average order value (AOV) for delivered orders within a given time range.
func (q *Queries) GetAverageOrderValue(ctx context.Context, arg GetAverageOrderValueParams) (float64, error) {
	row := q.db.QueryRow(ctx, getAverageOrderValue, arg.CreatedAt, arg.CreatedAt_2)
	var aov_cents float64
	err := row.Scan(&aov_cents)
	return aov_cents, err
}

const getDiscountUsage = `-- name: GetDiscountUsage :many

SELECT
    d.code AS discount_code,
    d.discount_type,
    d.discount_value,
    COUNT(o.id) AS usage_count,
    SUM(o.total_amount_cents) AS total_revenue_with_discount
FROM
    orders o
JOIN
    discounts d ON o.applied_discount_code = d.code -- Assuming orders table stores the code used
WHERE
    o.status = 'delivered'
    AND o.created_at BETWEEN $1 AND $2 -- $1 = start_date, $2 = end_date
GROUP BY
    d.code, d.discount_type, d.discount_value
`

type GetDiscountUsageParams struct {
	CreatedAt   pgtype.Timestamptz `json:"created_at"`
	CreatedAt_2 pgtype.Timestamptz `json:"created_at_2"`
}

type GetDiscountUsageRow struct {
	DiscountCode             string `json:"discount_code"`
	DiscountType             string `json:"discount_type"`
	DiscountValue            int64  `json:"discount_value"`
	UsageCount               int64  `json:"usage_count"`
	TotalRevenueWithDiscount int64  `json:"total_revenue_with_discount"`
}

// --- Discount Effectiveness ---
// Retrieves usage count and revenue attributed to specific discount codes within a time range.
func (q *Queries) GetDiscountUsage(ctx context.Context, arg GetDiscountUsageParams) ([]GetDiscountUsageRow, error) {
	rows, err := q.db.Query(ctx, getDiscountUsage, arg.CreatedAt, arg.CreatedAt_2)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetDiscountUsageRow
	for rows.Next() {
		var i GetDiscountUsageRow
		if err := rows.Scan(
			&i.DiscountCode,
			&i.DiscountType,
			&i.DiscountValue,
			&i.UsageCount,
			&i.TotalRevenueWithDiscount,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getLowStockProducts = `-- name: GetLowStockProducts :many


SELECT
    id AS product_id,
    name AS product_name,
    stock_quantity
FROM
    products
WHERE
    stock_quantity < $1 -- $1 = threshold quantity
    AND deleted_at IS NULL
ORDER BY
    stock_quantity ASC
`

type GetLowStockProductsRow struct {
	ProductID     uuid.UUID `json:"product_id"`
	ProductName   string    `json:"product_name"`
	StockQuantity int32     `json:"stock_quantity"`
}

// $3 = number of top categories to return (N)
// --- Product Performance ---
// Retrieves products with stock quantity below a specified threshold.
func (q *Queries) GetLowStockProducts(ctx context.Context, stockQuantity int32) ([]GetLowStockProductsRow, error) {
	rows, err := q.db.Query(ctx, getLowStockProducts, stockQuantity)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetLowStockProductsRow
	for rows.Next() {
		var i GetLowStockProductsRow
		if err := rows.Scan(&i.ProductID, &i.ProductName, &i.StockQuantity); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getNewCustomersCount = `-- name: GetNewCustomersCount :one

SELECT
    COUNT(*) AS new_customers_count
FROM
    users
WHERE
    created_at BETWEEN $1 AND $2 -- $1 = start_date, $2 = end_date
    AND deleted_at IS NULL
`

type GetNewCustomersCountParams struct {
	CreatedAt   pgtype.Timestamptz `json:"created_at"`
	CreatedAt_2 pgtype.Timestamptz `json:"created_at_2"`
}

// --- Customer Insights ---
// Counts the number of new customers registered within a given time range.
func (q *Queries) GetNewCustomersCount(ctx context.Context, arg GetNewCustomersCountParams) (int64, error) {
	row := q.db.QueryRow(ctx, getNewCustomersCount, arg.CreatedAt, arg.CreatedAt_2)
	var new_customers_count int64
	err := row.Scan(&new_customers_count)
	return new_customers_count, err
}

const getOrderStatusCounts = `-- name: GetOrderStatusCounts :many


SELECT
    status,
    COUNT(*) AS count
FROM
    orders
WHERE
    created_at BETWEEN $1 AND $2 -- $1 = start_date, $2 = end_date (optional, remove if counting all time)
GROUP BY
    status
`

type GetOrderStatusCountsParams struct {
	CreatedAt   pgtype.Timestamptz `json:"created_at"`
	CreatedAt_2 pgtype.Timestamptz `json:"created_at_2"`
}

type GetOrderStatusCountsRow struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

// Exclude soft-deleted users
// --- Order Metrics ---
// Counts the number of orders in each status (pending, confirmed, shipped, delivered, cancelled).
func (q *Queries) GetOrderStatusCounts(ctx context.Context, arg GetOrderStatusCountsParams) ([]GetOrderStatusCountsRow, error) {
	rows, err := q.db.Query(ctx, getOrderStatusCounts, arg.CreatedAt, arg.CreatedAt_2)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetOrderStatusCountsRow
	for rows.Next() {
		var i GetOrderStatusCountsRow
		if err := rows.Scan(&i.Status, &i.Count); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getOrdersByStatusWithinTimeRange = `-- name: GetOrdersByStatusWithinTimeRange :many
SELECT
    status,
    COUNT(*) AS count
FROM
    orders
WHERE
    created_at BETWEEN $1 AND $2 -- $1 = start_date, $2 = end_date
GROUP BY
    status
`

type GetOrdersByStatusWithinTimeRangeParams struct {
	CreatedAt   pgtype.Timestamptz `json:"created_at"`
	CreatedAt_2 pgtype.Timestamptz `json:"created_at_2"`
}

type GetOrdersByStatusWithinTimeRangeRow struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

// $1 = start_date, $2 = end_date
// Note: This query is complex because order status updates modify the same row.
// A more robust approach might involve an order_status_history table or window functions.
// Simplified version assuming statuses are updated sequentially and we just compare timestamps.
// A better way might be to track status change events explicitly.
// For now, let's simplify the logic assuming we just want the difference between created_at and updated_at
// for 'shipped' or 'delivered' orders, IF created_at represents the time it became confirmed.
// This might not be accurate depending on how status transitions are handled.
// Let's revise:
// Assume 'confirmed' status sets confirmed_at, 'shipped' sets shipped_at, 'delivered' sets delivered_at.
// Add these timestamp fields to the orders table if they don't exist.
// ALTER TABLE orders ADD COLUMN confirmed_at TIMESTAMPTZ, shipped_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ;
// Then update these timestamps in the service layer upon status changes.
// Query would then be:
// SELECT AVG(EXTRACT(EPOCH FROM (delivered_at - confirmed_at))) FROM orders WHERE status = 'delivered' AND ...;
// For now, acknowledging this complexity, we'll note it and move on, assuming status timestamps exist or are derivable.
// This query might need adjustment based on how status changes are tracked in the DB.
// Let's add a simpler one based on status counts for now.
// Counts orders by status within a time range.
// This is similar to GetOrderStatusCounts but with a time filter.
func (q *Queries) GetOrdersByStatusWithinTimeRange(ctx context.Context, arg GetOrdersByStatusWithinTimeRangeParams) ([]GetOrdersByStatusWithinTimeRangeRow, error) {
	rows, err := q.db.Query(ctx, getOrdersByStatusWithinTimeRange, arg.CreatedAt, arg.CreatedAt_2)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetOrdersByStatusWithinTimeRangeRow
	for rows.Next() {
		var i GetOrdersByStatusWithinTimeRangeRow
		if err := rows.Scan(&i.Status, &i.Count); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getProductReviewStats = `-- name: GetProductReviewStats :one
SELECT
    avg_rating,
    num_ratings
FROM
    products
WHERE
    id = $1 AND deleted_at IS NULL
`

type GetProductReviewStatsRow struct {
	AvgRating  pgtype.Numeric `json:"avg_rating"`
	NumRatings *int32         `json:"num_ratings"`
}

// Retrieves average rating and number of ratings for a specific product.
// (This might already be covered by the existing product queries selecting avg_rating, num_ratings)
// But here's a dedicated query if needed:
func (q *Queries) GetProductReviewStats(ctx context.Context, id uuid.UUID) (GetProductReviewStatsRow, error) {
	row := q.db.QueryRow(ctx, getProductReviewStats, id)
	var i GetProductReviewStatsRow
	err := row.Scan(&i.AvgRating, &i.NumRatings)
	return i, err
}

const getSalesVolume = `-- name: GetSalesVolume :one

SELECT
    COUNT(*) AS total_orders
FROM
    orders
WHERE
    status = 'delivered'
    AND created_at BETWEEN $1 AND $2
`

type GetSalesVolumeParams struct {
	CreatedAt   pgtype.Timestamptz `json:"created_at"`
	CreatedAt_2 pgtype.Timestamptz `json:"created_at_2"`
}

// $1 = start_date, $2 = end_date
// Counts the total number of delivered orders within a given time range.
func (q *Queries) GetSalesVolume(ctx context.Context, arg GetSalesVolumeParams) (int64, error) {
	row := q.db.QueryRow(ctx, getSalesVolume, arg.CreatedAt, arg.CreatedAt_2)
	var total_orders int64
	err := row.Scan(&total_orders)
	return total_orders, err
}

const getTopSellingCategories = `-- name: GetTopSellingCategories :many

SELECT
    c.id AS category_id,
    c.name AS category_name,
    SUM(oi.quantity) AS total_units_sold
FROM
    order_items oi
JOIN
    orders o ON oi.order_id = o.id
JOIN
    products p ON oi.product_id = p.id
JOIN
    categories c ON p.category_id = c.id
WHERE
    o.status = 'delivered'
    AND o.created_at BETWEEN $1 AND $2 -- $1 = start_date, $2 = end_date
GROUP BY
    c.id, c.name
ORDER BY
    total_units_sold DESC
LIMIT $3
`

type GetTopSellingCategoriesParams struct {
	CreatedAt   pgtype.Timestamptz `json:"created_at"`
	CreatedAt_2 pgtype.Timestamptz `json:"created_at_2"`
	Limit       int32              `json:"limit"`
}

type GetTopSellingCategoriesRow struct {
	CategoryID     uuid.UUID `json:"category_id"`
	CategoryName   string    `json:"category_name"`
	TotalUnitsSold int64     `json:"total_units_sold"`
}

// $3 = number of top products to return (N)
// Retrieves the top N selling categories (by quantity sold) within a given time range.
func (q *Queries) GetTopSellingCategories(ctx context.Context, arg GetTopSellingCategoriesParams) ([]GetTopSellingCategoriesRow, error) {
	rows, err := q.db.Query(ctx, getTopSellingCategories, arg.CreatedAt, arg.CreatedAt_2, arg.Limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetTopSellingCategoriesRow
	for rows.Next() {
		var i GetTopSellingCategoriesRow
		if err := rows.Scan(&i.CategoryID, &i.CategoryName, &i.TotalUnitsSold); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getTopSellingProducts = `-- name: GetTopSellingProducts :many

SELECT
    p.id AS product_id,
    p.name AS product_name,
    SUM(oi.quantity) AS total_units_sold
FROM
    order_items oi
JOIN
    orders o ON oi.order_id = o.id
JOIN
    products p ON oi.product_id = p.id
WHERE
    o.status = 'delivered'
    AND o.created_at BETWEEN $1 AND $2 -- $1 = start_date, $2 = end_date
GROUP BY
    p.id, p.name
ORDER BY
    total_units_sold DESC
LIMIT $3
`

type GetTopSellingProductsParams struct {
	CreatedAt   pgtype.Timestamptz `json:"created_at"`
	CreatedAt_2 pgtype.Timestamptz `json:"created_at_2"`
	Limit       int32              `json:"limit"`
}

type GetTopSellingProductsRow struct {
	ProductID      uuid.UUID `json:"product_id"`
	ProductName    string    `json:"product_name"`
	TotalUnitsSold int64     `json:"total_units_sold"`
}

// $1 = start_date, $2 = end_date
// Retrieves the top N selling products (by quantity sold) within a given time range.
func (q *Queries) GetTopSellingProducts(ctx context.Context, arg GetTopSellingProductsParams) ([]GetTopSellingProductsRow, error) {
	rows, err := q.db.Query(ctx, getTopSellingProducts, arg.CreatedAt, arg.CreatedAt_2, arg.Limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetTopSellingProductsRow
	for rows.Next() {
		var i GetTopSellingProductsRow
		if err := rows.Scan(&i.ProductID, &i.ProductName, &i.TotalUnitsSold); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getTotalRevenue = `-- name: GetTotalRevenue :one

SELECT
    SUM(oi.quantity * oi.price_cents) AS total_revenue_cents
FROM
    orders o
JOIN
    order_items oi ON o.id = oi.order_id
WHERE
    o.status = 'delivered' -- Only delivered orders contribute to revenue
    AND o.created_at BETWEEN $1 AND $2
`

type GetTotalRevenueParams struct {
	CreatedAt   pgtype.Timestamptz `json:"created_at"`
	CreatedAt_2 pgtype.Timestamptz `json:"created_at_2"`
}

// --- Sales Performance ---
// Calculates the total revenue from all delivered orders within a given time range.
func (q *Queries) GetTotalRevenue(ctx context.Context, arg GetTotalRevenueParams) (int64, error) {
	row := q.db.QueryRow(ctx, getTotalRevenue, arg.CreatedAt, arg.CreatedAt_2)
	var total_revenue_cents int64
	err := row.Scan(&total_revenue_cents)
	return total_revenue_cents, err
}


File: internal/db/queries/discounts.sql
================================================
-- name: CreateDiscount :one
-- Inserts a new discount record.
INSERT INTO discounts (
    code, description, discount_type, discount_value,
    min_order_value_cents, max_uses, valid_from, valid_until, is_active
) VALUES (
    $1, $2, $3, $4,
    $5, $6, $7, $8, $9
) RETURNING *;

-- name: GetDiscountByCode :one
-- Fetches a discount by its unique code.
SELECT * FROM discounts WHERE code = $1 AND is_active = TRUE AND valid_from <= NOW() AND valid_until >= NOW();

-- name: GetDiscountByID :one
-- Fetches a discount by its ID.
SELECT * FROM discounts WHERE id = $1;

-- name: UpdateDiscount :one
-- Updates an existing discount record.
UPDATE discounts
SET code = $2,
    description = $3,
    discount_type = $4,
    discount_value = $5,
    min_order_value_cents = $6,
    max_uses = $7,
    valid_from = $8,
    valid_until = $9,
    is_active = $10,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteDiscount :exec
-- Deletes a discount record (and associated links via CASCADE).
DELETE FROM discounts WHERE id = $1;

-- name: ListDiscounts :many
-- Fetches a list of discounts, potentially with filters and pagination.
SELECT * FROM discounts
WHERE (@is_active::boolean IS NULL OR is_active = @is_active) -- Filter by active status if provided
  AND (@from_date::timestamptz IS NULL OR valid_from <= @from_date) -- Filter by valid from date if provided
  AND (@until_date::timestamptz IS NULL OR valid_until >= @until_date) -- Filter by valid until date if provided
ORDER BY created_at DESC -- Or another default order
LIMIT @page_limit OFFSET @page_offset; -- Pagination using limit and offset

-- name: IncrementDiscountUsage :exec
-- Increments the current_uses count for a specific discount.
-- This should ideally be called within a transaction when applying the discount.
UPDATE discounts
SET current_uses = current_uses + 1, updated_at = NOW()
WHERE id = $1 AND (max_uses IS NULL OR current_uses < max_uses); -- Prevent exceeding max_uses

-- --- Link/Unlink Queries ---

-- name: LinkProductToDiscount :exec
-- Associates a product with a discount.
INSERT INTO product_discounts (product_id, discount_id) VALUES ($1, $2);

-- name: UnlinkProductFromDiscount :exec
-- Removes association between a product and a discount.
DELETE FROM product_discounts WHERE product_id = $1 AND discount_id = $2;

-- name: GetDiscountsByProductID :many
-- Fetches active discounts applicable to a specific product.
SELECT d.* FROM discounts d
JOIN product_discounts pd ON d.id = pd.discount_id
WHERE pd.product_id = $1
  AND d.is_active = TRUE
  AND d.valid_from <= NOW()
  AND d.valid_until >= NOW()
  AND (d.max_uses IS NULL OR d.current_uses < d.max_uses); -- Check usage limit

-- name: LinkCategoryToDiscount :exec
-- Associates a category with a discount.
INSERT INTO category_discounts (category_id, discount_id) VALUES ($1, $2);

-- name: UnlinkCategoryFromDiscount :exec
-- Removes association between a category and a discount.
DELETE FROM category_discounts WHERE category_id = $1 AND discount_id = $2;

-- name: GetDiscountsByCategoryID :many
-- Fetches active discounts applicable to a specific category.
SELECT d.* FROM discounts d
JOIN category_discounts cd ON d.id = cd.discount_id
WHERE cd.category_id = $1
  AND d.is_active = TRUE
  AND d.valid_from <= NOW()
  AND d.valid_until >= NOW()
  AND (d.max_uses IS NULL OR d.current_uses < d.max_uses); -- Check usage limit

-- name: GetActiveDiscounts :many
-- Fetches all currently active discounts (within date range and usage limits).
SELECT
    d.id,
    d.code,
    d.description,
    d.discount_type,
    d.discount_value,
    d.min_order_value_cents,
    d.max_uses,
    d.current_uses,
    d.valid_from,
    d.valid_until,
    d.is_active,
    d.created_at,
    d.updated_at
FROM
    discounts d
WHERE
    d.is_active = TRUE AND NOW() BETWEEN d.valid_from AND d.valid_until
    AND (d.max_uses IS NULL OR d.current_uses < d.max_uses); -- Include usage limit check

-- name: ApplyDiscountToProduct :exec
-- Associates a discount with a specific product (simplified version, might need more checks).
INSERT INTO product_discounts (product_id, discount_id)
VALUES ($1, $2);

-- name: ApplyDiscountToCategory :exec
-- Associates a discount with a specific category (simplified version, might need more checks).
INSERT INTO category_discounts (category_id, discount_id)
VALUES ($1, $2);

-- name: CountDiscounts :one
-- Counts discounts based on the same filters as ListDiscounts.
SELECT COUNT(*) FROM discounts
WHERE (@is_active::boolean IS NULL OR is_active = @is_active) -- Filter by active status if provided
  AND (@from_date::timestamptz IS NULL OR valid_from <= @from_date) -- Filter by valid from date if provided
  AND (@until_date::timestamptz IS NULL OR valid_until >= @until_date) ;-- Filter by valid until date if provided


File: internal/db/queries/user.sql
================================================
-- name: GetUserByEmail :one
SELECT id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at
FROM users
WHERE email = $1 AND deleted_at IS NULL;

-- name: CreateUser :one
INSERT INTO users (
    email, password_hash, full_name, is_admin, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at;

-- name: GetUser :one
SELECT id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at
FROM users
WHERE id = $1 AND deleted_at IS NULL;

-- name: ListUsers :many
-- Lists users, optionally filtered by active status (soft-deleted).
-- Paginated using LIMIT and OFFSET.
SELECT id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at
FROM users
WHERE 
  -- Filter by active status (NULL means active, NOT NULL means soft-deleted/inactive)
  CASE 
    WHEN @active_only::boolean THEN deleted_at IS NULL 
    WHEN NOT @active_only::boolean THEN TRUE -- Include both active and inactive
    ELSE TRUE -- Default if active_only is NULL (list all)
  END
ORDER BY created_at DESC -- Or another relevant order
LIMIT @page_limit::int4 OFFSET @page_offset::int4;

-- name: CountUsers :one
-- Counts total users, optionally filtered by active status (soft-deleted).
-- Useful for pagination metadata.
SELECT COUNT(*) AS total_users
FROM users
WHERE 
  -- Filter by active status (NULL means active, NOT NULL means soft-deleted/inactive)
  CASE 
    WHEN @active_only::boolean THEN deleted_at IS NULL 
    WHEN NOT @active_only::boolean THEN TRUE -- Include both active and inactive
    ELSE TRUE -- Default if active_only is NULL (count all)
  END;

-- name: SearchUsers :many
-- Searches users by email or full_name, optionally filtered by active status.
-- Paginated using LIMIT and OFFSET.
SELECT id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at
FROM users
WHERE 
  (LOWER(email) LIKE LOWER(@search_term::text || '%') OR LOWER(full_name) LIKE LOWER(@search_term::text || '%'))
  AND
  -- Filter by active status (NULL means active, NOT NULL means soft-deleted/inactive)
  CASE 
    WHEN @active_only::boolean THEN deleted_at IS NULL 
    WHEN NOT @active_only::boolean THEN TRUE -- Include both active and inactive
    ELSE TRUE -- Default if active_only is NULL (list all matching)
  END
ORDER BY created_at DESC -- Or relevance if using full-text search
LIMIT @page_limit::int4 OFFSET @page_offset::int4;

-- name: CountSearchUsers :one
-- Counts users matching the search term, optionally filtered by active status.
-- Useful for pagination metadata with search.
SELECT COUNT(*) AS total_matching_users
FROM users
WHERE 
  (LOWER(email) LIKE LOWER(@search_term::text || '%') OR LOWER(full_name) LIKE LOWER(@search_term::text || '%'))
  AND
  -- Filter by active status (NULL means active, NOT NULL means soft-deleted/inactive)
  CASE 
    WHEN @active_only::boolean THEN deleted_at IS NULL 
    WHEN NOT @active_only::boolean THEN TRUE -- Include both active and inactive
    ELSE TRUE -- Default if active_only is NULL (count all matching)
  END;

-- name: AdminGetUser :one
-- Gets a specific user by ID, regardless of soft-delete status.
-- Useful for admin to see any user, active or inactive.
SELECT id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at
FROM users
WHERE id = @user_id::uuid;

-- name: GetUserWithDetails :one
-- Fetches a specific user by ID along with order count and last order date.
-- Joins with the orders table to get aggregated details.
-- Includes soft-deleted users as well.
SELECT 
    u.id, 
    u.email, 
    u.full_name, 
    u.created_at AS registration_date, -- User registration date
    u.deleted_at, -- Needed to determine activity status
    COUNT(o.id) AS total_order_count,
    MAX(o.created_at) AS last_order_date -- Get the latest order date
FROM 
    users u
LEFT JOIN 
    orders o ON u.id = o.user_id
WHERE 
    u.id = @user_id::uuid
GROUP BY 
    u.id;

-- name: ListUsersWithOrderCounts :many
-- Lists users with their total order counts.
-- Optionally filter by active status.
-- Paginated using LIMIT and OFFSET.
SELECT 
    u.id, 
    u.email, 
    u.full_name, 
    u.is_admin, 
    u.created_at, 
    u.updated_at, 
    u.deleted_at,
    COUNT(o.id) AS total_order_count
FROM 
    users u
LEFT JOIN 
    orders o ON u.id = o.user_id
WHERE 
  CASE 
    WHEN @active_only::boolean THEN u.deleted_at IS NULL 
    WHEN NOT @active_only::boolean THEN TRUE 
    ELSE TRUE 
  END
GROUP BY 
    u.id
ORDER BY 
    u.created_at DESC -- Or another relevant order
LIMIT @page_limit::int4 OFFSET @page_offset::int4;

-- name: ListUsersWithListDetails :many
-- Lists users with essential details for admin list view (name, email, registration date, last order date, order count, status).
-- Optionally filter by active status.
-- Paginated using LIMIT and OFFSET.
SELECT
    u.id,
    u.email,
    u.full_name,
    u.created_at AS registration_date, -- User's registration date
    MAX(o.created_at) AS last_order_date, -- Latest order date for the user (will be NULL if no orders)
    COUNT(o.id) AS total_order_count,
    u.deleted_at -- Needed for determining activity status
FROM
    users u
LEFT JOIN
    orders o ON u.id = o.user_id
WHERE
  CASE
    WHEN @active_only::boolean THEN u.deleted_at IS NULL
    WHEN NOT @active_only::boolean THEN TRUE
    ELSE TRUE
  END
GROUP BY
    u.id
ORDER BY
    u.created_at DESC -- Or another relevant order
LIMIT @page_limit::int4 OFFSET @page_offset::int4;

-- name: SoftDeleteUser :exec
-- Marks a user as soft-deleted by setting deleted_at to NOW().
UPDATE users
SET deleted_at = NOW(), updated_at = NOW()
WHERE id = @user_id::uuid;

-- name: ActivateUser :exec
-- Removes the soft-delete marker by setting deleted_at to NULL.
UPDATE users
SET deleted_at = NULL, updated_at = NOW()
WHERE id = @user_id::uuid;


File: internal/models/validation.go
================================================
package models

import "github.com/go-playground/validator/v10"

// Global validator instance for the models package
var Validate *validator.Validate

type Validator interface {
	Validate() error
}

func init() {
	Validate = validator.New()
}


File: internal/models/auth.go
================================================
package models

type LoginResponse struct {
	Token string `json:"access_token"` // Rename for clarity
	User  User   `json:"user"`
}

type RefreshResponse struct {
	AccessToken string `json:"access_token"` // New access token
}

type RefreshRequest struct {
}

type LogoutRequest struct {
}

func (lr *LoginResponse) Validate() error {
	return nil
}

func (rr *RefreshResponse) Validate() error {
	return nil
}

func (rr *RefreshRequest) Validate() error {
	return Validate.Struct(rr)
}

func (lr *LogoutRequest) Validate() error {
	return Validate.Struct(lr)
}


File: internal/handlers/review.go
================================================
package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"tech-store-backend/internal/models"
	"tech-store-backend/internal/services"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type ReviewHandler struct {
	service *services.ReviewService
	logger  *slog.Logger
}

func NewReviewHandler(service *services.ReviewService, logger *slog.Logger) *ReviewHandler {
	return &ReviewHandler{
		service: service,
		logger:  logger,
	}
}

// RegisterRoutes registers the review-related routes.
func (h *ReviewHandler) RegisterRoutes(r chi.Router) {
	r.Get("/product/{product_id}", h.GetReviewsByProductID) // GET /api/v1/reviews/product/{product_id}?page=&limit=

	r.Group(func(r chi.Router) {
		r.Post("/", h.CreateReview)              // POST /api/v1/reviews
		r.Put("/{review_id}", h.UpdateReview)    // PUT /api/v1/reviews/{review_id}
		r.Delete("/{review_id}", h.DeleteReview) // DELETE /api/v1/reviews/{review_id}
		// r.Get("/user", h.GetReviewsByCurrentUser) // GET /api/v1/reviews/user?page=&limit=
	})

	// r.Get("/user/{user_id}", h.GetReviewsByUserID) // GET /api/v1/reviews/user/{user_id}?page=&limit=
}

// CreateReview handles creating a new review.
func (h *ReviewHandler) CreateReview(w http.ResponseWriter, r *http.Request) {
	user, ok := models.GetUserFromContext(r.Context())
	if !ok || user.ID == uuid.Nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req models.CreateReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode CreateReview request", "error", err)
		http.Error(w, "Invalid JSON in request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if err := req.Validate(); err != nil {
		h.logger.Warn("Validation error in CreateReview", "error", err)
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	review, err := h.service.CreateReview(r.Context(), user.ID, req)
	if err != nil {
		h.logger.Error("Failed to create review", "error", err, "user_id", user.ID, "product_id", req.ProductID)

		if err.Error() == "user has already reviewed this product" {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		http.Error(w, "Failed to create review", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(review); err != nil {
		h.logger.Error("Failed to encode CreateReview response", "error", err)
	}
}

// UpdateReview handles updating an existing review.
func (h *ReviewHandler) UpdateReview(w http.ResponseWriter, r *http.Request) {
	user, ok := models.GetUserFromContext(r.Context())
	if !ok || user.ID == uuid.Nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	reviewIDStr := chi.URLParam(r, "review_id")
	reviewID, err := uuid.Parse(reviewIDStr)
	if err != nil {
		h.logger.Warn("Invalid review ID format in UpdateReview", "review_id_str", reviewIDStr, "error", err)
		http.Error(w, "Invalid review ID format", http.StatusBadRequest)
		return
	}

	var req models.UpdateReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode UpdateReview request", "error", err)
		http.Error(w, "Invalid JSON in request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if err := req.Validate(); err != nil {
		h.logger.Warn("Validation error in UpdateReview", "error", err)
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	review, err := h.service.UpdateReview(r.Context(), reviewID, user.ID, req)
	if err != nil {
		h.logger.Error("Failed to update review", "error", err, "user_id", user.ID, "review_id", reviewID)

		if err.Error() == "review not found or does not belong to user" {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}

		http.Error(w, "Failed to update review", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(review); err != nil {
		h.logger.Error("Failed to encode UpdateReview response", "error", err)
	}
}

// DeleteReview handles deleting an existing review.
func (h *ReviewHandler) DeleteReview(w http.ResponseWriter, r *http.Request) {
	user, ok := models.GetUserFromContext(r.Context())
	if !ok || user.ID == uuid.Nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	reviewIDStr := chi.URLParam(r, "review_id")
	reviewID, err := uuid.Parse(reviewIDStr)
	if err != nil {
		h.logger.Warn("Invalid review ID format in DeleteReview", "review_id_str", reviewIDStr, "error", err)
		http.Error(w, "Invalid review ID format", http.StatusBadRequest)
		return
	}

	err = h.service.DeleteReview(r.Context(), reviewID, user.ID)
	if err != nil {
		h.logger.Error("Failed to delete review", "error", err, "user_id", user.ID, "review_id", reviewID)

		if err.Error() == "review not found or does not belong to user" {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}

		http.Error(w, "Failed to delete review", http.StatusInternalServerError)
		return
	}

	// 204 No Content on successful deletion
	w.WriteHeader(http.StatusNoContent)
}

// GetReviewsByProductID handles fetching reviews for a specific product.
func (h *ReviewHandler) GetReviewsByProductID(w http.ResponseWriter, r *http.Request) {
	productIDStr := chi.URLParam(r, "product_id")
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		h.logger.Warn("Invalid product ID format in GetReviewsByProductID", "product_id_str", productIDStr, "error", err)
		http.Error(w, "Invalid product ID format", http.StatusBadRequest)
		return
	}

	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}

	}

	limit := 20
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}

	}

	resp, err := h.service.GetReviewsByProductID(r.Context(), productID, page, limit)
	if err != nil {
		h.logger.Error("Failed to get reviews for product", "error", err, "product_id", productID)
		http.Error(w, "Failed to retrieve reviews", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		h.logger.Error("Failed to encode GetReviewsByProductID response", "error", err)
	}
}

// GetReviewsByCurrentUser handles fetching reviews submitted by the currently authenticated user.
func (h *ReviewHandler) GetReviewsByCurrentUser(w http.ResponseWriter, r *http.Request) {
	user, ok := models.GetUserFromContext(r.Context())
	if !ok || user.ID == uuid.Nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	limit := 20
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	resp, err := h.service.GetReviewsByUserID(r.Context(), user.ID, page, limit)
	if err != nil {
		h.logger.Error("Failed to get reviews by current user", "error", err, "user_id", user.ID)
		http.Error(w, "Failed to retrieve reviews", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		h.logger.Error("Failed to encode GetReviewsByCurrentUser response", "error", err)
	}
}

// GetReviewsByUserID handles fetching reviews submitted by a specific user.
func (h *ReviewHandler) GetReviewsByUserID(w http.ResponseWriter, r *http.Request) {
	userIDStr := chi.URLParam(r, "user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.logger.Warn("Invalid user ID format in GetReviewsByUserID", "user_id_str", userIDStr, "error", err)
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}
	h.logger.Info("the user id", "id", userID)
}


File: internal/utils/slug.go
================================================
package utils

import (
	"github.com/gosimple/slug"
)

// GenerateSlug creates a URL-friendly slug from an input string.
// It converts the input to lowercase, replaces spaces with hyphens,
// removes special characters, etc.
// Example: "AMD Ryzen 9 7950X" -> "amd-ryzen-9-7950x"
func GenerateSlug(input string) string {
	return slug.Make(input)
}


File: internal/services/user_service.go
================================================
package services

import (
	"context"
	"errors"
	"time"

	"tech-store-backend/internal/db"
	"tech-store-backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	querier db.Querier
}

func NewUserService(querier db.Querier) *UserService {
	return &UserService{
		querier: querier,
	}
}

func (s *UserService) Register(ctx context.Context, email, password, fullName string) (uuid.UUID, error) {
	// Check if user already exists
	_, err := s.querier.GetUserByEmail(ctx, email)
	if err == nil {
		return uuid.Nil, errors.New("user already exists")
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, err
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return uuid.Nil, err
	}

	// Create user
	now := pgtype.Timestamptz{Time: time.Now(), Valid: true}
	params := db.CreateUserParams{
		Email:        email,
		PasswordHash: hashedPassword,
		FullName:     &fullName,
		IsAdmin:      false,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	user, err := s.querier.CreateUser(ctx, params)
	if err != nil {
		return uuid.Nil, err
	}

	// Return uuid.UUID directly
	return user.ID, nil
}

func (s *UserService) Authenticate(ctx context.Context, email, password string) (*models.User, error) {
	dbUser, err := s.querier.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("invalid credentials")
		}
		return nil, err
	}

	// Compare the provided password with the hashed password from DB
	if err := bcrypt.CompareHashAndPassword(dbUser.PasswordHash, []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Convert database user to service user
	user := &models.User{
		ID:        dbUser.ID, // Now uuid.UUID
		Email:     dbUser.Email,
		Password:  string(dbUser.PasswordHash),
		FullName:  *dbUser.FullName,
		IsAdmin:   dbUser.IsAdmin,
		CreatedAt: dbUser.CreatedAt.Time,
		UpdatedAt: dbUser.UpdatedAt.Time,
	}

	if dbUser.DeletedAt.Valid {
		user.DeletedAt = &dbUser.DeletedAt.Time
	}

	return user, nil
}

func (s *UserService) GetByID(ctx context.Context, id string) (*models.User, error) {
	// Parse the UUID string
	userUUID, err := uuid.Parse(id)
	if err != nil {
		return nil, errors.New("invalid user ID format")
	}

	dbUser, err := s.querier.GetUser(ctx, userUUID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	user := &models.User{
		ID:        dbUser.ID, // Now uuid.UUID
		Email:     dbUser.Email,
		Password:  string(dbUser.PasswordHash),
		FullName:  *dbUser.FullName,
		IsAdmin:   dbUser.IsAdmin,
		CreatedAt: dbUser.CreatedAt.Time,
		UpdatedAt: dbUser.UpdatedAt.Time,
	}

	if dbUser.DeletedAt.Valid {
		user.DeletedAt = &dbUser.DeletedAt.Time
	}

	return user, nil
}


File: schema_only.sql
================================================
--
-- PostgreSQL database dump
--

\restrict XyeJYg0yu6LtIwYlWhRXKhiovi94y3KpjICt045z64DZycnJ9pptwQppUgPe9bQ

-- Dumped from database version 17.7
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cart_id uuid,
    product_id uuid,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.cart_items OWNER TO tech_user;

--
-- Name: carts; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.carts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    session_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT user_or_session_id CHECK ((((user_id IS NOT NULL) AND (session_id IS NULL)) OR ((user_id IS NULL) AND (session_id IS NOT NULL))))
);


ALTER TABLE public.carts OWNER TO tech_user;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.categories OWNER TO tech_user;

--
-- Name: category_discounts; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.category_discounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    category_id uuid NOT NULL,
    discount_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.category_discounts OWNER TO tech_user;

--
-- Name: delivery_services; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.delivery_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    base_cost_cents bigint DEFAULT 0 NOT NULL,
    estimated_days integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.delivery_services OWNER TO tech_user;

--
-- Name: TABLE delivery_services; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON TABLE public.delivery_services IS 'Stores available delivery service options.';


--
-- Name: COLUMN delivery_services.name; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON COLUMN public.delivery_services.name IS 'Unique name identifying the delivery service.';


--
-- Name: COLUMN delivery_services.description; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON COLUMN public.delivery_services.description IS 'Optional description of the delivery service.';


--
-- Name: COLUMN delivery_services.base_cost_cents; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON COLUMN public.delivery_services.base_cost_cents IS 'Base cost of the delivery service in cents.';


--
-- Name: COLUMN delivery_services.estimated_days; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON COLUMN public.delivery_services.estimated_days IS 'Estimated number of days for delivery.';


--
-- Name: COLUMN delivery_services.is_active; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON COLUMN public.delivery_services.is_active IS 'Indicates if the delivery service is currently offered.';


--
-- Name: discounts; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.discounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    discount_type character varying(10) NOT NULL,
    discount_value bigint NOT NULL,
    min_order_value_cents bigint DEFAULT 0,
    max_uses integer,
    current_uses integer DEFAULT 0,
    valid_from timestamp with time zone NOT NULL,
    valid_until timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT discounts_discount_type_check CHECK (((discount_type)::text = ANY ((ARRAY['percentage'::character varying, 'fixed'::character varying])::text[]))),
    CONSTRAINT discounts_discount_value_check CHECK ((discount_value >= 0)),
    CONSTRAINT discounts_min_order_value_cents_check CHECK ((min_order_value_cents >= 0))
);


ALTER TABLE public.discounts OWNER TO tech_user;

--
-- Name: goose_db_version; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.goose_db_version (
    id integer NOT NULL,
    version_id bigint NOT NULL,
    is_applied boolean NOT NULL,
    tstamp timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.goose_db_version OWNER TO tech_user;

--
-- Name: goose_db_version_id_seq; Type: SEQUENCE; Schema: public; Owner: tech_user
--

ALTER TABLE public.goose_db_version ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.goose_db_version_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_name character varying(255) NOT NULL,
    price_cents bigint NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    subtotal_cents bigint GENERATED ALWAYS AS ((price_cents * quantity)) STORED,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.order_items OWNER TO tech_user;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_full_name character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    total_amount_cents bigint DEFAULT 0 NOT NULL,
    payment_method character varying(50) DEFAULT 'Cash on Delivery'::character varying NOT NULL,
    province character varying(255) NOT NULL,
    city character varying(255) NOT NULL,
    phone_number_1 character varying(255) NOT NULL,
    phone_number_2 character varying(255),
    notes text,
    delivery_service_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'shipped'::character varying, 'delivered'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.orders OWNER TO tech_user;

--
-- Name: product_discounts; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.product_discounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    discount_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_discounts OWNER TO tech_user;

--
-- Name: products; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    category_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    short_description character varying(255),
    price_cents bigint NOT NULL,
    stock_quantity integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    brand character varying(100) NOT NULL,
    avg_rating numeric(3,2) DEFAULT NULL::numeric,
    num_ratings integer DEFAULT 0,
    image_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    spec_highlights jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT products_price_cents_check CHECK ((price_cents >= 0)),
    CONSTRAINT products_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'discontinued'::character varying])::text[]))),
    CONSTRAINT products_stock_quantity_check CHECK ((stock_quantity >= 0))
);


ALTER TABLE public.products OWNER TO tech_user;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    jti character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    token_hash character(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.refresh_tokens OWNER TO tech_user;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: tech_user
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.refresh_tokens_id_seq OWNER TO tech_user;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tech_user
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    rating integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO tech_user;

--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.schema_migrations (
    version bigint NOT NULL,
    is_applied boolean DEFAULT true NOT NULL,
    applied_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.schema_migrations OWNER TO tech_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash bytea,
    full_name character varying(255),
    is_admin boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO tech_user;

--
-- Name: v_products_with_calculated_discounts; Type: VIEW; Schema: public; Owner: tech_user
--

CREATE VIEW public.v_products_with_calculated_discounts AS
 WITH discount_calculations AS (
         SELECT p.id,
            p.price_cents,
            COALESCE(sum(
                CASE
                    WHEN ((d.discount_type)::text = 'fixed'::text) THEN d.discount_value
                    ELSE (0)::bigint
                END) FILTER (WHERE (d.is_active AND ((now() >= d.valid_from) AND (now() <= d.valid_until)))), (0)::numeric) AS total_fixed_discount_cents,
            COALESCE(exp(sum(
                CASE
                    WHEN (((d.discount_type)::text = 'percentage'::text) AND (d.discount_value < 100)) THEN ln(((1)::numeric - ((d.discount_value)::numeric / 100.0)))
                    ELSE (0)::numeric
                END) FILTER (WHERE (d.is_active AND ((now() >= d.valid_from) AND (now() <= d.valid_until))))), 1.0) AS combined_percentage_factor
           FROM ((public.products p
             LEFT JOIN public.product_discounts pd ON ((p.id = pd.product_id)))
             LEFT JOIN public.discounts d ON ((pd.discount_id = d.id)))
          GROUP BY p.id, p.price_cents
        )
 SELECT id AS product_id,
    total_fixed_discount_cents,
    combined_percentage_factor,
    ((((price_cents)::numeric - total_fixed_discount_cents) * combined_percentage_factor))::bigint AS calculated_discounted_price_cents,
        CASE
            WHEN (((((price_cents)::numeric - total_fixed_discount_cents) * combined_percentage_factor))::bigint < price_cents) THEN true
            ELSE false
        END AS has_active_discount
   FROM discount_calculations dc;


ALTER VIEW public.v_products_with_calculated_discounts OWNER TO tech_user;

--
-- Name: v_products_with_current_discounts; Type: VIEW; Schema: public; Owner: tech_user
--

CREATE VIEW public.v_products_with_current_discounts AS
 SELECT p.id AS product_id,
    p.category_id,
    p.name AS product_name,
    p.slug AS product_slug,
    p.description AS product_description,
    p.short_description AS product_short_description,
    p.price_cents AS original_price_cents,
    p.stock_quantity AS product_stock_quantity,
    p.status AS product_status,
    p.brand AS product_brand,
    p.image_urls AS product_image_urls,
    p.spec_highlights AS product_spec_highlights,
    p.created_at AS product_created_at,
    p.updated_at AS product_updated_at,
    p.deleted_at AS product_deleted_at,
    p.avg_rating,
    p.num_ratings,
        CASE
            WHEN (pd.discount_id IS NOT NULL) THEN
            CASE
                WHEN ((d.discount_type)::text = 'percentage'::text) THEN ((p.price_cents * (100 - d.discount_value)) / 100)
                ELSE (p.price_cents - d.discount_value)
            END
            ELSE p.price_cents
        END AS discounted_price_cents,
    d.code AS active_discount_code,
    d.discount_type AS active_discount_type,
    d.discount_value AS active_discount_value,
    (pd.discount_id IS NOT NULL) AS has_active_discount
   FROM ((public.products p
     LEFT JOIN public.product_discounts pd ON ((p.id = pd.product_id)))
     LEFT JOIN public.discounts d ON (((pd.discount_id = d.id) AND (d.is_active = true) AND ((now() >= d.valid_from) AND (now() <= d.valid_until)))));


ALTER VIEW public.v_products_with_current_discounts OWNER TO tech_user;

--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: cart_items cart_items_cart_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_product_id_key UNIQUE (cart_id, product_id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: carts carts_session_id_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_session_id_key UNIQUE (session_id);


--
-- Name: carts carts_user_id_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_key UNIQUE (user_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: category_discounts category_discounts_category_id_discount_id_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.category_discounts
    ADD CONSTRAINT category_discounts_category_id_discount_id_key UNIQUE (category_id, discount_id);


--
-- Name: category_discounts category_discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.category_discounts
    ADD CONSTRAINT category_discounts_pkey PRIMARY KEY (id);


--
-- Name: delivery_services delivery_services_name_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.delivery_services
    ADD CONSTRAINT delivery_services_name_key UNIQUE (name);


--
-- Name: delivery_services delivery_services_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.delivery_services
    ADD CONSTRAINT delivery_services_pkey PRIMARY KEY (id);


--
-- Name: discounts discounts_code_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_code_key UNIQUE (code);


--
-- Name: discounts discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_pkey PRIMARY KEY (id);


--
-- Name: goose_db_version goose_db_version_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.goose_db_version
    ADD CONSTRAINT goose_db_version_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_discounts product_discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.product_discounts
    ADD CONSTRAINT product_discounts_pkey PRIMARY KEY (id);


--
-- Name: product_discounts product_discounts_product_id_discount_id_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.product_discounts
    ADD CONSTRAINT product_discounts_product_id_discount_id_key UNIQUE (product_id, discount_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: refresh_tokens refresh_tokens_jti_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_jti_key UNIQUE (jti);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_cart_items_cart_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_cart_items_cart_id ON public.cart_items USING btree (cart_id);


--
-- Name: idx_cart_items_product_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_cart_items_product_id ON public.cart_items USING btree (product_id);


--
-- Name: idx_carts_session_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_carts_session_id ON public.carts USING btree (session_id);


--
-- Name: idx_carts_user_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_carts_user_id ON public.carts USING btree (user_id);


--
-- Name: idx_categories_parent; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_categories_parent ON public.categories USING btree (parent_id);


--
-- Name: idx_categories_slug; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);


--
-- Name: idx_category_discounts_category_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_category_discounts_category_id ON public.category_discounts USING btree (category_id);


--
-- Name: idx_category_discounts_discount_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_category_discounts_discount_id ON public.category_discounts USING btree (discount_id);


--
-- Name: idx_delivery_services_is_active; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_delivery_services_is_active ON public.delivery_services USING btree (is_active);


--
-- Name: idx_discounts_active_period; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_discounts_active_period ON public.discounts USING btree (is_active, valid_from, valid_until);


--
-- Name: idx_discounts_code; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_discounts_code ON public.discounts USING btree (code);


--
-- Name: idx_discounts_is_active; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_discounts_is_active ON public.discounts USING btree (is_active);


--
-- Name: idx_discounts_valid_from; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_discounts_valid_from ON public.discounts USING btree (valid_from);


--
-- Name: idx_discounts_valid_until; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_discounts_valid_until ON public.discounts USING btree (valid_until);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- Name: idx_orders_delivery_service_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_orders_delivery_service_id ON public.orders USING btree (delivery_service_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_product_discounts_discount_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_product_discounts_discount_id ON public.product_discounts USING btree (discount_id);


--
-- Name: idx_product_discounts_product_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_product_discounts_product_id ON public.product_discounts USING btree (product_id);


--
-- Name: idx_products_active; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_active ON public.products USING btree (id) WHERE (((status)::text = 'active'::text) AND (deleted_at IS NULL));


--
-- Name: idx_products_brand; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_brand ON public.products USING btree (brand);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- Name: idx_products_category_created; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_category_created ON public.products USING btree (category_id, created_at);


--
-- Name: idx_products_price; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_price ON public.products USING btree (price_cents);


--
-- Name: idx_products_search; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_search ON public.products USING gin (to_tsvector('english'::regconfig, (((name)::text || ' '::text) || (COALESCE(short_description, ''::character varying))::text)));


--
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- Name: idx_products_stock; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_stock ON public.products USING btree (stock_quantity);


--
-- Name: idx_refresh_tokens_active_lookup; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_refresh_tokens_active_lookup ON public.refresh_tokens USING btree (jti, expires_at, revoked_at);


--
-- Name: idx_refresh_tokens_expires_at; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_refresh_tokens_expires_at ON public.refresh_tokens USING btree (expires_at);


--
-- Name: idx_refresh_tokens_jti; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_refresh_tokens_jti ON public.refresh_tokens USING btree (jti);


--
-- Name: idx_refresh_tokens_revoked_at; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_refresh_tokens_revoked_at ON public.refresh_tokens USING btree (revoked_at);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_reviews_created_at; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_reviews_created_at ON public.reviews USING btree (created_at);


--
-- Name: idx_reviews_product_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_reviews_product_id ON public.reviews USING btree (product_id);


--
-- Name: idx_reviews_rating; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_reviews_rating ON public.reviews USING btree (rating);


--
-- Name: idx_reviews_user_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);


--
-- Name: idx_reviews_user_product_unique; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE UNIQUE INDEX idx_reviews_user_product_unique ON public.reviews USING btree (user_id, product_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_users_email ON public.users USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: category_discounts category_discounts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.category_discounts
    ADD CONSTRAINT category_discounts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: category_discounts category_discounts_discount_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.category_discounts
    ADD CONSTRAINT category_discounts_discount_id_fkey FOREIGN KEY (discount_id) REFERENCES public.discounts(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens fk_refresh_tokens_user; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: orders orders_delivery_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_delivery_service_id_fkey FOREIGN KEY (delivery_service_id) REFERENCES public.delivery_services(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: product_discounts product_discounts_discount_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.product_discounts
    ADD CONSTRAINT product_discounts_discount_id_fkey FOREIGN KEY (discount_id) REFERENCES public.discounts(id) ON DELETE CASCADE;


--
-- Name: product_discounts product_discounts_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.product_discounts
    ADD CONSTRAINT product_discounts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict XyeJYg0yu6LtIwYlWhRXKhiovi94y3KpjICt045z64DZycnJ9pptwQppUgPe9bQ



Summary:
Total files: 94
Total size: 719158 bytes
