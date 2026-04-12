-- Add location column to sos_alerts if not exists
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS location VARCHAR(500);
