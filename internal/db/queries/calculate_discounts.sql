-- name: GetProductWithDiscountInfo :one
SELECT
    p.id,
    p.category_id,
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
    COALESCE(vpcd.calculated_discounted_price_cents, p.price_cents)::BIGINT AS discounted_price_cents,
    -- Use the has_active_discount boolean directly from the view
    COALESCE(vpcd.has_active_discount, FALSE) AS has_active_discount
FROM
    products p
LEFT JOIN
    v_products_with_calculated_discounts vpcd ON p.id = vpcd.product_id
WHERE
    p.slug = $1 AND p.deleted_at IS NULL;

-- name: GetProductsWithDiscountInfo :many
SELECT
    p.id,
    p.category_id,
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
    COALESCE(vpcd.calculated_discounted_price_cents, p.price_cents)::BIGINT  AS discounted_price_cents,
    -- Use the has_active_discount boolean directly from the view
    COALESCE(vpcd.has_active_discount, FALSE) AS has_active_discount
FROM
    products p
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
    COALESCE(vpcd.calculated_discounted_price_cents, p.price_cents)::BIGINT AS final_price_cents, -- This is the price *per unit* after discount
    -- Use the has_active_discount boolean directly from the view
    COALESCE(vpcd.has_active_discount, FALSE) AS has_active_discount,
    -- Include the breakdown fields for potential use in the cart context
    vpcd.total_fixed_discount_cents::BIGINT,
    vpcd.combined_percentage_factor::FLOAT
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
