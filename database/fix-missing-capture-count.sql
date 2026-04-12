-- Fix: Add missing capture_count column to captured_tiles table in Supabase
-- Run this SQL manually in Supabase Query Editor

-- Add the capture_count column if it doesn't exist
ALTER TABLE captured_tiles 
ADD COLUMN IF NOT EXISTS capture_count INTEGER DEFAULT 1;

-- Verify the column was added
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'captured_tiles' ORDER BY ordinal_position;

-- Optional: Check current structure of captured_tiles
\d captured_tiles;
