-- Geofencing & Check-in Timer System Schema

-- ============================================
-- GEOFENCES TABLE (Safe Zones)
-- ============================================
CREATE TABLE IF NOT EXISTS user_geofences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    radius_meters INTEGER DEFAULT 100 CHECK (radius_meters > 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for geofence queries
CREATE INDEX IF NOT EXISTS idx_user_geofences_user ON user_geofences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_geofences_active ON user_geofences(is_active) WHERE is_active = TRUE;

-- ============================================
-- CHECK-IN TIMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_checkin_timers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interval_minutes INTEGER DEFAULT 30 CHECK (interval_minutes > 0),
    last_checkin_at TIMESTAMPTZ,
    next_checkin_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for timer queries
CREATE INDEX IF NOT EXISTS idx_user_checkin_timers_user ON user_checkin_timers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_checkin_timers_active ON user_checkin_timers(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_checkin_timers_overdue ON user_checkin_timers(next_checkin_at) WHERE is_active = TRUE;

-- ============================================
-- CHECK-IN HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_checkins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    location_latitude NUMERIC,
    location_longitude NUMERIC
);

-- Indexes for check-in history
CREATE INDEX IF NOT EXISTS idx_user_checkins_user ON user_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_checkins_time ON user_checkins(checked_in_at DESC);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE user_geofences IS 'User-defined safe zones for geofencing alerts';
COMMENT ON TABLE user_checkin_timers IS 'Periodic check-in timers for safety monitoring';
COMMENT ON TABLE user_checkins IS 'History of user check-ins';

COMMENT ON COLUMN user_geofences.radius_meters IS 'Radius of the geofence in meters';
COMMENT ON COLUMN user_checkin_timers.interval_minutes IS 'How often user must check in (minutes)';
COMMENT ON COLUMN user_checkin_timers.next_checkin_at IS 'When the next check-in is due';
