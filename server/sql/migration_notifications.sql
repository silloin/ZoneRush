-- Migration: Add enhanced notifications system
-- This adds the missing columns: is_triggered, trigger_time, triggered_at

-- Check if notifications table exists, if not create it with full schema
DO $$
BEGIN
    -- Create notifications table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'notifications') THEN
        CREATE TABLE notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            data JSONB DEFAULT '{}',
            trigger_time TIMESTAMP,
            is_triggered BOOLEAN DEFAULT FALSE,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            triggered_at TIMESTAMP
        );
        
        RAISE NOTICE 'Created notifications table';
    ELSE
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_name = 'notifications' AND column_name = 'is_triggered') THEN
            ALTER TABLE notifications ADD COLUMN is_triggered BOOLEAN DEFAULT FALSE;
            RAISE NOTICE 'Added is_triggered column';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_name = 'notifications' AND column_name = 'trigger_time') THEN
            ALTER TABLE notifications ADD COLUMN trigger_time TIMESTAMP;
            RAISE NOTICE 'Added trigger_time column';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_name = 'notifications' AND column_name = 'triggered_at') THEN
            ALTER TABLE notifications ADD COLUMN triggered_at TIMESTAMP;
            RAISE NOTICE 'Added triggered_at column';
        END IF;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_trigger_time ON notifications(trigger_time) WHERE trigger_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notifications(user_id, is_triggered, trigger_time) WHERE is_triggered = FALSE AND trigger_time IS NOT NULL;

-- Create notification_preferences table
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

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

-- Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_notification ON notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);

-- Create trigger function
CREATE OR REPLACE FUNCTION update_triggered_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.triggered_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_triggered_at ON notifications;
CREATE TRIGGER set_triggered_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    WHEN (NEW.is_triggered = TRUE AND OLD.is_triggered = FALSE)
    EXECUTE FUNCTION update_triggered_at();

-- Insert default preferences for users who don't have them
INSERT INTO notification_preferences (user_id)
SELECT id FROM users 
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Enhanced notifications system migration completed';
