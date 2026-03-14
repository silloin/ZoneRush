-- Enable PostGIS extension (ignore if already exists)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Add geometry columns to runs table for LINESTRING storage
ALTER TABLE runs ADD COLUMN IF NOT EXISTS route_geom GEOMETRY(LINESTRING, 4326);

-- Create index for spatial queries
CREATE INDEX IF NOT EXISTS idx_runs_route_geom ON runs USING GIST(route_geom);

-- Add geometry column to tiles for polygon storage
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS area_geom GEOMETRY(POLYGON, 4326);
CREATE INDEX IF NOT EXISTS idx_tiles_area_geom ON tiles USING GIST(area_geom);

-- Function to convert route JSON to LINESTRING
CREATE OR REPLACE FUNCTION json_to_linestring(route_json JSONB)
RETURNS GEOMETRY AS $$
BEGIN
    RETURN ST_GeomFromGeoJSON(
        json_build_object(
            'type', 'LineString',
            'coordinates', route_json
        )::text
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check territory overlap
CREATE OR REPLACE FUNCTION check_territory_overlap(new_route GEOMETRY)
RETURNS TABLE(territory_id INTEGER, overlap_area FLOAT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        ST_Area(ST_Intersection(t.area, ST_Buffer(new_route::geography, 50)::geometry)) as overlap
    FROM territories t
    WHERE ST_Intersects(t.area, ST_Buffer(new_route::geography, 50)::geometry);
END;
$$ LANGUAGE plpgsql;

-- Add columns to users table if they don't exist (for backward compatibility)
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lastrundate DATE;

-- Add territory-related columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_territory_area NUMERIC DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS territory_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS territories_captured INTEGER DEFAULT 0;

-- Add created_at to runs if not exists
ALTER TABLE runs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Enhance territories table (columns already defined in setup_database.sql, add any extras)
ALTER TABLE territories ADD COLUMN IF NOT EXISTS stolen_from INTEGER REFERENCES users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_territories_area_km2 ON territories(area_km2 DESC);
CREATE INDEX IF NOT EXISTS idx_territories_stolen ON territories(is_stolen) WHERE is_stolen = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_territory_points ON users(territory_points DESC);

-- Function to calculate territory points based on area
CREATE OR REPLACE FUNCTION calculate_territory_points(area_km2 NUMERIC)
RETURNS INTEGER AS $$
BEGIN
    -- Points = area in km2 * 100, minimum 10 points
    RETURN GREATEST(10, FLOOR(area_km2 * 100));
END;
$$ LANGUAGE plpgsql;

-- Create cheat_flags table for anti-cheat system
CREATE TABLE IF NOT EXISTS cheat_flags (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    route_data JSONB,
    violations JSONB,
    severity VARCHAR(20) DEFAULT 'medium',
    reviewed BOOLEAN DEFAULT FALSE,
    reviewer_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cheat_flags_user ON cheat_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_cheat_flags_severity ON cheat_flags(severity);
CREATE INDEX IF NOT EXISTS idx_cheat_flags_reviewed ON cheat_flags(reviewed) WHERE reviewed = FALSE;
