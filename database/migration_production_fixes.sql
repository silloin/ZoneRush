-- ============================================
-- CRITICAL PRODUCTION MIGRATION
-- Fixes all database schema errors from logs
-- ============================================

-- 1. FIX: training_plans missing is_active column
ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS generated_by VARCHAR(20) DEFAULT 'template';

CREATE INDEX IF NOT EXISTS idx_training_plans_is_active 
  ON training_plans(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_training_plans_end_date 
  ON training_plans(end_date);

-- 2. FIX: notifications table missing content column
-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    content TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns if they don't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);

-- 3. FIX: Ensure route_heatmap table exists for heatmap data
CREATE TABLE IF NOT EXISTS route_heatmap (
    id BIGSERIAL PRIMARY KEY,
    run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,
    intensity INTEGER DEFAULT 1,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_route_heatmap_location 
  ON route_heatmap USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_route_heatmap_timestamp 
  ON route_heatmap(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_route_heatmap_user 
  ON route_heatmap(user_id);

-- 4. Ensure route_points has all required columns
ALTER TABLE route_points ADD COLUMN IF NOT EXISTS run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE;

-- Update route_points index if needed
CREATE INDEX IF NOT EXISTS idx_route_points_timestamp 
  ON route_points(recorded_at DESC);

-- 5. Optimize existing tables
VACUUM ANALYZE training_plans;
VACUUM ANALYZE notifications;
VACUUM ANALYZE route_heatmap;

-- Log successful migration
SELECT 'Production Migration Complete' as status,
       NOW() as timestamp,
       'All schema issues fixed' as message;
