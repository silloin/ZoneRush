-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Migrate legacy tables to new column names if they exist (Run this early)
DO $$
BEGIN
    -- Runs table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'runs') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'runs' AND column_name = 'userid') THEN
            ALTER TABLE runs RENAME COLUMN userid TO user_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'runs' AND column_name = 'avgpace') THEN
            ALTER TABLE runs RENAME COLUMN avgpace TO pace;
        END IF;
    END IF;

    -- Captured Tiles table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'captured_tiles') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captured_tiles' AND column_name = 'userid') THEN
            ALTER TABLE captured_tiles RENAME COLUMN userid TO user_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captured_tiles' AND column_name = 'tileid') THEN
            ALTER TABLE captured_tiles RENAME COLUMN tileid TO tile_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captured_tiles' AND column_name = 'runid') THEN
            ALTER TABLE captured_tiles RENAME COLUMN runid TO run_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captured_tiles' AND column_name = 'capturedat') THEN
            ALTER TABLE captured_tiles RENAME COLUMN capturedat TO captured_at;
        END IF;
    END IF;

    -- Training Plans table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_plans') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_plans' AND column_name = 'userid') THEN
            ALTER TABLE training_plans RENAME COLUMN userid TO user_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_plans' AND column_name = 'plantype') THEN
            ALTER TABLE training_plans RENAME COLUMN plantype TO plan_type;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_plans' AND column_name = 'startdate') THEN
            ALTER TABLE training_plans RENAME COLUMN startdate TO start_date;
        END IF;
    END IF;

    -- Territories table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'territories') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'territories' AND column_name = 'userid') THEN
            ALTER TABLE territories RENAME COLUMN userid TO user_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'territories' AND column_name = 'capturedat') THEN
            ALTER TABLE territories RENAME COLUMN capturedat TO captured_at;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'territories' AND column_name = 'tilescaptured') THEN
            ALTER TABLE territories RENAME COLUMN tilescaptured TO tiles_captured;
        END IF;
    END IF;

    -- Users table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lastrundate') THEN
            ALTER TABLE users RENAME COLUMN lastrundate TO last_run_date;
        END IF;
    END IF;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    total_distance NUMERIC DEFAULT 0,
    total_tiles INTEGER DEFAULT 0,
    weekly_mileage NUMERIC DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak INTEGER DEFAULT 0,
    role VARCHAR(10) DEFAULT 'user',
    training_plan_id INTEGER,
    last_run_date DATE,
    total_territory_area NUMERIC DEFAULT 0,
    territory_points INTEGER DEFAULT 0,
    fitness_level VARCHAR(20) DEFAULT 'beginner',
    best_5k_time NUMERIC,
    best_10k_time NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create runs table
CREATE TABLE IF NOT EXISTS runs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    distance NUMERIC,
    duration INTEGER,
    pace NUMERIC,
    calories INTEGER,
    elevation_gain NUMERIC,
    route_geometry GEOMETRY(LineString, 4326),
    start_location GEOMETRY(Point, 4326),
    end_location GEOMETRY(Point, 4326),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tiles table
CREATE TABLE IF NOT EXISTS tiles (
    id SERIAL PRIMARY KEY,
    geohash VARCHAR(20) UNIQUE NOT NULL,
    geometry GEOMETRY(Polygon, 4326),
    center_point GEOMETRY(Point, 4326),
    value INTEGER DEFAULT 1,
    zone_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create captured_tiles table
CREATE TABLE IF NOT EXISTS captured_tiles (
    id SERIAL PRIMARY KEY,
    tile_id INTEGER REFERENCES tiles(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    run_id INTEGER REFERENCES runs(id) ON DELETE SET NULL,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tile_id, user_id)
);

-- Create zones table
CREATE TABLE IF NOT EXISTS zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    total_tiles INTEGER DEFAULT 0,
    king_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    queen_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    goal_type VARCHAR(50) NOT NULL,
    goal_value NUMERIC NOT NULL,
    participants JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active'
);

-- Create training_plans table
CREATE TABLE IF NOT EXISTS training_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL,
    workouts JSONB,
    start_date TIMESTAMPTZ DEFAULT NOW()
);

-- Create route_points table
CREATE TABLE IF NOT EXISTS route_points (
    id SERIAL PRIMARY KEY,
    run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,
    altitude NUMERIC,
    speed NUMERIC,
    heading NUMERIC,
    accuracy NUMERIC,
    recorded_at TIMESTAMPTZ NOT NULL,
    sequence_order INTEGER NOT NULL
);

-- Create territories table
CREATE TABLE IF NOT EXISTS territories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    area GEOMETRY(Polygon, 4326) NOT NULL,
    area_km2 NUMERIC,
    points INTEGER DEFAULT 0,
    tiles_captured INTEGER DEFAULT 0,
    is_stolen BOOLEAN DEFAULT FALSE,
    stolen_from_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create territory_battles table
CREATE TABLE IF NOT EXISTS territory_battles (
    id SERIAL PRIMARY KEY,
    attacker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    defender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    attacker_area NUMERIC,
    defender_area NUMERIC,
    winner_id INTEGER REFERENCES users(id),
    points_transferred INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to territories if not present
ALTER TABLE territories ADD COLUMN IF NOT EXISTS area_km2 NUMERIC;
ALTER TABLE territories ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE territories ADD COLUMN IF NOT EXISTS is_stolen BOOLEAN DEFAULT FALSE;
ALTER TABLE territories ADD COLUMN IF NOT EXISTS stolen_from_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tiles_geohash ON tiles(geohash);
CREATE INDEX IF NOT EXISTS idx_captured_tiles_user_id ON captured_tiles(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_runs_route_geometry ON runs USING GIST(route_geometry);
CREATE INDEX IF NOT EXISTS idx_tiles_geometry ON tiles USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_territories_area ON territories USING GIST(area);
CREATE INDEX IF NOT EXISTS idx_territories_user_id ON territories(user_id);