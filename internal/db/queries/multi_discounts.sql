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
