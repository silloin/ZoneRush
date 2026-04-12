-- Add location columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_location VARCHAR(500);
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_location VARCHAR(500);
