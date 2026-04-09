-- Migration to add updated_at column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for faster sorting by last update
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);
