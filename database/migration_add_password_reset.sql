-- Password Reset System Migration
-- Adds secure password reset token tracking

BEGIN;

-- Create password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,  -- Hashed token for security
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_used ON password_resets(used);

-- Add comments
COMMENT ON TABLE password_resets IS 'Tracks password reset tokens (hashed for security)';
COMMENT ON COLUMN password_resets.token_hash IS 'SHA-256 hash of the reset token';
COMMENT ON COLUMN password_resets.expires_at IS 'Token expiration time (1 hour from creation)';
COMMENT ON COLUMN password_resets.used IS 'Whether token has been used (one-time use)';

COMMIT;
