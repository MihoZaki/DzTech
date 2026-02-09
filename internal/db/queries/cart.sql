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
