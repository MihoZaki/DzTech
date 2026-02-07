-- name: CreateReview :one
-- Inserts a new review and returns its details.
-- NOTE: This query alone does not update the product's avg_rating/num_ratings.
INSERT INTO reviews (
    user_id, product_id, rating
) VALUES (
    $1, $2, $3
)
RETURNING id, user_id, product_id, rating, created_at, updated_at;

-- name: GetReviewByUserAndProduct :one
-- Retrieves a review by a specific user for a specific product.
SELECT id, user_id, product_id, rating, created_at, updated_at
FROM reviews
WHERE user_id = $1 AND product_id = $2 AND deleted_at IS NULL;

-- name: GetReviewByIDAndUser :one
-- Retrieves a specific review by its ID and verifies the user owns it.
SELECT id, user_id, product_id, rating, created_at, updated_at
FROM reviews
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: GetReviewsByProductID :many
-- Retrieves all reviews for a specific product, including the reviewer's name, potentially paginated.
SELECT 
    r.id,
    r.user_id,
    r.product_id,
    r.rating,
    r.created_at,
    r.updated_at,
    u.full_name AS reviewer_name 
FROM reviews r
JOIN users u ON r.user_id = u.id -- INNER JOIN to link review to user
WHERE r.product_id = sqlc.arg(product_id) AND r.deleted_at IS NULL
ORDER BY r.created_at DESC -- Or rating DESC, etc.
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);


-- name: GetReviewsByUserID :many
-- Retrieves all reviews submitted by a specific user, including the product name, potentially paginated.
SELECT 
    r.id,
    r.user_id,
    r.product_id,
    r.rating,
    r.created_at,
    r.updated_at,
    p.name AS product_name -- Join with products table to get the name
FROM reviews r
JOIN products p ON r.product_id = p.id -- INNER JOIN to link review to product
WHERE r.user_id = sqlc.arg(user_id) AND r.deleted_at IS NULL
ORDER BY r.created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: UpdateReview :one
-- Updates the rating of an existing review.
-- NOTE: This query alone does not update the product's avg_rating/num_ratings.
UPDATE reviews
SET rating = $1, updated_at = NOW()
WHERE id = $2 AND user_id = $3 -- Ensure user owns the review
RETURNING id, user_id, product_id, rating, created_at, updated_at;

-- name: DeleteReview :one
-- Soft deletes a review by setting deleted_at.
-- NOTE: This query alone does not update the product's avg_rating/num_ratings.
UPDATE reviews
SET deleted_at = NOW(), updated_at = NOW()
WHERE id = $1 AND user_id = $2 -- Ensure user owns the review
RETURNING id, user_id, product_id, rating, created_at, updated_at;

-- name: CalculateReviewStatsForProduct :one
-- Calculates the average rating and count of non-deleted reviews for a specific product.
-- Used to update the products table.
SELECT
    AVG(r.rating)::NUMERIC(3,2) AS avg_rating,
    COUNT(r.rating)::INTEGER AS num_ratings
FROM reviews r
WHERE r.product_id = sqlc.arg(product_id) AND r.deleted_at IS NULL;

-- name: UpdateProductReviewStats :exec
-- Updates the avg_rating and num_ratings fields in the products table for a specific product.
UPDATE products
SET
    avg_rating = sqlc.arg(avg_rating),
    num_ratings = sqlc.arg(num_ratings),
    updated_at = NOW() -- Optionally update the product's general updated_at too
WHERE id = sqlc.arg(product_id);
