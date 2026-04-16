-- ============================================
-- SUPABASE: Add Missing Notification Columns
-- Run this in Supabase SQL Editor
-- ============================================

-- Add is_triggered column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'is_triggered'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN is_triggered BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_triggered column to notifications table';
    ELSE
        RAISE NOTICE 'is_triggered column already exists';
    END IF;
END $$;

-- Add trigger_time column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'trigger_time'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN trigger_time TIMESTAMP;
        RAISE NOTICE 'Added trigger_time column to notifications table';
    ELSE
        RAISE NOTICE 'trigger_time column already exists';
    END IF;
END $$;

-- Add triggered_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'triggered_at'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN triggered_at TIMESTAMP;
        RAISE NOTICE 'Added triggered_at column to notifications table';
    ELSE
        RAISE NOTICE 'triggered_at column already exists';
    END IF;
END $$;

-- Create notification_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tile_capture_alerts BOOLEAN DEFAULT TRUE,
    training_reminders BOOLEAN DEFAULT TRUE,
    friend_activity BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create notification_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_trigger_time ON public.notifications(trigger_time) WHERE trigger_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON public.notifications(user_id, is_triggered, trigger_time) WHERE is_triggered = FALSE AND trigger_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_notification ON public.notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON public.notification_logs(user_id);

-- Create trigger function
CREATE OR REPLACE FUNCTION public.update_triggered_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.triggered_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_triggered_at ON public.notifications;
CREATE TRIGGER set_triggered_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    WHEN (NEW.is_triggered = TRUE AND OLD.is_triggered = FALSE)
    EXECUTE FUNCTION public.update_triggered_at();

-- Insert default preferences for existing users
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM public.users 
WHERE id NOT IN (SELECT user_id FROM public.notification_preferences)
ON CONFLICT DO NOTHING;

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'notifications'
AND column_name IN ('is_triggered', 'trigger_time', 'triggered_at')
ORDER BY column_name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced notifications system setup completed successfully!';
END $$;
