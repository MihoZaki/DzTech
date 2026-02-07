-- name: GetProduct :one
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE id = sqlc.arg(product_id) AND deleted_at IS NULL;

-- name: GetProductBySlug :one
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE slug = sqlc.arg(slug) AND deleted_at IS NULL;

-- name: CheckSlugExists :one
-- Checks if a product slug already exists (excluding soft-deleted products).
SELECT EXISTS(SELECT 1 FROM products WHERE slug = $1 AND deleted_at IS NULL) AS exists;

-- name: ListProducts :many
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListProductsWithCategory :many
SELECT 
    sqlc.embed(p),
    c.name as category_name,
    c.slug as category_slug,
    c.type as category_type
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListProductsByCategory :many
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE category_id = sqlc.arg(category_id) AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListProductsWithCategoryDetail :many
SELECT 
    sqlc.embed(p),
    sqlc.embed(c)
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.category_id = sqlc.arg(category_id) AND p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: SearchProducts :many
SELECT id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at
FROM products
WHERE deleted_at IS NULL
  AND (sqlc.arg(query)::TEXT = '' OR name ILIKE '%' || sqlc.arg(query) || '%' OR COALESCE(short_description, '') ILIKE '%' || sqlc.arg(query) || '%' OR to_tsvector('english', name || ' ' || COALESCE(short_description, '')) @@ plainto_tsquery('english', sqlc.arg(query)))
  AND (sqlc.arg(category_id)::UUID = '00000000-0000-0000-0000-000000000000' OR category_id = sqlc.arg(category_id))
  AND (sqlc.arg(brand)::TEXT = '' OR brand ILIKE '%' || sqlc.arg(brand) || '%')
  AND (sqlc.arg(min_price)::BIGINT = 0 OR price_cents >= sqlc.arg(min_price))
  AND (sqlc.arg(max_price)::BIGINT = 0 OR price_cents <= sqlc.arg(max_price))
  AND ((sqlc.arg(in_stock_only)::BOOLEAN = false AND sqlc.arg(in_stock_only) IS NOT NULL) OR (sqlc.arg(in_stock_only) = true AND stock_quantity > 0) OR (sqlc.arg(in_stock_only) = false AND stock_quantity <= 0))
ORDER BY created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: SearchProductsWithCategory :many
SELECT 
    sqlc.embed(p),
    c.name as category_name,
    c.slug as category_slug,
    c.type as category_type
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.deleted_at IS NULL
  AND (sqlc.arg(query)::TEXT = '' OR p.name ILIKE '%' || sqlc.arg(query) || '%' OR COALESCE(p.short_description, '') ILIKE '%' || sqlc.arg(query) || '%' OR to_tsvector('english', p.name || ' ' || COALESCE(p.short_description, '')) @@ plainto_tsquery('english', sqlc.arg(query)))
  AND (sqlc.arg(category_id)::UUID = '00000000-0000-0000-0000-000000000000' OR p.category_id = sqlc.arg(category_id))
  AND (sqlc.arg(brand)::TEXT = '' OR p.brand ILIKE '%' || sqlc.arg(brand) || '%')
  AND (sqlc.arg(min_price)::BIGINT = 0 OR p.price_cents >= sqlc.arg(min_price))
  AND (sqlc.arg(max_price)::BIGINT = 0 OR p.price_cents <= sqlc.arg(max_price))
  AND ((sqlc.arg(in_stock_only)::BOOLEAN = false AND sqlc.arg(in_stock_only) IS NOT NULL) OR (sqlc.arg(in_stock_only) = true AND p.stock_quantity > 0) OR (sqlc.arg(in_stock_only) = false AND p.stock_quantity <= 0))
ORDER BY p.created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);


-- name: CreateProduct :one
INSERT INTO products (
    category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
) VALUES (
    sqlc.arg(category_id), 
    sqlc.arg(name), 
    sqlc.arg(slug), 
    sqlc.arg(description), 
    sqlc.arg(short_description), 
    sqlc.arg(price_cents), 
    sqlc.arg(stock_quantity), 
    sqlc.arg(status), 
    sqlc.arg(brand), 
    sqlc.arg(image_urls), 
    sqlc.arg(spec_highlights), 
    NOW(), -- created_at
    NOW()  -- updated_at
) 
RETURNING  id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at;

-- name: UpdateProduct :one
UPDATE products
SET
    category_id = COALESCE(sqlc.arg(category_id), category_id),
    name = COALESCE(sqlc.arg(name), name),
    slug = COALESCE(sqlc.arg(slug), slug),
    description = COALESCE(sqlc.arg(description), description),
    short_description = COALESCE(sqlc.arg(short_description), short_description),
    price_cents = COALESCE(sqlc.arg(price_cents), price_cents),
    stock_quantity = COALESCE(sqlc.arg(stock_quantity), stock_quantity),
    status = COALESCE(sqlc.arg(status), status),
    brand = COALESCE(sqlc.arg(brand), brand),
    image_urls = COALESCE(sqlc.arg(image_urls), image_urls),
    spec_highlights = COALESCE(sqlc.arg(spec_highlights), spec_highlights),
    updated_at = NOW()
WHERE id = sqlc.arg(product_id) AND deleted_at IS NULL
RETURNING  id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, 
    avg_rating, num_ratings,image_urls, spec_highlights, created_at, updated_at, deleted_at;

-- name: DeleteProduct :exec
UPDATE products
SET deleted_at = NOW()
WHERE id = sqlc.arg(product_id);

-- name: GetCategory :one
SELECT id, name, slug, type, parent_id, created_at
FROM categories
WHERE id = sqlc.arg(category_id);

-- name: GetCategoryBySlug :one
SELECT id, name, slug, type, parent_id, created_at
FROM categories
WHERE slug = sqlc.arg(slug);

-- name: ListCategories :many
SELECT id, name, slug, type, parent_id, created_at
FROM categories
ORDER BY name;

-- name: CountProducts :one
SELECT COUNT(*) FROM products WHERE deleted_at IS NULL
  AND (sqlc.arg(query)::TEXT = '' OR name ILIKE '%' || sqlc.arg(query) || '%' OR COALESCE(short_description, '') ILIKE '%' || sqlc.arg(query) || '%' OR to_tsvector('english', name || ' ' || COALESCE(short_description, '')) @@ plainto_tsquery('english', sqlc.arg(query)))
  AND (sqlc.arg(category_id)::UUID = '00000000-0000-0000-0000-000000000000' OR category_id = sqlc.arg(category_id))
  AND (sqlc.arg(brand)::TEXT = '' OR brand ILIKE '%' || sqlc.arg(brand) || '%')
  AND (sqlc.arg(min_price)::BIGINT = 0 OR price_cents >= sqlc.arg(min_price))
  AND (sqlc.arg(max_price)::BIGINT = 0 OR price_cents <= sqlc.arg(max_price))
  AND ((sqlc.arg(in_stock_only)::BOOLEAN = false AND sqlc.arg(in_stock_only) IS NOT NULL) OR (sqlc.arg(in_stock_only) = true AND stock_quantity > 0) OR (sqlc.arg(in_stock_only) = false AND stock_quantity <= 0));

-- name: CountAllProducts :one
SELECT COUNT(*) FROM products WHERE deleted_at IS NULL;
