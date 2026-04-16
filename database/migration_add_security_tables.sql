-- Migration: Add Security Tables
-- Description: Creates missing security-related tables (login_attempts, token_blacklist, etc.)
-- Run this on your Render/Supabase database to fix 500 errors

-- ============================================
-- 1. Create login_attempts table
-- ============================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45) NOT NULL,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for login_attempts
CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at);

-- ============================================
-- 2. Create token_blacklist table
-- ============================================
CREATE TABLE IF NOT EXISTS token_blacklist (
  id SERIAL PRIMARY KEY,
  token_jti VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for token_blacklist
CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti ON token_blacklist(token_jti);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

-- ============================================
-- 3. Add account security columns to users table
-- ============================================
-- Add account_locked column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'account_locked'
  ) THEN
    ALTER TABLE users ADD COLUMN account_locked BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add lockout_until column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'lockout_until'
  ) THEN
    ALTER TABLE users ADD COLUMN lockout_until TIMESTAMP;
  END IF;
END $$;

-- Add last_failed_login column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_failed_login'
  ) THEN
    ALTER TABLE users ADD COLUMN last_failed_login TIMESTAMP;
  END IF;
END $$;

-- ============================================
-- 4. Create password_history table
-- ============================================
CREATE TABLE IF NOT EXISTS password_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created ON password_history(created_at);

-- ============================================
-- 5. Create security_events table
-- ============================================
CREATE TABLE IF NOT EXISTS security_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);

-- ============================================
-- 6. Create password_resets table
-- ============================================
CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);

-- ============================================
-- 7. Create email_verifications table
-- ============================================
CREATE TABLE IF NOT EXISTS email_verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);

-- ============================================
-- Migration Complete
-- ============================================
-- All security tables and columns have been created
-- Your login and authentication should now work properly
