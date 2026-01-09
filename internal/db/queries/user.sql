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
