-- name: GetProduct :one
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE id = $1 AND deleted_at IS NULL;

-- name: GetProductBySlug :one
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE slug = $1 AND deleted_at IS NULL;

-- name: ListProducts :many
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListProductsByCategory :many
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE category_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: SearchProducts :many
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE deleted_at IS NULL
  AND ($1::TEXT = '' OR to_tsvector('english', name || ' ' || COALESCE(short_description, '')) @@ plainto_tsquery('english', $1))
  AND ($2::UUID IS NULL OR category_id = $2)
  AND ($3::TEXT = '' OR brand ILIKE '%' || $3 || '%')
  AND ($4::BIGINT IS NULL OR price_cents >= $4)
  AND ($5::BIGINT IS NULL OR price_cents <= $5)
  AND ($6::BOOLEAN IS NULL OR ($6 = true AND stock_quantity > 0) OR ($6 = false))
ORDER BY created_at DESC
LIMIT $7 OFFSET $8;

-- name: CreateProduct :one
INSERT INTO products (
    category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
) RETURNING id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at, deleted_at;

-- name: UpdateProduct :one
UPDATE products
SET
    category_id = COALESCE($2, category_id),
    name = COALESCE($3, name),
    slug = COALESCE($4, slug),
    description = COALESCE($5, description),
    short_description = COALESCE($6, short_description),
    price_cents = COALESCE($7, price_cents),
    stock_quantity = COALESCE($8, stock_quantity),
    status = COALESCE($9, status),
    brand = COALESCE($10, brand),
    image_urls = COALESCE($11, image_urls),
    spec_highlights = COALESCE($12, spec_highlights),
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at, deleted_at;

-- name: DeleteProduct :exec
UPDATE products
SET deleted_at = NOW()
WHERE id = $1;

-- name: GetCategory :one
SELECT id, name, slug, type, parent_id, created_at
FROM categories
WHERE id = $1;

-- name: GetCategoryBySlug :one
SELECT id, name, slug, type, parent_id, created_at
FROM categories
WHERE slug = $1;

-- name: ListCategories :many
SELECT id, name, slug, type, parent_id, created_at
FROM categories
ORDER BY name;

-- name: CountProducts :one
SELECT COUNT(*) FROM products WHERE deleted_at IS NULL
  AND ($1::TEXT = '' OR to_tsvector('english', name || ' ' || COALESCE(short_description, '')) @@ plainto_tsquery('english', $1))
  AND ($2::UUID IS NULL OR category_id = $2)
  AND ($3::TEXT = '' OR brand ILIKE '%' || $3 || '%')
  AND ($4::BIGINT IS NULL OR price_cents >= $4)
  AND ($5::BIGINT IS NULL OR price_cents <= $5)
  AND ($6::BOOLEAN IS NULL OR ($6 = true AND stock_quantity > 0) OR ($6 = false));

-- name: CountAllProducts :one
SELECT COUNT(*) FROM products WHERE deleted_at IS NULL;
