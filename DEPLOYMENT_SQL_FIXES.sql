-- ============================================
-- DEPLOYMENT DATABASE FIXES FOR SUPABASE
-- Run these queries in Supabase SQL Editor in order
-- ============================================

-- 1. ENABLE POSTGIS EXTENSION (Required for Map functionality)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. FIX ACHIEVEMENTS TABLE STRUCTURE
-- Add requirement column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='achievements' AND column_name='requirement') THEN
        ALTER TABLE achievements ADD COLUMN requirement JSONB;
    END IF;
END $$;

-- 3. FIX NOTIFICATIONS TABLE STRUCTURE
-- Add missing columns for enhanced notifications
DO $$
BEGIN
    -- Create notifications table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'notifications') THEN
        CREATE TABLE notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            data JSONB DEFAULT '{}',
            trigger_time TIMESTAMP,
            is_triggered BOOLEAN DEFAULT FALSE,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            triggered_at TIMESTAMP
        );
        
        RAISE NOTICE 'Created notifications table';
    ELSE
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_name = 'notifications' AND column_name = 'is_triggered') THEN
            ALTER TABLE notifications ADD COLUMN is_triggered BOOLEAN DEFAULT FALSE;
            RAISE NOTICE 'Added is_triggered column';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_name = 'notifications' AND column_name = 'trigger_time') THEN
            ALTER TABLE notifications ADD COLUMN trigger_time TIMESTAMP;
            RAISE NOTICE 'Added trigger_time column';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_name = 'notifications' AND column_name = 'triggered_at') THEN
            ALTER TABLE notifications ADD COLUMN triggered_at TIMESTAMP;
            RAISE NOTICE 'Added triggered_at column';
        END IF;
    END IF;
END $$;

-- 4. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- 5. FIX TRAINING PLANS TABLE STRUCTURE
-- Add metadata column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_plans' AND column_name='metadata') THEN
        ALTER TABLE training_plans ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_plans' AND column_name='is_active') THEN
        ALTER TABLE training_plans ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- 6. INSERT DEFAULT ACHIEVEMENTS (if table is empty)
INSERT INTO achievements (name, description, icon, xp_reward, requirement) VALUES
('First Run', 'Complete your first run', 'running', 50, '{"runs": 1}'),
('5K Runner', 'Run 5 kilometers', 'target', 100, '{"distance": 5}'),
('10K Runner', 'Run 10 kilometers', 'trophy', 200, '{"distance": 10}'),
('Half Marathon', 'Run 21.1 kilometers', 'medal', 500, '{"distance": 21.1}'),
('Marathon', 'Run 42.2 kilometers', 'star', 1000, '{"distance": 42.2}'),
('Tile Captain', 'Capture 10 tiles', 'flag', 150, '{"tiles": 10}'),
('Territory King', 'Capture 50 tiles', 'crown', 500, '{"tiles": 50}'),
('Week Warrior', 'Maintain a 7-day streak', 'fire', 300, '{"streak": 7}'),
('Level Up', 'Reach level 5', 'arrow-up', 100, '{"level": 5}'),
('Speed Demon', 'Run under 5 min/km pace', 'zap', 250, '{"pace": 5}')
ON CONFLICT DO NOTHING;

-- 7. UPDATE USER TABLE STRUCTURE
-- Add missing columns for enhanced features
DO $$
BEGIN
    -- Fix column name case issues
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='totaldistance') THEN
        ALTER TABLE users RENAME COLUMN totaldistance TO total_distance;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='totaltiles') THEN
        ALTER TABLE users RENAME COLUMN totaltiles TO total_tiles;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='weeklymileage') THEN
        ALTER TABLE users RENAME COLUMN weeklymileage TO weekly_mileage;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='trainingplanid') THEN
        ALTER TABLE users RENAME COLUMN trainingplanid TO training_plan_id;
    END IF;
    
    -- Add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='territory_points') THEN
        ALTER TABLE users ADD COLUMN territory_points INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='total_territory_area') THEN
        ALTER TABLE users ADD COLUMN total_territory_area NUMERIC DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='territories_captured') THEN
        ALTER TABLE users ADD COLUMN territories_captured INTEGER DEFAULT 0;
    END IF;
END $$;

-- 8. CREATE USER_ACHIEVEMENTS TABLE IF NOT EXISTS
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_achievements') THEN
        CREATE TABLE user_achievements (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
            unlocked_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, achievement_id)
        );
        
        RAISE NOTICE 'Created user_achievements table';
    END IF;
END $$;

-- 9. CREATE INDEXES FOR USER_ACHIEVEMENTS
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);

-- 10. VERIFY TABLE STRUCTURES
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('users', 'achievements', 'notifications', 'training_plans', 'user_achievements')
ORDER BY table_name, ordinal_position;

-- 11. TEST DATA INTEGRITY
SELECT 
    'users' as table_name, 
    COUNT(*) as row_count 
FROM users
UNION ALL
SELECT 
    'achievements' as table_name, 
    COUNT(*) as row_count 
FROM achievements
UNION ALL
SELECT 
    'notifications' as table_name, 
    COUNT(*) as row_count 
FROM notifications
UNION ALL
SELECT 
    'training_plans' as table_name, 
    COUNT(*) as row_count 
FROM training_plans
UNION ALL
SELECT 
    'user_achievements' as table_name, 
    COUNT(*) as row_count 
FROM user_achievements;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
-- After running these queries, your database should be ready for deployment.
-- Check for any ERROR messages in the output and address them individually.
