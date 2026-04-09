-- SOS Alerts History Table
-- Drop existing table if it has wrong schema and recreate with correct one
DROP TABLE IF EXISTS sos_alerts CASCADE;

CREATE TABLE sos_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    message TEXT,
    contacts_notified JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sos_alerts_user ON sos_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created ON sos_alerts(created_at DESC);

-- Comments
COMMENT ON TABLE sos_alerts IS 'Stores history of SOS alerts sent by users';
COMMENT ON COLUMN sos_alerts.contacts_notified IS 'JSON array of contact names that were notified';
