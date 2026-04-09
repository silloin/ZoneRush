-- Migrate legacy tables to new column names if they exist (Run this early)
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;
DO $$
BEGIN
    -- Runs table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'runs' AND table_schema = 'public') THEN
        -- Rename legacy columns
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'runs' AND column_name = 'userid' AND table_schema = 'public') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'runs' AND column_name = 'user_id' AND table_schema = 'public') THEN
            ALTER TABLE runs RENAME COLUMN userid TO user_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'runs' AND column_name = 'avgpace' AND table_schema = 'public') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'runs' AND column_name = 'pace' AND table_schema = 'public') THEN
            ALTER TABLE runs RENAME COLUMN avgpace TO pace;
        END IF;
        
        -- Add missing columns using ALTER TABLE ... ADD COLUMN IF NOT EXISTS for simplicity and robustness
        EXECUTE 'ALTER TABLE runs ADD COLUMN IF NOT EXISTS calories INTEGER';
        EXECUTE 'ALTER TABLE runs ADD COLUMN IF NOT EXISTS elevation_gain NUMERIC';
        EXECUTE 'ALTER TABLE runs ADD COLUMN IF NOT EXISTS route_geometry GEOMETRY(LineString, 4326)';
        EXECUTE 'ALTER TABLE runs ADD COLUMN IF NOT EXISTS start_location GEOMETRY(Point, 4326)';
        EXECUTE 'ALTER TABLE runs ADD COLUMN IF NOT EXISTS end_location GEOMETRY(Point, 4326)';
        EXECUTE 'ALTER TABLE runs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ';
        EXECUTE 'ALTER TABLE runs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ';
    END IF;

    -- Captured Tiles table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'captured_tiles' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captured_tiles' AND column_name = 'userid' AND table_schema = 'public') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captured_tiles' AND column_name = 'user_id' AND table_schema = 'public') THEN
            ALTER TABLE captured_tiles RENAME COLUMN userid TO user_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captured_tiles' AND column_name = 'tileid' AND table_schema = 'public') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captured_tiles' AND column_name = 'tile_id' AND table_schema = 'public') THEN
            ALTER TABLE captured_tiles RENAME COLUMN tileid TO tile_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captured_tiles' AND column_name = 'runid' AND table_schema = 'public') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captured_tiles' AND column_name = 'run_id' AND table_schema = 'public') THEN
            ALTER TABLE captured_tiles RENAME COLUMN runid TO run_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captured_tiles' AND column_name = 'capturedat' AND table_schema = 'public') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captured_tiles' AND column_name = 'captured_at' AND table_schema = 'public') THEN
            ALTER TABLE captured_tiles RENAME COLUMN capturedat TO captured_at;
        END IF;
    END IF;

    -- Training Plans table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_plans' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_plans' AND column_name = 'userid' AND table_schema = 'public') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_plans' AND column_name = 'user_id' AND table_schema = 'public') THEN
            ALTER TABLE training_plans RENAME COLUMN userid TO user_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_plans' AND column_name = 'plantype' AND table_schema = 'public') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_plans' AND column_name = 'plan_type' AND table_schema = 'public') THEN
            ALTER TABLE training_plans RENAME COLUMN plantype TO plan_type;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_plans' AND column_name = 'startdate' AND table_schema = 'public') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_plans' AND column_name = 'start_date' AND table_schema = 'public') THEN
            ALTER TABLE training_plans RENAME COLUMN startdate TO start_date;
        END IF;
    END IF;

    -- Territories table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'territories' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'territories' AND column_name = 'userid' AND table_schema = 'public') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'territories' AND column_name = 'user_id' AND table_schema = 'public') THEN
            ALTER TABLE territories RENAME COLUMN userid TO user_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'territories' AND column_name = 'capturedat' AND table_schema = 'public') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'territories' AND column_name = 'captured_at' AND table_schema = 'public') THEN
            ALTER TABLE territories RENAME COLUMN capturedat TO captured_at;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'territories' AND column_name = 'tilescaptured' AND table_schema = 'public') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'territories' AND column_name = 'tiles_captured' AND table_schema = 'public') THEN
            ALTER TABLE territories RENAME COLUMN tilescaptured TO tiles_captured;
        END IF;

        -- Add missing columns to territories
        EXECUTE 'ALTER TABLE territories ADD COLUMN IF NOT EXISTS area_km2 NUMERIC';
        EXECUTE 'ALTER TABLE territories ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0';
        EXECUTE 'ALTER TABLE territories ADD COLUMN IF NOT EXISTS is_stolen BOOLEAN DEFAULT FALSE';
        EXECUTE 'ALTER TABLE territories ADD COLUMN IF NOT EXISTS stolen_from_id INTEGER REFERENCES users(id) ON DELETE SET NULL';
    END IF;

    -- Route Points table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'route_points' AND table_schema = 'public') THEN
        EXECUTE 'ALTER TABLE route_points ADD COLUMN IF NOT EXISTS altitude NUMERIC';
        EXECUTE 'ALTER TABLE route_points ADD COLUMN IF NOT EXISTS speed NUMERIC';
        EXECUTE 'ALTER TABLE route_points ADD COLUMN IF NOT EXISTS heading NUMERIC';
        EXECUTE 'ALTER TABLE route_points ADD COLUMN IF NOT EXISTS accuracy NUMERIC';
    END IF;

    -- Users table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lastrundate' AND table_schema = 'public') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_run_date' AND table_schema = 'public') THEN
            ALTER TABLE users RENAME COLUMN lastrundate TO last_run_date;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'totaldistance' AND table_schema = 'public') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'total_distance' AND table_schema = 'public') THEN
            ALTER TABLE users RENAME COLUMN totaldistance TO total_distance;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'totaltiles' AND table_schema = 'public') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'total_tiles' AND table_schema = 'public') THEN
            ALTER TABLE users RENAME COLUMN totaltiles TO total_tiles;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'weeklymileage' AND table_schema = 'public') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'weekly_mileage' AND table_schema = 'public') THEN
            ALTER TABLE users RENAME COLUMN weeklymileage TO weekly_mileage;
        END IF;
        
        -- Add other user columns
        EXECUTE 'ALTER TABLE users ADD COLUMN IF NOT EXISTS total_distance NUMERIC DEFAULT 0';
        EXECUTE 'ALTER TABLE users ADD COLUMN IF NOT EXISTS total_tiles INTEGER DEFAULT 0';
        EXECUTE 'ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_mileage NUMERIC DEFAULT 0';
        EXECUTE 'ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0';
        EXECUTE 'ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1';
        EXECUTE 'ALTER TABLE users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0';
        EXECUTE 'ALTER TABLE users ADD COLUMN IF NOT EXISTS total_territory_area NUMERIC DEFAULT 0';
        EXECUTE 'ALTER TABLE users ADD COLUMN IF NOT EXISTS territory_points INTEGER DEFAULT 0';
        EXECUTE 'ALTER TABLE users ADD COLUMN IF NOT EXISTS territories_captured INTEGER DEFAULT 0';
    END IF;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    profile_photo_url TEXT,
    total_distance NUMERIC DEFAULT 0,
    total_tiles INTEGER DEFAULT 0,
    weekly_mileage NUMERIC DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak INTEGER DEFAULT 0,
    role VARCHAR(10) DEFAULT 'user',
    training_plan_id INTEGER,
    last_run_date DATE,
    total_territory_area NUMERIC DEFAULT 0,
    territory_points INTEGER DEFAULT 0,
    fitness_level VARCHAR(20) DEFAULT 'beginner',
    best_5k_time NUMERIC,
    best_10k_time NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create runs table
