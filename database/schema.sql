-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table (enhanced)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_picture VARCHAR(255),
    level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Runs table (enhanced with route geometry)
CREATE TABLE runs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    distance DECIMAL(10, 2) NOT NULL,
    duration INTEGER NOT NULL,
    pace DECIMAL(5, 2),
    calories INTEGER,
    elevation_gain DECIMAL(8, 2),
    route_geometry GEOMETRY(LineString, 4326),
    start_location GEOMETRY(Point, 4326),
    end_location GEOMETRY(Point, 4326),
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_runs_route_geometry ON runs USING GIST(route_geometry);
CREATE INDEX idx_runs_start_location ON runs USING GIST(start_location);

-- Route points (for detailed tracking)
CREATE TABLE route_points (
    id SERIAL PRIMARY KEY,
    run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,
    altitude DECIMAL(8, 2),
    speed DECIMAL(5, 2),
    heading DECIMAL(5, 2),
    accuracy DECIMAL(5, 2),
    recorded_at TIMESTAMP NOT NULL,
    sequence_order INTEGER NOT NULL
);

CREATE INDEX idx_route_points_location ON route_points USING GIST(location);
CREATE INDEX idx_route_points_run_id ON route_points(run_id);

-- Tiles table
CREATE TABLE tiles (
    id SERIAL PRIMARY KEY,
    geohash VARCHAR(12) UNIQUE NOT NULL,
    geometry GEOMETRY(Polygon, 4326) NOT NULL,
    center_point GEOMETRY(Point, 4326) NOT NULL,
    tile_type VARCHAR(20) DEFAULT 'grid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tiles_geometry ON tiles USING GIST(geometry);
CREATE INDEX idx_tiles_geohash ON tiles(geohash);

-- Captured tiles
CREATE TABLE captured_tiles (
    id SERIAL PRIMARY KEY,
    tile_id INTEGER REFERENCES tiles(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    run_id INTEGER REFERENCES runs(id) ON DELETE SET NULL,
    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tile_id, user_id)
);

CREATE INDEX idx_captured_tiles_user ON captured_tiles(user_id);
CREATE INDEX idx_captured_tiles_tile ON captured_tiles(tile_id);

-- Segments
CREATE TABLE segments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    geometry GEOMETRY(LineString, 4326) NOT NULL,
    start_point GEOMETRY(Point, 4326) NOT NULL,
    end_point GEOMETRY(Point, 4326) NOT NULL,
    distance DECIMAL(10, 2) NOT NULL,
    elevation_gain DECIMAL(8, 2),
    difficulty VARCHAR(20),
    created_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_segments_geometry ON segments USING GIST(geometry);
CREATE INDEX idx_segments_start_point ON segments USING GIST(start_point);

-- Segment efforts
CREATE TABLE segment_efforts (
    id SERIAL PRIMARY KEY,
    segment_id INTEGER REFERENCES segments(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    elapsed_time INTEGER NOT NULL,
    pace DECIMAL(5, 2),
    rank INTEGER,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_segment_efforts_segment ON segment_efforts(segment_id);
CREATE INDEX idx_segment_efforts_user ON segment_efforts(user_id);
CREATE INDEX idx_segment_efforts_time ON segment_efforts(elapsed_time);

-- Achievements
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    category VARCHAR(50),
    requirement_type VARCHAR(50),
    requirement_value INTEGER,
    xp_reward INTEGER DEFAULT 0,
    badge_tier VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User achievements
CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- Daily challenges
CREATE TABLE challenges (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(50),
    target_value DECIMAL(10, 2) NOT NULL,
    xp_reward INTEGER DEFAULT 0,
    valid_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_challenges_valid_date ON challenges(valid_date);

-- User challenge progress
CREATE TABLE user_challenges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
    current_progress DECIMAL(10, 2) DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, challenge_id)
);

CREATE INDEX idx_user_challenges_user ON user_challenges(user_id);

-- User statistics
CREATE TABLE user_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_distance DECIMAL(12, 2) DEFAULT 0,
    total_runs INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    total_tiles_captured INTEGER DEFAULT 0,
    best_pace DECIMAL(5, 2),
    longest_run DECIMAL(10, 2),
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_run_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_stats_user ON user_stats(user_id);

-- Activity feed
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50),
    activity_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activities_created ON activities(created_at DESC);

-- Triggers
CREATE OR REPLACE FUNCTION update_user_stats_after_run()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_stats (user_id, total_distance, total_runs, total_duration, last_run_date)
    VALUES (NEW.user_id, NEW.distance, 1, NEW.duration, DATE(NEW.completed_at))
    ON CONFLICT (user_id) DO UPDATE SET
        total_distance = user_stats.total_distance + NEW.distance,
        total_runs = user_stats.total_runs + 1,
        total_duration = user_stats.total_duration + NEW.duration,
        best_pace = CASE 
            WHEN user_stats.best_pace IS NULL OR NEW.pace < user_stats.best_pace 
            THEN NEW.pace 
            ELSE user_stats.best_pace 
        END,
        longest_run = CASE 
            WHEN NEW.distance > user_stats.longest_run 
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

CREATE OR REPLACE FUNCTION update_tile_count_after_capture()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_stats 
    SET total_tiles_captured = total_tiles_captured + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tile_count
AFTER INSERT ON captured_tiles
FOR EACH ROW
EXECUTE FUNCTION update_tile_count_after_capture();

-- Sample achievements
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, xp_reward, badge_tier) VALUES
('First Steps', 'Complete your first run', '🏃', 'milestone', 'run_count', 1, 50, 'bronze'),
('5K Runner', 'Run 5 kilometers', '🎯', 'distance', 'total_distance', 5000, 100, 'bronze'),
('10K Runner', 'Run 10 kilometers', '🎯', 'distance', 'total_distance', 10000, 200, 'silver'),
('Territory Explorer', 'Capture 10 tiles', '🗺️', 'tiles', 'tile_count', 10, 100, 'bronze'),
('Week Warrior', 'Run 7 days in a row', '🔥', 'streak', 'streak_days', 7, 250, 'silver');
