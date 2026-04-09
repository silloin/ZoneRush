-- ============================================
-- SOCIAL FEATURES SCHEMA
-- Adds support for posts, likes, and post comments
-- ============================================

-- Posts Table
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    run_id INTEGER REFERENCES runs(id) ON DELETE SET NULL,
    caption TEXT,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_run ON posts(run_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

-- Likes Table (for posts)
CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
);

CREATE INDEX idx_likes_post ON likes(post_id);
CREATE INDEX idx_likes_user ON likes(user_id);

-- Update Comments Table to support both runs and posts
-- First, check if we need to add post_id column
DO $$ 
BEGIN
    -- Add post_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'post_id') THEN
        ALTER TABLE comments ADD COLUMN post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE;
    END IF;
    
    -- Rename comment_text to text if needed (or add text as alias)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'comments' AND column_name = 'comment_text') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'comments' AND column_name = 'text') THEN
        ALTER TABLE comments RENAME COLUMN comment_text TO text;
    END IF;
    
    -- Make sure run_id is nullable (comments can be on posts OR runs)
    ALTER TABLE comments ALTER COLUMN run_id DROP NOT NULL;
END $$;

-- Add indexes for post comments
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at DESC);

-- Update trigger to handle kudos/likes count on posts
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    -- This function can be used to maintain a denormalized likes count on posts
    -- For now, we'll use COUNT(*) in queries for simplicity
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_likes
AFTER INSERT OR DELETE ON likes
FOR EACH ROW
EXECUTE FUNCTION update_post_likes_count();

-- Create view for social feed with all necessary data
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
    r.route_geometry,
    (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN runs r ON p.run_id = r.id
ORDER BY p.created_at DESC;

COMMENT ON TABLE posts IS 'Social posts shared by users, optionally linked to runs';
COMMENT ON TABLE likes IS 'Likes on social posts';
COMMENT ON TABLE comments IS 'Comments on posts or runs (dual-purpose)';
