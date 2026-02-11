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
