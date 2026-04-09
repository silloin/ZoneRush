-- Chat and Notification System Schema
-- This migration adds tables for friend requests, private messages, global chat, and notifications

-- ============================================
-- FRIEND REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS friend_requests (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sender_id, receiver_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

-- ============================================
-- MESSAGES TABLE (Private Messages)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_by_sender BOOLEAN DEFAULT FALSE,
    deleted_by_receiver BOOLEAN DEFAULT FALSE
);

-- Indexes for message retrieval
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = FALSE;

-- ============================================
-- GLOBAL MESSAGES TABLE (Public Chat)
-- ============================================
CREATE TABLE IF NOT EXISTS global_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited BOOLEAN DEFAULT FALSE,
    deleted BOOLEAN DEFAULT FALSE
);

-- Index for retrieving recent global messages
CREATE INDEX IF NOT EXISTS idx_global_messages_created ON global_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_messages_sender ON global_messages(sender_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('friend_request', 'message', 'global_message', 'achievement', 'system')),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- ============================================
-- USER FCM TOKENS TABLE (For Push Notifications)
-- ============================================
CREATE TABLE IF NOT EXISTS user_fcm_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    device_info VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user ON user_fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON user_fcm_tokens(is_active) WHERE is_active = TRUE;

-- ============================================
-- CONVERSATIONS VIEW (for easier querying)
-- ============================================
CREATE OR REPLACE VIEW user_conversations AS
SELECT DISTINCT
    CASE 
        WHEN m.sender_id < m.receiver_id THEN m.sender_id
        ELSE m.receiver_id
    END AS conversation_id,
    CASE 
        WHEN m.sender_id < m.receiver_id THEN m.sender_id
        ELSE m.receiver_id
    END AS user1_id,
    CASE 
        WHEN m.sender_id < m.receiver_id THEN m.receiver_id
        ELSE m.sender_id
    END AS user2_id,
    COUNT(*) FILTER (WHERE m.is_read = FALSE AND m.receiver_id = u.id) AS unread_count,
    MAX(m.created_at) AS last_message_at
FROM messages m
CROSS JOIN LATERAL (SELECT id FROM users LIMIT 1) u
GROUP BY 
    CASE 
        WHEN m.sender_id < m.receiver_id THEN m.sender_id
        ELSE m.receiver_id
    END,
    CASE 
        WHEN m.sender_id < m.receiver_id THEN m.sender_id
        ELSE m.receiver_id
    END,
    CASE 
        WHEN m.sender_id < m.receiver_id THEN m.receiver_id
        ELSE m.sender_id
    END,
    u.id;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE friend_requests IS 'Stores friend request relationships between users';
COMMENT ON TABLE messages IS 'Private one-to-one messages between users';
COMMENT ON TABLE global_messages IS 'Public chat messages visible to all users';
COMMENT ON TABLE notifications IS 'User notifications for various events';
COMMENT ON TABLE user_fcm_tokens IS 'Firebase Cloud Messaging tokens for push notifications';
