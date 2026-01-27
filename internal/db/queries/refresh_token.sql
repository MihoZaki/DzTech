-- name: CreateRefreshToken :exec
-- Inserts a new refresh token identifier and its bcrypt hash into the database.
INSERT INTO refresh_tokens (
    user_id, token_identifier, token_hash, expires_at
) VALUES (
    sqlc.arg(user_id), sqlc.arg(token_identifier), sqlc.arg(token_hash), sqlc.arg(expires_at)
);

-- name: GetValidRefreshTokenRecord :one
-- Finds a valid (non-expired, non-revoked) refresh token record by its identifier.
-- The bcrypt hash verification happens in Go code.
SELECT id, user_id, token_identifier, token_hash, expires_at, revoked, created_at, updated_at
FROM refresh_tokens
WHERE token_identifier = sqlc.arg(token_identifier) -- Lookup by the unique identifier string
  AND expires_at > NOW() -- Ensure it hasn't expired
  AND revoked = FALSE; -- Ensure it hasn't been revoked

-- name: RevokeRefreshTokenByIdentifier :exec
-- Marks a specific refresh token as revoked using its identifier.
UPDATE refresh_tokens
SET revoked = TRUE, updated_at = NOW()
WHERE token_identifier = sqlc.arg(token_identifier);

-- name: RevokeRefreshTokensByUser :exec
-- Revokes all active refresh tokens for a specific user.
-- Useful for "logout all devices" or account compromise scenarios.
UPDATE refresh_tokens
SET revoked = TRUE, updated_at = NOW()
WHERE user_id = sqlc.arg(user_id) AND revoked = FALSE;

-- name: DeleteExpiredRefreshTokens :exec
-- Deletes refresh tokens that have expired and are not revoked.
-- This can be run periodically as a cleanup job if needed.
-- Note: Revoked tokens might be kept for audit purposes, so this only cleans up truly expired ones.
DELETE FROM refresh_tokens
WHERE expires_at <= NOW() AND revoked = FALSE;
