-- Emergency Contacts Table
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_name VARCHAR(100) NOT NULL,
    contact_type VARCHAR(50) DEFAULT 'custom' CHECK (contact_type IN ('parent', 'friend', 'spouse', 'sibling', 'custom')),
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_priority ON emergency_contacts(user_id, priority);

-- Comments
COMMENT ON TABLE emergency_contacts IS 'Stores user emergency contacts for SOS alerts';
COMMENT ON COLUMN emergency_contacts.contact_type IS 'Type of relationship: parent, friend, spouse, sibling, or custom';
COMMENT ON COLUMN emergency_contacts.priority IS 'Order in which contacts should be notified (1 = first priority)';
