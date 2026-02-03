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
    sqlc.arg(cart_id),
    sqlc.arg(product_id),
    sqlc.arg(quantity),
    NOW(),
    NOW()
FROM products
WHERE id = sqlc.arg(product_id)
    AND stock_quantity >= sqlc.arg(quantity)  -- Ensure enough stock
    AND status = 'active'
    AND deleted_at IS NULL
ON CONFLICT (cart_id, product_id)
DO UPDATE SET
    quantity = LEAST(
        cart_items.quantity + EXCLUDED.quantity,
        (SELECT stock_quantity FROM products WHERE id = sqlc.arg(product_id))
    ),
    updated_at = NOW()
RETURNING
    id,
    cart_id,
    product_id,
    quantity,
    created_at,
    updated_at;

-- name: AddCartItemsBulk :exec
INSERT INTO cart_items (cart_id, product_id, quantity, created_at, updated_at)
SELECT 
  $1,
  input.product_id,
  input.quantity,
  NOW(),
  NOW()
FROM (
  SELECT 
    UNNEST(@product_ids::uuid[]) as product_id,
    UNNEST(@quantities::int[]) as quantity
) as input
INNER JOIN products p ON p.id = input.product_id
  AND p.stock_quantity >= input.quantity
  AND p.status = 'active'
  AND p.deleted_at IS NULL
ON CONFLICT (cart_id, product_id)
DO UPDATE SET
  quantity = LEAST(
    cart_items.quantity + EXCLUDED.quantity,
    (SELECT stock_quantity FROM products WHERE id = EXCLUDED.product_id)
  ),
  updated_at = NOW();   

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
