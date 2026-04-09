-- Fix AI Coach Service - Add Missing Columns to Users Table
-- This adds the columns that aiCoachService.js expects

BEGIN;

-- Add best_5k_time column (in seconds)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS best_5k_time INTEGER;

-- Add best_10k_time column (in seconds)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS best_10k_time INTEGER;

-- Add best_half_marathon_time column (in seconds)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS best_half_marathon_time INTEGER;

-- Add best_marathon_time column (in seconds)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS best_marathon_time INTEGER;

-- Add fitness_level column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS fitness_level VARCHAR(50) DEFAULT 'beginner';

-- Add weekly_goal_distance column (in meters)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS weekly_goal_distance INTEGER DEFAULT 20000;

-- Add preferred_run_time column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS preferred_run_time VARCHAR(50);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_fitness_level ON users(fitness_level);

-- Add comments
COMMENT ON COLUMN users.best_5k_time IS 'Best 5K time in seconds';
COMMENT ON COLUMN users.best_10k_time IS 'Best 10K time in seconds';
COMMENT ON COLUMN users.best_half_marathon_time IS 'Best half marathon time in seconds';
COMMENT ON COLUMN users.best_marathon_time IS 'Best marathon time in seconds';
COMMENT ON COLUMN users.fitness_level IS 'User fitness level: beginner, intermediate, advanced';
COMMENT ON COLUMN users.weekly_goal_distance IS 'Weekly distance goal in meters';
COMMENT ON COLUMN users.preferred_run_time IS 'Preferred running time: morning, afternoon, evening';

COMMIT;
