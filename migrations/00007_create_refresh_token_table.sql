-- +goose Up
-- Refresh Tokens Table
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    jti VARCHAR(255) UNIQUE NOT NULL,      -- Unique JWT ID from the token
    user_id UUID NOT NULL,                 -- Reference to the user
    token_hash CHAR(64) NOT NULL,          -- Hash of the *entire signed refresh token string* (SHA-256 produces 64 hex chars)
    expires_at TIMESTAMPTZ NOT NULL,       -- Expiration time
    revoked_at TIMESTAMPTZ DEFAULT NULL,   -- Track revocation (e.g., on logout)
    created_at TIMESTAMPTZ DEFAULT NOW(),  -- When it was issued
    updated_at TIMESTAMPTZ DEFAULT NOW()   -- When it was last updated
);

-- Indexes
CREATE INDEX idx_refresh_tokens_jti ON refresh_tokens(jti);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at);
CREATE INDEX idx_refresh_tokens_active_lookup ON refresh_tokens(jti, expires_at, revoked_at);

ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
-- +goose Down
DROP TABLE IF EXISTS refresh_token;
