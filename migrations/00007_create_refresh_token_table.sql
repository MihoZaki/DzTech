-- +goose Up
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Link to the user
    token_identifier TEXT NOT NULL UNIQUE, -- Store the base64-encoded token string for lookup
    token_hash TEXT NOT NULL, -- Store the bcrypt hash of the token string for verification
    expires_at TIMESTAMPTZ NOT NULL, -- When the refresh token expires
    revoked BOOLEAN DEFAULT FALSE, -- Flag to mark as revoked (logout)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookup by token identifier (critical for refresh/validation)
CREATE INDEX idx_refresh_tokens_token_identifier ON refresh_tokens(token_identifier);

-- Index for efficient cleanup of expired tokens (if you implement a cleanup job)
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at) WHERE NOT revoked;

-- Index for finding tokens by user (if needed for user-specific actions like mass logout)
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- +goose Down
DROP TABLE IF EXISTS refresh_token;
