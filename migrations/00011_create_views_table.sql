-- +goose Up
-- +goose StatementBegin
CREATE VIEW v_products_with_current_discounts AS
SELECT
    p.id,
    p.category_id,
    p.name,
    p.price_cents AS original_price_cents,
    -- ... other product fields ...
    CASE
        WHEN pd.discount_id IS NOT NULL THEN
            CASE
                WHEN d.discount_type = 'percentage' THEN (p.price_cents * (100 - d.discount_value) / 100)::BIGINT
                ELSE (p.price_cents - d.discount_value)::BIGINT
            END
        ELSE p.price_cents
    END::BIGINT AS discounted_price_cents,
    d.code AS discount_code,
    -- ... other discount fields ...
    p.avg_rating, -- Include review stats if calculated separately
    p.num_ratings
FROM products p
LEFT JOIN product_discounts pd ON p.id = pd.product_id
LEFT JOIN discounts d ON pd.discount_id = d.id AND d.is_active = TRUE AND NOW() BETWEEN d.valid_from AND d.valid_until;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP VIEW IF EXISTS v_products_with_current_discounts ;
-- +goose StatementEnd
