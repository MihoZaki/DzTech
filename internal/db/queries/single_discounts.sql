-- name: GetProductsWithDiscountInfo :many
-- Fetches products with their original price and potential discounted price and code if an active discount applies.
-- Includes full product details.
SELECT
    p.id,
    p.category_id,
    p.name,
    p.slug,
    p.description,
    p.short_description,
    p.price_cents AS original_price_cents,
    p.stock_quantity,
    p.avg_rating,
    p.num_ratings,
    p.status,
    p.brand,
    p.image_urls,
    p.spec_highlights,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    CASE
        WHEN pd.discount_id IS NOT NULL THEN -- Check if discount applies
            CASE
                WHEN d.discount_type = 'percentage' THEN (p.price_cents * (100 - d.discount_value) / 100)::BIGINT
                ELSE (p.price_cents - d.discount_value)::BIGINT
            END
        ELSE p.price_cents -- No discount, use original price
    END::BIGINT AS discounted_price_cents,
    d.code AS discount_code, -- Select directly from 'd'. Will be NULL if LEFT JOIN fails.
    d.discount_type AS discount_type, -- Select directly from 'd'. Will be NULL if LEFT JOIN fails.
    d.discount_value AS discount_value, -- Select directly from 'd'. Will be NULL if LEFT JOIN fails.
    pd.discount_id IS NOT NULL::Boolean AS has_active_discount -- Check if join matched
FROM
    products p
LEFT JOIN
    product_discounts pd ON p.id = pd.product_id
LEFT JOIN
    discounts d ON pd.discount_id = d.id AND d.is_active = TRUE AND NOW() BETWEEN d.valid_from AND d.valid_until
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);
-- name: GetProductWithDiscountInfo :one
-- Fetches a specific product with its original price and potential discounted price and code if an active discount applies.
-- Includes full product details.
SELECT
    p.id,
    p.category_id,
    p.name,
    p.slug,
    p.description,
    p.short_description,
    p.price_cents AS original_price_cents,
    p.stock_quantity,
    p.avg_rating,
    p.num_ratings,
    p.status,
    p.brand,
    p.image_urls,
    p.spec_highlights,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    CASE
        WHEN pd.discount_id IS NOT NULL THEN
            CASE
                WHEN d.discount_type = 'percentage' THEN (p.price_cents * (100 - d.discount_value) / 100)::BIGINT
                ELSE (p.price_cents - d.discount_value)::BIGINT
            END
        ELSE p.price_cents
    END::BIGINT AS discounted_price_cents,
    d.code AS discount_code,
    d.discount_type AS discount_type,
    d.discount_value AS discount_value,
    pd.discount_id IS NOT NULL::Boolean AS has_active_discount
FROM
    products p
LEFT JOIN
    product_discounts pd ON p.id = pd.product_id
LEFT JOIN
    discounts d ON pd.discount_id = d.id AND d.is_active = TRUE AND NOW() BETWEEN d.valid_from AND d.valid_until
WHERE
    p.id = $1 AND p.deleted_at IS NULL;
-- name: GetCartWithItemsAndProductsWithDiscounts :many
-- Fetches a cart's items along with product details and potential discounted prices for active discounts.
-- Includes full product details.
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
    p.id as product_id, -- Include product ID explicitly again if needed by the struct
    p.category_id as product_category_id,
    p.name as product_name,
    p.slug as product_slug,
    p.description as product_description,
    p.short_description as product_short_description,
    p.price_cents as product_original_price_cents, -- Original price from product table
    p.stock_quantity as product_stock_quantity,
    p.status as product_status,
    p.brand as product_brand,
    p.image_urls as product_image_urls,
    p.spec_highlights as product_spec_highlights,
    p.created_at as product_created_at,
    p.updated_at as product_updated_at,
    p.deleted_at as product_deleted_at,
    -- Calculate discounted price inline using JOIN and CASE
COALESCE(
    CASE
        WHEN pd.discount_id IS NOT NULL THEN
            CASE
                WHEN d.discount_type = 'percentage' THEN (COALESCE(p.price_cents, 0) * (100 - d.discount_value) / 100)::BIGINT -- Protect against p.price_cents being NULL
                ELSE (COALESCE(p.price_cents, 0) - d.discount_value)::BIGINT -- Protect against p.price_cents being NULL
            END
        ELSE COALESCE(p.price_cents, 0) -- Use original price if no discount applies, protect against NULL
    END,
    0 -- Ultimate fallback if the CASE somehow results in NULL (shouldn't happen now)
)::BIGINT AS product_discounted_price_cents,
   -- Include discount details if applicable (will be NULL if no discount)
    d.code AS discount_code,
    d.discount_type AS discount_type,
    d.discount_value AS discount_value,
    pd.discount_id IS NOT NULL::Boolean AS product_has_active_discount -- Boolean indicating if discount applied
FROM carts c
LEFT JOIN cart_items ci ON c.id = ci.cart_id
LEFT JOIN products p ON ci.product_id = p.id
-- Join with product_discounts and discounts to find applicable active discounts
LEFT JOIN product_discounts pd ON p.id = pd.product_id
LEFT JOIN discounts d ON pd.discount_id = d.id AND d.is_active = TRUE AND NOW() BETWEEN d.valid_from AND d.valid_until
WHERE c.id = $1 -- Use positional argument
    AND ci.deleted_at IS NULL
    AND (p.deleted_at IS NULL OR p.id IS NULL) -- Include cart items even if product was deleted
ORDER BY ci.created_at DESC;
 
-- name: GetProductWithDiscountInfoBySlug :one
-- Fetches a specific product by its slug with potential discount info.
SELECT
    p.id,
    p.category_id,
    p.name,
    p.slug,
    p.description,
    p.short_description,
    p.price_cents AS original_price_cents,
    p.stock_quantity,
    p.avg_rating,
    p.num_ratings,
    p.status,
    p.brand,
    p.image_urls,
    p.spec_highlights,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    CASE
        WHEN pd.discount_id IS NOT NULL THEN
            CASE
                WHEN d.discount_type = 'percentage' THEN (p.price_cents * (100 - d.discount_value) / 100)::BIGINT
                ELSE (p.price_cents - d.discount_value)::BIGINT
            END
        ELSE p.price_cents
    END::BIGINT AS discounted_price_cents,
    d.code AS discount_code,
    d.discount_type AS discount_type,
    d.discount_value AS discount_value,
    pd.discount_id IS NOT NULL::Boolean AS has_active_discount
FROM products p
LEFT JOIN product_discounts pd ON p.id = pd.product_id
LEFT JOIN discounts d ON pd.discount_id = d.id AND d.is_active = TRUE AND NOW() BETWEEN d.valid_from AND d.valid_until
WHERE p.slug = $1 AND p.deleted_at IS NULL;
