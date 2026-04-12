-- Add profile_picture column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255) DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_profile_picture ON users(profile_picture);