CREATE TABLE IF NOT EXISTS runs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    distance NUMERIC,
    duration INTEGER,
    pace NUMERIC,
    calories INTEGER,
    elevation_gain NUMERIC,
    route_geometry GEOMETRY(LineString, 4326),
    start_location GEOMETRY(Point, 4326),
    end_location GEOMETRY(Point, 4326),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tiles table
CREATE TABLE IF NOT EXISTS tiles (
    id SERIAL PRIMARY KEY,
    geohash VARCHAR(20) UNIQUE NOT NULL,
    geometry GEOMETRY(Polygon, 4326),
    center_point GEOMETRY(Point, 4326),
    value INTEGER DEFAULT 1,
    zone_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create captured_tiles table
CREATE TABLE IF NOT EXISTS captured_tiles (
    id SERIAL PRIMARY KEY,
    tile_id INTEGER REFERENCES tiles(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    run_id INTEGER REFERENCES runs(id) ON DELETE SET NULL,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tile_id, user_id)
);

-- Create zones table
CREATE TABLE IF NOT EXISTS zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    total_tiles INTEGER DEFAULT 0,
    king_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    queen_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    goal_type VARCHAR(50) NOT NULL,
    goal_value NUMERIC NOT NULL,
    participants JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active'
);

-- Create challenges table
CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(50) NOT NULL, -- distance, duration, tiles, pace
    target_value NUMERIC NOT NULL,
    xp_reward INTEGER DEFAULT 100,
    valid_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_challenges table
CREATE TABLE IF NOT EXISTS user_challenges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
    current_progress NUMERIC DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, challenge_id)
);

