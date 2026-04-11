-- Add missing text column to comments table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='text') THEN
        ALTER TABLE comments ADD COLUMN text TEXT NOT NULL DEFAULT '';
    END IF;
END $$;
