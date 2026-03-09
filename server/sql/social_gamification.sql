-- Social Feed Tables
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES users(id) ON DELETE CASCADE,
    runid INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    caption TEXT,
    createdat TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES users(id) ON DELETE CASCADE,
    postid INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    createdat TIMESTAMP DEFAULT NOW(),
    UNIQUE(userid, postid)
);

CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES users(id) ON DELETE CASCADE,
    postid INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    createdat TIMESTAMP DEFAULT NOW()
);

-- Achievements & XP Tables
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    xpreward INTEGER DEFAULT 100,
    requirement JSONB
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievementid INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    unlockedat TIMESTAMP DEFAULT NOW(),
    UNIQUE(userid, achievementid)
);

-- Add XP and Level to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lastrundate DATE;

-- Push Notification Tokens
CREATE TABLE IF NOT EXISTS push_tokens (
    id SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20),
    createdat TIMESTAMP DEFAULT NOW(),
    UNIQUE(userid, token)
);

-- Insert default achievements
INSERT INTO achievements (name, description, icon, xpreward, requirement) VALUES
('First Run', 'Complete your first run', '🏃', 50, '{"runs": 1}'),
('5K Runner', 'Run 5 kilometers', '🎯', 100, '{"distance": 5}'),
('10K Runner', 'Run 10 kilometers', '🏅', 200, '{"distance": 10}'),
('Territory Starter', 'Claim your first tile', '🗺️', 50, '{"tiles": 1}'),
('Territory Master', 'Claim 100 tiles', '👑', 500, '{"tiles": 100}'),
('Social Butterfly', 'Share 10 runs', '🦋', 150, '{"posts": 10}'),
('Week Warrior', 'Maintain a 7-day streak', '🔥', 300, '{"streak": 7}'),
('Marathon Runner', 'Run 42 kilometers', '🏆', 1000, '{"distance": 42}')
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_userid ON posts(userid);
CREATE INDEX IF NOT EXISTS idx_posts_createdat ON posts(createdat DESC);
CREATE INDEX IF NOT EXISTS idx_likes_postid ON likes(postid);
CREATE INDEX IF NOT EXISTS idx_comments_postid ON comments(postid);
CREATE INDEX IF NOT EXISTS idx_user_achievements_userid ON user_achievements(userid);
CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level DESC);

-- Add participants column to events table if it doesn't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]';
