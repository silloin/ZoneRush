-- ============================================
-- MIGRATION: Add Advanced Features
-- Run this to upgrade your existing database
-- ============================================

-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================
-- ADD NEW COLUMNS TO EXISTING TABLES
-- ============================================

-- Enhance users table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='level') THEN
        ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='total_xp') THEN
        ALTER TABLE users ADD COLUMN total_xp INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='fitness_level') THEN
        ALTER TABLE users ADD COLUMN fitness_level VARCHAR(20) DEFAULT 'beginner';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bio') THEN
        ALTER TABLE users ADD COLUMN bio TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_active') THEN
        ALTER TABLE users ADD COLUMN last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Enhance runs table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='runs' AND column_name='title') THEN
        ALTER TABLE runs ADD COLUMN title VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='runs' AND column_name='description') THEN
        ALTER TABLE runs ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='runs' AND column_name='avg_speed') THEN
        ALTER TABLE runs ADD COLUMN avg_speed DECIMAL(5, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='runs' AND column_name='max_speed') THEN
        ALTER TABLE runs ADD COLUMN max_speed DECIMAL(5, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='runs' AND column_name='elevation_loss') THEN
        ALTER TABLE runs ADD COLUMN elevation_loss DECIMAL(8, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='runs' AND column_name='avg_heart_rate') THEN
        ALTER TABLE runs ADD COLUMN avg_heart_rate INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='runs' AND column_name='max_heart_rate') THEN
        ALTER TABLE runs ADD COLUMN max_heart_rate INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='runs' AND column_name='is_public') THEN
        ALTER TABLE runs ADD COLUMN is_public BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='runs' AND column_name='kudos_count') THEN
        ALTER TABLE runs ADD COLUMN kudos_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- ============================================
-- CREATE NEW TABLES
-- ============================================

