-- ============================================
-- ENHANCED NOTIFICATIONS SYSTEM
-- ============================================

-- Drop existing notifications table and recreate with enhanced schema
DROP TABLE IF EXISTS notifications CASCADE;

-- ============================================
-- ENHANCED NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('scheduled', 'delayed', 'event', 'friend_request', 'message', 'global_message', 'achievement', 'system', 'tile_captured', 'training_reminder')),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    data JSONB DEFAULT '{}',
    trigger_time TIMESTAMP, -- For scheduled/delayed notifications
    is_triggered BOOLEAN DEFAULT FALSE, -- Whether the notification has been sent
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    triggered_at TIMESTAMP -- When the notification was actually triggered
);

-- Enhanced indexes for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_trigger_time ON notifications(trigger_time) WHERE trigger_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notifications(user_id, is_triggered, trigger_time) WHERE is_triggered = FALSE AND trigger_time IS NOT NULL;

-- ============================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tile_capture_alerts BOOLEAN DEFAULT TRUE,
    training_reminders BOOLEAN DEFAULT TRUE,
    friend_activity BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Index for notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

-- ============================================
-- NOTIFICATION LOG TABLE (for debugging)
-- ============================================
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'created', 'triggered', 'read', 'sent_email', 'sent_push'
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_notification ON notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);

-- ============================================
-- FUNCTION TO UPDATE TRIGGERED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_triggered_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.triggered_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set triggered_at when is_triggered becomes TRUE
DROP TRIGGER IF EXISTS set_triggered_at ON notifications;
CREATE TRIGGER set_triggered_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    WHEN (NEW.is_triggered = TRUE AND OLD.is_triggered = FALSE)
    EXECUTE FUNCTION update_triggered_at();

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================
-- Uncomment to insert default preferences for existing users
-- INSERT INTO notification_preferences (user_id)
-- SELECT id FROM users ON CONFLICT DO NOTHING;

