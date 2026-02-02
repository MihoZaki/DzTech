-- name: GetUserByEmail :one
SELECT id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at
FROM users
WHERE email = $1 AND deleted_at IS NULL;

-- name: CreateUser :one
INSERT INTO users (
    email, password_hash, full_name, is_admin, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at;

-- name: GetUser :one
SELECT id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at
FROM users
WHERE id = $1 AND deleted_at IS NULL;

-- name: ListUsers :many
-- Lists users, optionally filtered by active status (soft-deleted).
-- Paginated using LIMIT and OFFSET.
SELECT id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at
FROM users
WHERE 
  -- Filter by active status (NULL means active, NOT NULL means soft-deleted/inactive)
  CASE 
    WHEN @active_only::boolean THEN deleted_at IS NULL 
    WHEN NOT @active_only::boolean THEN TRUE -- Include both active and inactive
    ELSE TRUE -- Default if active_only is NULL (list all)
  END
ORDER BY created_at DESC -- Or another relevant order
LIMIT @page_limit::int4 OFFSET @page_offset::int4;

-- name: CountUsers :one
-- Counts total users, optionally filtered by active status (soft-deleted).
-- Useful for pagination metadata.
SELECT COUNT(*) AS total_users
FROM users
WHERE 
  -- Filter by active status (NULL means active, NOT NULL means soft-deleted/inactive)
  CASE 
    WHEN @active_only::boolean THEN deleted_at IS NULL 
    WHEN NOT @active_only::boolean THEN TRUE -- Include both active and inactive
    ELSE TRUE -- Default if active_only is NULL (count all)
  END;

-- name: SearchUsers :many
-- Searches users by email or full_name, optionally filtered by active status.
-- Paginated using LIMIT and OFFSET.
SELECT id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at
FROM users
WHERE 
  (LOWER(email) LIKE LOWER(@search_term::text || '%') OR LOWER(full_name) LIKE LOWER(@search_term::text || '%'))
  AND
  -- Filter by active status (NULL means active, NOT NULL means soft-deleted/inactive)
  CASE 
    WHEN @active_only::boolean THEN deleted_at IS NULL 
    WHEN NOT @active_only::boolean THEN TRUE -- Include both active and inactive
    ELSE TRUE -- Default if active_only is NULL (list all matching)
  END
ORDER BY created_at DESC -- Or relevance if using full-text search
LIMIT @page_limit::int4 OFFSET @page_offset::int4;

-- name: CountSearchUsers :one
-- Counts users matching the search term, optionally filtered by active status.
-- Useful for pagination metadata with search.
SELECT COUNT(*) AS total_matching_users
FROM users
WHERE 
  (LOWER(email) LIKE LOWER(@search_term::text || '%') OR LOWER(full_name) LIKE LOWER(@search_term::text || '%'))
  AND
  -- Filter by active status (NULL means active, NOT NULL means soft-deleted/inactive)
  CASE 
    WHEN @active_only::boolean THEN deleted_at IS NULL 
    WHEN NOT @active_only::boolean THEN TRUE -- Include both active and inactive
    ELSE TRUE -- Default if active_only is NULL (count all matching)
  END;

-- name: AdminGetUser :one
-- Gets a specific user by ID, regardless of soft-delete status.
-- Useful for admin to see any user, active or inactive.
SELECT id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at
FROM users
WHERE id = @user_id::uuid;

-- name: GetUserWithDetails :one
-- Fetches a specific user by ID along with order count and last order date.
-- Joins with the orders table to get aggregated details.
-- Includes soft-deleted users as well.
SELECT 
    u.id, 
    u.email, 
    u.full_name, 
    u.created_at AS registration_date, -- User registration date
    u.deleted_at, -- Needed to determine activity status
    COUNT(o.id) AS total_order_count,
    MAX(o.created_at) AS last_order_date -- Get the latest order date
FROM 
    users u
LEFT JOIN 
    orders o ON u.id = o.user_id
WHERE 
    u.id = @user_id::uuid
GROUP BY 
    u.id;

-- name: ListUsersWithOrderCounts :many
-- Lists users with their total order counts.
-- Optionally filter by active status.
-- Paginated using LIMIT and OFFSET.
SELECT 
    u.id, 
    u.email, 
    u.full_name, 
    u.is_admin, 
    u.created_at, 
    u.updated_at, 
    u.deleted_at,
    COUNT(o.id) AS total_order_count
FROM 
    users u
LEFT JOIN 
    orders o ON u.id = o.user_id
WHERE 
  CASE 
    WHEN @active_only::boolean THEN u.deleted_at IS NULL 
    WHEN NOT @active_only::boolean THEN TRUE 
    ELSE TRUE 
  END
GROUP BY 
    u.id
ORDER BY 
    u.created_at DESC -- Or another relevant order
LIMIT @page_limit::int4 OFFSET @page_offset::int4;

-- name: ListUsersWithListDetails :many
-- Lists users with essential details for admin list view (name, email, registration date, last order date, order count, status).
-- Optionally filter by active status.
-- Paginated using LIMIT and OFFSET.
SELECT
    u.id,
    u.email,
    u.full_name,
    u.created_at AS registration_date, -- User's registration date
    MAX(o.created_at) AS last_order_date, -- Latest order date for the user (will be NULL if no orders)
    COUNT(o.id) AS total_order_count,
    u.deleted_at -- Needed for determining activity status
FROM
    users u
LEFT JOIN
    orders o ON u.id = o.user_id
WHERE
  CASE
    WHEN @active_only::boolean THEN u.deleted_at IS NULL
    WHEN NOT @active_only::boolean THEN TRUE
    ELSE TRUE
  END
GROUP BY
    u.id
ORDER BY
    u.created_at DESC -- Or another relevant order
LIMIT @page_limit::int4 OFFSET @page_offset::int4;

-- name: SoftDeleteUser :exec
-- Marks a user as soft-deleted by setting deleted_at to NOW().
UPDATE users
SET deleted_at = NOW(), updated_at = NOW()
WHERE id = @user_id::uuid;

-- name: ActivateUser :exec
-- Removes the soft-delete marker by setting deleted_at to NULL.
UPDATE users
SET deleted_at = NULL, updated_at = NOW()
WHERE id = @user_id::uuid;
