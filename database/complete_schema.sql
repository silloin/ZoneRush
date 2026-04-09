-- ============================================
-- COMPLETE DATABASE SCHEMA FOR FITNESS PLATFORM
-- ============================================

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For text search
CREATE EXTENSION IF NOT EXISTS btree_gist; -- For advanced indexing

-- ============================================
-- CORE TABLES
-- ============================================

-- Enhanced Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_picture VARCHAR(255),
    bio TEXT,
    level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    fitness_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced
    preferred_distance_unit VARCHAR(10) DEFAULT 'km', -- km, miles
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_level ON users(level DESC);

-- Enhanced Runs Table with GeoJSON support
CREATE TABLE runs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100),
    description TEXT,
    distance DECIMAL(10, 2) NOT NULL, -- meters
    duration INTEGER NOT NULL, -- seconds
    pace DECIMAL(5, 2), -- min/km
    avg_speed DECIMAL(5, 2), -- m/s
    max_speed DECIMAL(5, 2), -- m/s
    calories INTEGER,
    elevation_gain DECIMAL(8, 2), -- meters
    elevation_loss DECIMAL(8, 2), -- meters
    avg_heart_rate INTEGER,
    max_heart_rate INTEGER,
    route_geometry GEOMETRY(LineString, 4326), -- Full route as LineString
    start_location GEOMETRY(Point, 4326),
    end_location GEOMETRY(Point, 4326),
    weather_condition VARCHAR(50),
    temperature DECIMAL(4, 1),
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NOT NULL,
    is_public BOOLEAN DEFAULT true,
    kudos_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_runs_user_id ON runs(user_id);
CREATE INDEX idx_runs_completed_at ON runs(completed_at DESC);
CREATE INDEX idx_runs_route_geometry ON runs USING GIST(route_geometry);
CREATE INDEX idx_runs_start_location ON runs USING GIST(start_location);
CREATE INDEX idx_runs_distance ON runs(distance DESC);

-- Route Points (for detailed tracking and replay)
CREATE TABLE route_points (
    id BIGSERIAL PRIMARY KEY,
    run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,
    altitude DECIMAL(8, 2),
    speed DECIMAL(5, 2), -- m/s
    heading DECIMAL(5, 2), -- degrees 0-360
    accuracy DECIMAL(5, 2), -- meters
    heart_rate INTEGER,
    cadence INTEGER, -- steps per minute
    recorded_at TIMESTAMP NOT NULL,
    sequence_order INTEGER NOT NULL
);

CREATE INDEX idx_route_points_run_id ON route_points(run_id);
CREATE INDEX idx_route_points_location ON route_points USING GIST(location);
CREATE INDEX idx_route_points_sequence ON route_points(run_id, sequence_order);

-- ============================================
-- TILE SYSTEM (Hexagonal Grid)
-- ============================================

