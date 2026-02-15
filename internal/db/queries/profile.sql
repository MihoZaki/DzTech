-- --- Profile & Password Management ---

-- name: UpdateUserFullName :one
-- Updates the user's full name.
UPDATE users
SET full_name = $1, updated_at = NOW()
WHERE id = $2
RETURNING id, email, full_name, is_admin, created_at, updated_at, deleted_at;

-- name: UpdateUserEmail :one
-- Updates the user's email address.
UPDATE users
SET email = $1, updated_at = NOW()
WHERE id = $2
RETURNING id, email, full_name, is_admin, created_at, updated_at, deleted_at;

-- name: UpdateUserPassword :one
-- Updates the user's hashed password.
UPDATE users
SET password_hash = $1, updated_at = NOW()
WHERE id = $2
RETURNING id, email, full_name, is_admin, created_at, updated_at, deleted_at;

-- --- Password Reset Tokens ---

-- name: CreatePasswordResetToken :exec
-- Inserts a new password reset token record.
INSERT INTO password_reset_tokens (user_id, token, expires_at)
VALUES ($1, $2, $3); -- $1=user_id, $2=token_string, $3=expiry_time

-- name: GetResetToken :one
-- Fetches a password reset token record by its token string.
SELECT id, user_id, token, expires_at, created_at
FROM password_reset_tokens
WHERE token = $1; -- $1=token_string

-- name: GetUserByResetToken :one
-- Fetches the user associated with a valid, non-expired reset token.
SELECT u.id, u.email, u.full_name, u.password_hash, u.is_admin, u.created_at, u.updated_at, u.deleted_at
FROM users u
JOIN password_reset_tokens prt ON u.id = prt.user_id
WHERE prt.token = $1 -- $1=token_string
  AND prt.expires_at > NOW(); -- Ensure token hasn't expired

-- name: DeletePasswordResetToken :exec
-- Deletes a specific password reset token record by its token string.
DELETE FROM password_reset_tokens
WHERE token = $1; -- $1=token_string

-- name: DeleteExpiredPasswordResetTokens :exec
-- Deletes all password reset tokens that have expired.
DELETE FROM password_reset_tokens
WHERE expires_at <= NOW();