-- Route heatmap
CREATE TABLE IF NOT EXISTS route_heatmap (
    id SERIAL PRIMARY KEY,
    location GEOMETRY(Point, 4326) NOT NULL,
    geohash VARCHAR(12) NOT NULL UNIQUE,
    run_count INTEGER DEFAULT 1,
    total_runners INTEGER DEFAULT 1,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_route_heatmap_location ON route_heatmap USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_route_heatmap_geohash ON route_heatmap(geohash);
CREATE INDEX IF NOT EXISTS idx_route_heatmap_count ON route_heatmap(run_count DESC);

-- AI recommendations
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50),
    title VARCHAR(200),
    description TEXT,
    priority VARCHAR(20),
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    valid_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user ON ai_recommendations(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_created ON ai_recommendations(created_at DESC);

-- Kudos
CREATE TABLE IF NOT EXISTS kudos (
    id SERIAL PRIMARY KEY,
    run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(run_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_kudos_run ON kudos(run_id);
CREATE INDEX IF NOT EXISTS idx_kudos_user ON kudos(user_id);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_run ON comments(run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

-- Followers
CREATE TABLE IF NOT EXISTS followers (
    id SERIAL PRIMARY KEY,
    follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id);

-- ============================================
-- CREATE MATERIALIZED VIEWS
-- ============================================

-- Tile leaderboard
DROP MATERIALIZED VIEW IF EXISTS tile_leaderboard CASCADE;
CREATE MATERIALIZED VIEW tile_leaderboard AS
SELECT 
    u.id as user_id,
    u.username,
    u.profile_picture,
    COUNT(DISTINCT ct.tile_id) as tiles_captured,
    SUM(ct.capture_count) as total_captures,
    MAX(ct.last_captured_at) as last_capture,
    RANK() OVER (ORDER BY COUNT(DISTINCT ct.tile_id) DESC) as rank
FROM users u
LEFT JOIN captured_tiles ct ON u.id = ct.user_id
GROUP BY u.id, u.username, u.profile_picture;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tile_leaderboard_user ON tile_leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_tile_leaderboard_rank ON tile_leaderboard(rank);

-- Segment leaderboard
DROP MATERIALIZED VIEW IF EXISTS segment_leaderboard CASCADE;
CREATE MATERIALIZED VIEW segment_leaderboard AS
SELECT 
    se.segment_id,
    se.user_id,
    u.username,
    u.profile_picture,
    MIN(se.elapsed_time) as best_time,
    COUNT(*) as attempt_count,
    RANK() OVER (PARTITION BY se.segment_id ORDER BY MIN(se.elapsed_time)) as rank
FROM segment_efforts se
JOIN users u ON se.user_id = u.id
GROUP BY se.segment_id, se.user_id, u.username, u.profile_picture;

CREATE INDEX IF NOT EXISTS idx_segment_leaderboard_segment ON segment_leaderboard(segment_id, rank);
CREATE INDEX IF NOT EXISTS idx_segment_leaderboard_user ON segment_leaderboard(user_id);

-- ============================================
-- CREATE OR UPDATE TRIGGERS
-- ============================================

-- Update kudos count
CREATE OR REPLACE FUNCTION update_kudos_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE runs SET kudos_count = kudos_count + 1 WHERE id = NEW.run_id;
        UPDATE user_stats SET total_kudos_received = total_kudos_received + 1 
        WHERE user_id = (SELECT user_id FROM runs WHERE id = NEW.run_id);
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE runs SET kudos_count = GREATEST(kudos_count - 1, 0) WHERE id = OLD.run_id;
        UPDATE user_stats SET total_kudos_received = GREATEST(total_kudos_received - 1, 0)
        WHERE user_id = (SELECT user_id FROM runs WHERE id = OLD.run_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_kudos_count ON kudos;
CREATE TRIGGER trigger_update_kudos_count
AFTER INSERT OR DELETE ON kudos
FOR EACH ROW
EXECUTE FUNCTION update_kudos_count();

-- ============================================
-- CREATE HELPER FUNCTIONS
-- ============================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_leaderboards()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY tile_leaderboard;
    REFRESH MATERIALIZED VIEW CONCURRENTLY segment_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE VIEWS
-- ============================================

-- User dashboard summary
CREATE OR REPLACE VIEW user_dashboard AS
SELECT 
    u.id,
    u.username,
    u.level,
    u.total_xp,
    us.total_distance,
    us.total_runs,
    us.total_duration,
    us.unique_tiles_captured,
    us.current_streak,
    us.best_pace,
    us.achievements_unlocked,
    us.challenges_completed,
    (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as follower_count,
    (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count
FROM users u
LEFT JOIN user_stats us ON u.id = us.user_id;

-- Recent activities
CREATE OR REPLACE VIEW recent_activities AS
SELECT 
    a.id,
    a.user_id,
    u.username,
    u.profile_picture,
    a.activity_type,
    a.activity_data,
    a.created_at
FROM activities a
JOIN users u ON a.user_id = u.id
WHERE a.is_public = true
ORDER BY a.created_at DESC;

-- ============================================
-- ADD SAMPLE DATA (if tables are empty)
-- ============================================

-- Insert achievements if not exist
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, xp_reward, badge_tier, unlock_order)
SELECT * FROM (VALUES
    ('First Steps', 'Complete your first run', '🏃', 'milestone', 'run_count', 1, 50, 'bronze', 1),
    ('5K Runner', 'Run 5 kilometers', '🎯', 'distance', 'total_distance', 5000, 100, 'bronze', 2),
    ('10K Runner', 'Run 10 kilometers', '🎯', 'distance', 'total_distance', 10000, 200, 'silver', 3),
    ('Territory Explorer', 'Capture 10 tiles', '🗺️', 'tiles', 'tile_count', 10, 100, 'bronze', 7),
    ('Week Warrior', 'Run 7 days in a row', '🔥', 'streak', 'streak_days', 7, 250, 'silver', 11)
) AS v(name, description, icon, category, requirement_type, requirement_value, xp_reward, badge_tier, unlock_order)
WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE achievements.name = v.name);

-- ============================================
-- GRANT PERMISSIONS (adjust as needed)
-- ============================================

-- Grant permissions on new tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Refresh materialized views
SELECT refresh_leaderboards();

-- Analyze tables for query optimization
ANALYZE users;
ANALYZE runs;
ANALYZE route_points;
ANALYZE captured_tiles;
ANALYZE segments;
ANALYZE segment_efforts;
ANALYZE achievements;
ANALYZE user_achievements;
ANALYZE challenges;
ANALYZE user_challenges;
ANALYZE user_stats;

SELECT 'Migration completed successfully!' as status;
