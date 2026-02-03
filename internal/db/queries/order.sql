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
