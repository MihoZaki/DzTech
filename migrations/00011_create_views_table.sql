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
