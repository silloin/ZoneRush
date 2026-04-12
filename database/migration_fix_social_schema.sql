-- ============================================
-- MIGRATION: Fix Social Schema Issues
-- Adds missing columns and tables for social features
-- ============================================

-- 1. Add missing columns to users table if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS fitness_level VARCHAR(20) DEFAULT 'beginner';
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS territories_captured INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_territory_area DECIMAL(12, 2) DEFAULT 0;

-- 2. Create posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    run_id INTEGER REFERENCES runs(id) ON DELETE SET NULL,
    caption TEXT,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_run ON posts(run_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

-- 3. Create likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);

-- 4. Update comments table to support both runs and posts
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    text TEXT,
    comment_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add post_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='post_id') THEN
        ALTER TABLE comments ADD COLUMN post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add text column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='text') THEN
        ALTER TABLE comments ADD COLUMN text TEXT;
    END IF;
END $$;

-- If there's existing comment_text data and no text data, copy it over
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='comment_text') THEN
        UPDATE comments SET text = comment_text WHERE text IS NULL AND comment_text IS NOT NULL;
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_run ON comments(run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id, created_at DESC);

-- 5. Create followers table if it doesn't exist
CREATE TABLE IF NOT EXISTS followers (
    id SERIAL PRIMARY KEY,
    follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id);

-- 6. Create kudos table if it doesn't exist
CREATE TABLE IF NOT EXISTS kudos (
    id SERIAL PRIMARY KEY,
    run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(run_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_kudos_run ON kudos(run_id);
CREATE INDEX IF NOT EXISTS idx_kudos_user ON kudos(user_id);

-- 7. Create or update views for social feed
CREATE OR REPLACE VIEW social_feed AS
SELECT 
    p.id as post_id,
    p.user_id,
    p.run_id,
    p.caption,
    p.image_url,
    p.created_at,
    u.username,
    u.profile_picture,
    r.distance,
    r.duration,
    r.pace,
    (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN runs r ON p.run_id = r.id
ORDER BY p.created_at DESC;

-- 8. Add comment on tables
COMMENT ON TABLE posts IS 'Social posts shared by users, optionally linked to runs';
COMMENT ON TABLE likes IS 'Likes on social posts';
COMMENT ON TABLE comments IS 'Comments on posts or runs (dual-purpose table)';
COMMENT ON TABLE followers IS 'User follow relationships';
COMMENT ON TABLE kudos IS 'Kudos/appreciation for runs';

-- Verify schema
SELECT 'Migration completed successfully' as status;