-- Create training_plans table
CREATE TABLE IF NOT EXISTS training_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL,
    workouts JSONB,
    start_date TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- friend_request, achievement, system, etc.
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- Create route_points table
CREATE TABLE IF NOT EXISTS route_points (
    id SERIAL PRIMARY KEY,
    run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,
    altitude NUMERIC,
    speed NUMERIC,
    heading NUMERIC,
    accuracy NUMERIC,
    recorded_at TIMESTAMPTZ NOT NULL,
    sequence_order INTEGER NOT NULL
);

-- Create territories table
CREATE TABLE IF NOT EXISTS territories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    area GEOMETRY(Polygon, 4326) NOT NULL,
    area_km2 NUMERIC,
    points INTEGER DEFAULT 0,
    tiles_captured INTEGER DEFAULT 0,
    is_stolen BOOLEAN DEFAULT FALSE,
    stolen_from_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create territory_battles table
CREATE TABLE IF NOT EXISTS territory_battles (
    id SERIAL PRIMARY KEY,
    attacker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    defender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    attacker_area NUMERIC,
    defender_area NUMERIC,
    winner_id INTEGER REFERENCES users(id),
    points_transferred INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tiles_geohash ON tiles(geohash);
CREATE INDEX IF NOT EXISTS idx_captured_tiles_user_id ON captured_tiles(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_runs_route_geometry ON runs USING GIST(route_geometry);
CREATE INDEX IF NOT EXISTS idx_tiles_geometry ON tiles USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_territories_area ON territories USING GIST(area);
CREATE INDEX IF NOT EXISTS idx_territory_area ON territories USING GIST(area);
CREATE INDEX IF NOT EXISTS idx_territories_user_id ON territories(user_id);

-- Create route_heatmap table
CREATE TABLE IF NOT EXISTS route_heatmap (
    id SERIAL PRIMARY KEY,
    location GEOMETRY(Point, 4326) NOT NULL,
    geohash VARCHAR(12) NOT NULL UNIQUE,
    run_count INTEGER DEFAULT 1,
    total_runners INTEGER DEFAULT 1,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_route_heatmap_location ON route_heatmap USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_route_heatmap_geohash ON route_heatmap(geohash);
CREATE INDEX IF NOT EXISTS idx_route_heatmap_count ON route_heatmap(run_count DESC);

-- Create safety_contacts table
CREATE TABLE IF NOT EXISTS safety_contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create emergency_contacts table (Standardized version)
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_name VARCHAR(100) NOT NULL,
    contact_type VARCHAR(20) DEFAULT 'friend',
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sos_alerts table
CREATE TABLE IF NOT EXISTS sos_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'active', -- active, resolved, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);

-- Create user_friends table
CREATE TABLE IF NOT EXISTS user_friends (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_user_friends_user ON user_friends(user_id);

CREATE INDEX IF NOT EXISTS idx_safety_contacts_user_id ON safety_contacts(user_id);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_user_id ON sos_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created_at ON sos_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_challenges_valid_date ON challenges(valid_date);
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);

-- Create ai_recommendations table
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(10) DEFAULT 'medium',
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_created_at ON ai_recommendations(created_at DESC);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create global_messages table
CREATE TABLE IF NOT EXISTS global_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_global_messages_created ON global_messages(created_at DESC);

-- Create clans table
CREATE TABLE IF NOT EXISTS clans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    leader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    total_territory_area NUMERIC DEFAULT 0,
    member_count INTEGER DEFAULT 1,
    ranking INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create clan_members table
CREATE TABLE IF NOT EXISTS clan_members (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER REFERENCES clans(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- leader, admin, member
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create clan_territories table
CREATE TABLE IF NOT EXISTS clan_territories (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER REFERENCES clans(id) ON DELETE CASCADE,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(territory_id)
);

CREATE INDEX IF NOT EXISTS idx_clans_ranking ON clans(ranking);
CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_territories_clan ON clan_territories(clan_id);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    plan_type VARCHAR(50) DEFAULT 'free', -- free, pro
    status VARCHAR(50), -- active, cancelled, past_due
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create virtual_items table
CREATE TABLE IF NOT EXISTS virtual_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_xp INTEGER DEFAULT 0,
    item_type VARCHAR(50), -- skin, emote, avatar
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_inventory table
CREATE TABLE IF NOT EXISTS user_inventory (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES virtual_items(id) ON DELETE CASCADE,
    is_equipped BOOLEAN DEFAULT FALSE,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user ON user_inventory(user_id);


-- Create clan_competitions table
CREATE TABLE IF NOT EXISTS clan_competitions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create clan_competition_stats table
CREATE TABLE IF NOT EXISTS clan_competition_stats (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER REFERENCES clan_competitions(id) ON DELETE CASCADE,
    clan_id INTEGER REFERENCES clans(id) ON DELETE CASCADE,
    distance_covered NUMERIC DEFAULT 0,
    tiles_captured INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    UNIQUE(competition_id, clan_id)
);




