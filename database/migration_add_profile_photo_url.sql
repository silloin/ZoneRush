-- Migration: Add profile_photo_url column to users table
-- Run this if the column doesn't exist

-- Add profile_photo_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'profile_photo_url'
    ) THEN
        ALTER TABLE users ADD COLUMN profile_photo_url TEXT;
        RAISE NOTICE 'Added profile_photo_url column to users table';
    ELSE
        RAISE NOTICE 'profile_photo_url column already exists';
    END IF;
END $$;

-- Also add profile_picture column as an alias if needed (for backward compatibility)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'profile_picture'
    ) THEN
        -- Create it as a generated column or just leave it, we'll use views/aliases instead
        RAISE NOTICE 'profile_picture column not needed - using profile_photo_url with alias';
    END IF;
END $$;

-- Verify the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('profile_photo_url', 'profile_picture')
ORDER BY column_name;
