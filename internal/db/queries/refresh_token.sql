-- name: CreateRefreshToken :exec
INSERT INTO refresh_tokens (jti, user_id, token_hash, expires_at)
VALUES (@jti::text, @user_id::uuid, @token_hash::char(64), @expires_at::timestamptz);

-- name: GetValidRefreshTokenRecord :one
SELECT id, jti, user_id, token_hash, expires_at, revoked_at, created_at, updated_at
FROM refresh_tokens
WHERE jti = @jti::text AND expires_at > NOW() AND revoked_at IS NULL;

-- name: RevokeRefreshTokenByJTI :exec
UPDATE refresh_tokens SET revoked_at = NOW(), updated_at = NOW() WHERE jti = @jti::text;

-- name: CleanupExpiredRefreshTokens :exec
DELETE FROM refresh_tokens WHERE expires_at < NOW() AND revoked_at IS NULL;

-- name: RevokeAllRefreshTokensByUserID :exec
-- Revokes all refresh tokens for a specific user.
UPDATE refresh_tokens
SET revoked_at = NOW(), updated_at = NOW()
WHERE user_id = @user_id::uuid AND revoked_at IS NULL; -- Only revoke non-already-revoked tokens
