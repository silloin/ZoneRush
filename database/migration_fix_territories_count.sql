-- ============================================
-- FIX TERRITORIES_CAPTURED COUNT
-- ============================================
-- This migration initializes and syncs the territories_captured column
-- in the users table with actual territory data

-- Step 1: Ensure the column exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS territories_captured INTEGER DEFAULT 0;

-- Step 2: Initialize territories_captured from existing territories table
-- Count how many territories each user currently owns
UPDATE users u
SET territories_captured = subq.territory_count
FROM (
    SELECT user_id, COUNT(*) as territory_count
    FROM territories
    WHERE is_stolen = FALSE OR is_stolen IS NULL
    GROUP BY user_id
) subq
WHERE u.id = subq.user_id;

-- Step 3: Verify the update
SELECT 
    u.id,
    u.username,
    u.territories_captured,
    u.territory_points,
    u.total_territory_area,
    (SELECT COUNT(*) FROM territories t WHERE t.user_id = u.id) as actual_territories
FROM users u
WHERE u.territories_captured > 0
ORDER BY u.territories_captured DESC;

-- Step 4: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_territories_captured ON users(territories_captured DESC);
