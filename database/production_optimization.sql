-- Production Database Optimization Script

-- 1. Geospatial Indexes (Ensure GIST is used)
CREATE INDEX IF NOT EXISTS idx_runs_route_geometry_gist ON runs USING GIST(route_geometry);
CREATE INDEX IF NOT EXISTS idx_route_points_location_gist ON route_points USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_tiles_geometry_gist ON tiles USING GIST(geometry);

-- 2. Time-Series Indexes
CREATE INDEX IF NOT EXISTS idx_runs_completed_at ON runs(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_points_recorded_at ON route_points(recorded_at);
CREATE INDEX IF NOT EXISTS idx_captured_tiles_last_captured ON captured_tiles(last_captured_at DESC);

-- 3. Partitioning Strategy for route_points (Conceptual)
-- Note: Partitioning an existing table requires data migration. 
-- Below is the strategy for a new partitioned table.

/*
CREATE TABLE route_points_partitioned (
    id SERIAL,
    run_id INTEGER NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    altitude DECIMAL(8, 2),
    speed DECIMAL(5, 2),
    recorded_at TIMESTAMP NOT NULL,
    sequence_order INTEGER NOT NULL,
    PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

CREATE TABLE route_points_y2024 PARTITION OF route_points_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE route_points_y2025 PARTITION OF route_points_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE route_points_y2026 PARTITION OF route_points_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
*/

-- 4. Optimized Tile Capture Function (using PostGIS instead of geohash-only logic)
CREATE OR REPLACE FUNCTION capture_tiles_for_run(p_user_id INTEGER, p_run_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_captured_count INTEGER;
BEGIN
    -- This function would be called after a run is saved
    -- It finds all tiles that intersect with the run's geometry and haven't been captured by the user yet
    
    INSERT INTO captured_tiles (tile_id, user_id, run_id, captured_at)
    SELECT t.id, p_user_id, p_run_id, NOW()
    FROM tiles t
    JOIN runs r ON ST_Intersects(t.geometry, ST_Buffer(r.route_geometry::geography, 10)::geometry)
    WHERE r.id = p_run_id
    ON CONFLICT (tile_id, user_id) DO NOTHING;
    
    GET DIAGNOSTICS v_captured_count = ROW_COUNT;
    RETURN v_captured_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Materialized View for Global Leaderboard (Refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_global_leaderboard AS
SELECT 
    u.id as user_id,
    u.username,
    us.total_distance,
    us.total_tiles_captured,
    us.level,
    RANK() OVER (ORDER BY us.total_tiles_captured DESC) as rank
FROM users u
JOIN user_stats us ON u.id = us.user_id
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_leaderboard_user_id ON mv_global_leaderboard(user_id);

-- 6. Maintenance Trigger for Materialized View (Optional, usually better to refresh on a schedule)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_global_leaderboard;