CREATE TABLE tiles (
    id SERIAL PRIMARY KEY,
    geohash VARCHAR(12) UNIQUE NOT NULL,
    h3_index VARCHAR(20) UNIQUE, -- H3 hexagonal index
    geometry GEOMETRY(Polygon, 4326) NOT NULL,
    center_point GEOMETRY(Point, 4326) NOT NULL,
    tile_type VARCHAR(20) DEFAULT 'hex', -- hex, square
    zoom_level INTEGER DEFAULT 15,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tiles_geometry ON tiles USING GIST(geometry);
CREATE INDEX idx_tiles_geohash ON tiles(geohash);
CREATE INDEX idx_tiles_h3_index ON tiles(h3_index);
CREATE INDEX idx_tiles_center ON tiles USING GIST(center_point);

-- Captured Tiles (User ownership)
CREATE TABLE captured_tiles (
    id SERIAL PRIMARY KEY,
    tile_id INTEGER REFERENCES tiles(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    run_id INTEGER REFERENCES runs(id) ON DELETE SET NULL,
    capture_count INTEGER DEFAULT 1, -- How many times user ran through this tile
    first_captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tile_id, user_id)
);

CREATE INDEX idx_captured_tiles_user ON captured_tiles(user_id);
CREATE INDEX idx_captured_tiles_tile ON captured_tiles(tile_id);
CREATE INDEX idx_captured_tiles_run ON captured_tiles(run_id);
CREATE INDEX idx_captured_tiles_first_captured ON captured_tiles(first_captured_at DESC);

-- Tile Leaderboard (Materialized View for Performance)
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
JOIN captured_tiles ct ON u.id = ct.user_id
GROUP BY u.id, u.username, u.profile_picture;

CREATE UNIQUE INDEX idx_tile_leaderboard_user ON tile_leaderboard(user_id);
CREATE INDEX idx_tile_leaderboard_rank ON tile_leaderboard(rank);

-- ============================================
-- SEGMENT SYSTEM (Strava-like)
-- ============================================

CREATE TABLE segments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    geometry GEOMETRY(LineString, 4326) NOT NULL,
    start_point GEOMETRY(Point, 4326) NOT NULL,
    end_point GEOMETRY(Point, 4326) NOT NULL,
    distance DECIMAL(10, 2) NOT NULL, -- meters
    elevation_gain DECIMAL(8, 2),
    avg_grade DECIMAL(5, 2), -- percentage
    difficulty VARCHAR(20), -- easy, moderate, hard, extreme
    category VARCHAR(50), -- climb, sprint, flat, descent
    created_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    attempt_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_segments_geometry ON segments USING GIST(geometry);
CREATE INDEX idx_segments_start_point ON segments USING GIST(start_point);
CREATE INDEX idx_segments_difficulty ON segments(difficulty);
CREATE INDEX idx_segments_category ON segments(category);

-- Segment Efforts (User attempts)
CREATE TABLE segment_efforts (
    id SERIAL PRIMARY KEY,
    segment_id INTEGER REFERENCES segments(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    elapsed_time INTEGER NOT NULL, -- seconds
    pace DECIMAL(5, 2), -- min/km
    avg_heart_rate INTEGER,
    max_heart_rate INTEGER,
    avg_power INTEGER, -- watts (if available)
    rank INTEGER, -- User's rank on this segment
    pr_rank INTEGER, -- Personal record rank
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_segment_efforts_segment ON segment_efforts(segment_id);
CREATE INDEX idx_segment_efforts_user ON segment_efforts(user_id);
CREATE INDEX idx_segment_efforts_time ON segment_efforts(segment_id, elapsed_time);
CREATE INDEX idx_segment_efforts_run ON segment_efforts(run_id);

-- Segment Leaderboard (Materialized View)
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

CREATE INDEX idx_segment_leaderboard_segment ON segment_leaderboard(segment_id, rank);
CREATE INDEX idx_segment_leaderboard_user ON segment_leaderboard(user_id);

-- ============================================
-- ACHIEVEMENT SYSTEM
-- ============================================

CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    category VARCHAR(50), -- distance, tiles, streak, speed, social, special
    requirement_type VARCHAR(50), -- total_distance, tile_count, streak_days, etc.
    requirement_value DECIMAL(10, 2),
    xp_reward INTEGER DEFAULT 0,
    badge_tier VARCHAR(20), -- bronze, silver, gold, platinum, diamond
    is_secret BOOLEAN DEFAULT false,
    unlock_order INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_tier ON achievements(badge_tier);

-- User Achievements (Unlocked)
CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    progress DECIMAL(10, 2) DEFAULT 0,
    is_unlocked BOOLEAN DEFAULT false,
    unlocked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked ON user_achievements(user_id, is_unlocked);

-- ============================================
-- CHALLENGE SYSTEM
-- ============================================

CREATE TABLE challenges (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(50), -- distance, tiles, pace, duration, streak
    target_value DECIMAL(10, 2) NOT NULL,
    xp_reward INTEGER DEFAULT 0,
    badge_reward VARCHAR(50),
    difficulty VARCHAR(20), -- easy, medium, hard
    time_frame VARCHAR(20), -- daily, weekly, monthly
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    participant_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_challenges_valid_dates ON challenges(valid_from, valid_until);
CREATE INDEX idx_challenges_type ON challenges(challenge_type);
CREATE INDEX idx_challenges_time_frame ON challenges(time_frame);

-- User Challenge Progress
CREATE TABLE user_challenges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
    current_progress DECIMAL(10, 2) DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, challenge_id)
);

CREATE INDEX idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX idx_user_challenges_completed ON user_challenges(user_id, is_completed);

-- ============================================
-- USER STATISTICS (Cached for Performance)
-- ============================================

CREATE TABLE user_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_distance DECIMAL(12, 2) DEFAULT 0, -- meters
    total_runs INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0, -- seconds
    total_elevation_gain DECIMAL(10, 2) DEFAULT 0,
    total_tiles_captured INTEGER DEFAULT 0,
    unique_tiles_captured INTEGER DEFAULT 0,
    best_pace DECIMAL(5, 2), -- min/km
    best_5k_time INTEGER, -- seconds
    best_10k_time INTEGER,
    best_half_marathon_time INTEGER,
    best_marathon_time INTEGER,
    longest_run DECIMAL(10, 2), -- meters
    current_streak INTEGER DEFAULT 0, -- days
    longest_streak INTEGER DEFAULT 0, -- days
    last_run_date DATE,
    avg_weekly_distance DECIMAL(10, 2),
    total_kudos_received INTEGER DEFAULT 0,
    achievements_unlocked INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_stats_user ON user_stats(user_id);
CREATE INDEX idx_user_stats_distance ON user_stats(total_distance DESC);
CREATE INDEX idx_user_stats_tiles ON user_stats(unique_tiles_captured DESC);

-- ============================================
-- HEATMAP DATA (Aggregated for Performance)
-- ============================================

CREATE TABLE route_heatmap (
    id SERIAL PRIMARY KEY,
    location GEOMETRY(Point, 4326) NOT NULL,
    geohash VARCHAR(12) NOT NULL,
    run_count INTEGER DEFAULT 1,
    total_runners INTEGER DEFAULT 1,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_route_heatmap_location ON route_heatmap USING GIST(location);
CREATE INDEX idx_route_heatmap_geohash ON route_heatmap(geohash);
CREATE INDEX idx_route_heatmap_count ON route_heatmap(run_count DESC);

-- ============================================
-- AI COACH RECOMMENDATIONS
-- ============================================

CREATE TABLE ai_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50), -- pace, distance, recovery, training
    title VARCHAR(200),
    description TEXT,
    priority VARCHAR(20), -- low, medium, high
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    valid_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_recommendations_user ON ai_recommendations(user_id, is_read);
CREATE INDEX idx_ai_recommendations_created ON ai_recommendations(created_at DESC);

-- ============================================
-- SOCIAL FEATURES
-- ============================================

CREATE TABLE kudos (
    id SERIAL PRIMARY KEY,
    run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(run_id, user_id)
);

CREATE INDEX idx_kudos_run ON kudos(run_id);
CREATE INDEX idx_kudos_user ON kudos(user_id);

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_run ON comments(run_id, created_at DESC);
CREATE INDEX idx_comments_user ON comments(user_id);

CREATE TABLE followers (
    id SERIAL PRIMARY KEY,
    follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX idx_followers_follower ON followers(follower_id);
CREATE INDEX idx_followers_following ON followers(following_id);

-- Activity Feed
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50), -- run_completed, achievement_unlocked, challenge_completed, etc.
    activity_data JSONB,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_user ON activities(user_id, created_at DESC);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_created ON activities(created_at DESC);

-- ============================================
-- TRIGGERS AND FUNCTIONS
-- ============================================

-- Update user stats after run
CREATE OR REPLACE FUNCTION update_user_stats_after_run()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_stats (user_id, total_distance, total_runs, total_duration, total_elevation_gain, last_run_date)
    VALUES (NEW.user_id, NEW.distance, 1, NEW.duration, COALESCE(NEW.elevation_gain, 0), DATE(NEW.completed_at))
    ON CONFLICT (user_id) DO UPDATE SET
        total_distance = user_stats.total_distance + NEW.distance,
        total_runs = user_stats.total_runs + 1,
        total_duration = user_stats.total_duration + NEW.duration,
        total_elevation_gain = user_stats.total_elevation_gain + COALESCE(NEW.elevation_gain, 0),
        best_pace = CASE 
            WHEN user_stats.best_pace IS NULL OR NEW.pace < user_stats.best_pace 
            THEN NEW.pace 
            ELSE user_stats.best_pace 
        END,
        longest_run = CASE 
            WHEN NEW.distance > COALESCE(user_stats.longest_run, 0)
            THEN NEW.distance 
            ELSE user_stats.longest_run 
        END,
        last_run_date = DATE(NEW.completed_at),
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_stats
AFTER INSERT ON runs
FOR EACH ROW
EXECUTE FUNCTION update_user_stats_after_run();

-- Update tile count after capture
CREATE OR REPLACE FUNCTION update_tile_count_after_capture()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_stats 
    SET total_tiles_captured = total_tiles_captured + 1,
        unique_tiles_captured = (
            SELECT COUNT(DISTINCT tile_id) 
            FROM captured_tiles 
            WHERE user_id = NEW.user_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tile_count
AFTER INSERT ON captured_tiles
FOR EACH ROW
EXECUTE FUNCTION update_tile_count_after_capture();

-- Update kudos count
CREATE OR REPLACE FUNCTION update_kudos_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE runs SET kudos_count = kudos_count + 1 WHERE id = NEW.run_id;
        UPDATE user_stats SET total_kudos_received = total_kudos_received + 1 
        WHERE user_id = (SELECT user_id FROM runs WHERE id = NEW.run_id);
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE runs SET kudos_count = kudos_count - 1 WHERE id = OLD.run_id;
        UPDATE user_stats SET total_kudos_received = total_kudos_received - 1 
        WHERE user_id = (SELECT user_id FROM runs WHERE id = OLD.run_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kudos_count
AFTER INSERT OR DELETE ON kudos
FOR EACH ROW
EXECUTE FUNCTION update_kudos_count();

-- Refresh materialized views (run periodically via cron)
CREATE OR REPLACE FUNCTION refresh_leaderboards()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY tile_leaderboard;
    REFRESH MATERIALIZED VIEW CONCURRENTLY segment_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE DATA FOR ACHIEVEMENTS
-- ============================================

INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, xp_reward, badge_tier, unlock_order) VALUES
('First Steps', 'Complete your first run', '🏃', 'milestone', 'run_count', 1, 50, 'bronze', 1),
('5K Runner', 'Run a total of 5 kilometers', '🎯', 'distance', 'total_distance', 5000, 100, 'bronze', 2),
('10K Runner', 'Run a total of 10 kilometers', '🎯', 'distance', 'total_distance', 10000, 200, 'silver', 3),
('Half Marathon', 'Run 21.1 kilometers', '🏅', 'distance', 'total_distance', 21100, 400, 'gold', 4),
('Marathon Ready', 'Run 42.2 kilometers', '🏆', 'distance', 'total_distance', 42200, 1000, 'platinum', 5),
('Century', 'Run 100 kilometers total', '💯', 'distance', 'total_distance', 100000, 500, 'gold', 6),
('Territory Explorer', 'Capture 10 tiles', '🗺️', 'tiles', 'tile_count', 10, 100, 'bronze', 7),
('Territory Master', 'Capture 50 tiles', '🗺️', 'tiles', 'tile_count', 50, 300, 'silver', 8),
('Territory Legend', 'Capture 100 tiles', '🗺️', 'tiles', 'tile_count', 100, 600, 'gold', 9),
('Territory King', 'Capture 500 tiles', '👑', 'tiles', 'tile_count', 500, 2000, 'diamond', 10),
('Week Warrior', 'Run 7 days in a row', '🔥', 'streak', 'streak_days', 7, 250, 'silver', 11),
('Month Master', 'Run 30 days in a row', '🔥', 'streak', 'streak_days', 30, 1000, 'gold', 12),
('Speed Demon', 'Achieve pace under 4 min/km', '⚡', 'speed', 'best_pace', 4, 300, 'gold', 13),
('Early Bird', 'Complete 10 morning runs (before 7 AM)', '🌅', 'special', 'morning_runs', 10, 200, 'silver', 14),
('Night Owl', 'Complete 10 evening runs (after 8 PM)', '🌙', 'special', 'evening_runs', 10, 200, 'silver', 15),
('Social Butterfly', 'Receive 100 kudos', '👥', 'social', 'kudos_received', 100, 300, 'gold', 16),
('Segment Hunter', 'Complete 20 different segments', '🎯', 'special', 'segment_count', 20, 400, 'gold', 17),
('Challenge Master', 'Complete 10 challenges', '🏆', 'special', 'challenge_count', 10, 500, 'gold', 18);

-- ============================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ============================================

-- Partial indexes for active data
CREATE INDEX idx_runs_recent ON runs(user_id, completed_at DESC) 
WHERE completed_at > CURRENT_DATE - INTERVAL '90 days';

CREATE INDEX idx_challenges_active ON challenges(valid_from, valid_until) 
WHERE is_active = true;

-- Covering indexes for common queries
CREATE INDEX idx_runs_user_stats ON runs(user_id, distance, duration, pace, completed_at);

-- GIN index for JSONB
CREATE INDEX idx_activities_data ON activities USING GIN(activity_data);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- User Dashboard Summary
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

-- Recent Activity Feed
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
