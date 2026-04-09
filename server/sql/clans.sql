-- Clan/Team System Schema
CREATE TABLE IF NOT EXISTS clans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    leader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    total_territory_area NUMERIC DEFAULT 0,
    member_count INTEGER DEFAULT 1,
    ranking INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clan_members (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER REFERENCES clans(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- leader, admin, member
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id) -- A user can only be in one clan
);

-- Weekly Clan Competitions
CREATE TABLE IF NOT EXISTS clan_competitions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS clan_competition_stats (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER REFERENCES clan_competitions(id) ON DELETE CASCADE,
    clan_id INTEGER REFERENCES clans(id) ON DELETE CASCADE,
    distance_covered NUMERIC DEFAULT 0,
    tiles_captured INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    UNIQUE(competition_id, clan_id)
);

-- Clan Territory Ownership
CREATE TABLE IF NOT EXISTS clan_territories (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER REFERENCES clans(id) ON DELETE CASCADE,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    captured_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(territory_id) -- One clan per territory
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clans_ranking ON clans(ranking);
CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_territories_clan ON clan_territories(clan_id);
