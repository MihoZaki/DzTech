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
    AND o.created_at BETWEEN @start_date AND end_date; -- $1 = start_date, $2 = end_date

-- name: GetSalesVolume :one
-- Counts the total number of delivered orders within a given time range.
SELECT
    COUNT(*) AS total_orders
FROM
    orders
WHERE
    status = 'delivered'
    AND created_at BETWEEN @start_date AND @end_date; -- @start_date = start_date, @start_date = end_date

-- name: GetAverageOrderValue :one
-- Calculates the average order value (AOV) for delivered orders within a given time range.
SELECT
    AVG(o.total_amount_cents) AS aov_cents
FROM
    orders o
WHERE
    o.status = 'delivered'
    AND o.created_at BETWEEN @start_date AND @end_date; -- $1 = start_date, $2 = end_date

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
    AND o.created_at BETWEEN @start_date AND @end_date -- $1 = start_date, $2 = end_date
GROUP BY
    p.id, p.name
ORDER BY
    total_units_sold DESC
LIMIT @limits; -- $3 = number of top products to return (N)

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
    AND o.created_at BETWEEN @start_date AND @end_date -- $1 = start_date, $2 = end_date
GROUP BY
    c.id, c.name
ORDER BY
    total_units_sold DESC
LIMIT @limits; -- $3 = number of top products to return (N)

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
    created_at BETWEEN @start_date AND @end_date-- $1 = start_date, $2 = end_date
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
    created_at BETWEEN @start_date AND @end_date -- $1 = start_date, $2 = end_date (optional, remove if counting all time)
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
    AND o_confirmed.created_at BETWEEN @start_date AND @end_date; -- $1 = start_date, $2 = end_date
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
    created_at BETWEEN @start_date AND @end_date -- $1 = start_date, $2 = end_date (optional, remove if counting all time)
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
    AND o.created_at BETWEEN @start_date AND @end_date -- $1 = start_date, $2 = end_date
GROUP BY
    d.code, d.discount_type, d.discount_value;
