-- Email Verification System Migration
-- Adds email verification tracking and user verification status

BEGIN;

-- Add email_verified column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Create index on email_verified for quick queries
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Create email_verifications table
CREATE TABLE IF NOT EXISTS email_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure one unverified token per user
    CONSTRAINT unique_unverified_token UNIQUE (user_id, token)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);

-- Add comment
COMMENT ON TABLE email_verifications IS 'Tracks email verification tokens and status';
COMMENT ON COLUMN email_verifications.token IS 'Unique verification token sent via email';
COMMENT ON COLUMN email_verifications.expires_at IS 'Token expiration time (24 hours from creation)';

COMMIT;
