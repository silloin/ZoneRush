-- Social Feed Tables
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    caption TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Achievements & XP Tables
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    xp_reward INTEGER DEFAULT 100,
    requirement JSONB
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Push Notification Tokens
CREATE TABLE IF NOT EXISTS push_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- Insert default achievements
INSERT INTO achievements (name, description, icon, xp_reward, requirement) VALUES
('First Run', 'Complete your first run', '🏃', 50, '{"runs": 1}'),
('5K Runner', 'Run 5 kilometers', '🎯', 100, '{"distance": 5}'),
('10K Runner', 'Run 10 kilometers', '🏅', 200, '{"distance": 10}'),
('Territory Starter', 'Claim your first tile', '🗺️', 50, '{"tiles": 1}'),
('Territory Master', 'Claim 100 tiles', '👑', 500, '{"tiles": 100}'),
('Social Butterfly', 'Share 10 runs', '🦋', 150, '{"posts": 10}'),
('Week Warrior', 'Maintain a 7-day streak', '🔥', 300, '{"streak": 7}'),
('Marathon Runner', 'Run 42 kilometers', '🏆', 1000, '{"distance": 42}')
ON CONFLICT DO NOTHING;

-- AI Recommendations Table
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50),
    title VARCHAR(200),
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    valid_until DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON ai_recommendations(user_id);
