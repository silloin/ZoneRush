CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    totaldistance NUMERIC DEFAULT 0,
    totaltiles INTEGER DEFAULT 0,
    weeklymileage NUMERIC DEFAULT 0,
    role VARCHAR(10) DEFAULT 'user',
    trainingplanid INTEGER,
    achievements TEXT[],
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak INTEGER DEFAULT 0,
    lastrundate DATE
);

CREATE TABLE runs (
    id SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES users(id),
    distance NUMERIC,
    duration INTEGER,
    avgpace NUMERIC,
    route JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tiles (
    id SERIAL PRIMARY KEY,
    geohash VARCHAR(20) UNIQUE NOT NULL,
    location GEOGRAPHY(Point, 4326),
    ownerid INTEGER REFERENCES users(id),
    capturedat TIMESTAMPTZ DEFAULT NOW(),
    value INTEGER DEFAULT 1,
    zoneid INTEGER,
    history JSONB
);

CREATE TABLE zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    totaltiles INTEGER DEFAULT 0,
    kingid INTEGER REFERENCES users(id),
    queenid INTEGER REFERENCES users(id)
);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    startDate TIMESTAMPTZ NOT NULL,
    endDate TIMESTAMPTZ NOT NULL,
    goalType VARCHAR(50) NOT NULL,
    goalValue NUMERIC NOT NULL,
    participants JSONB DEFAULT '[]'
);

CREATE TABLE training_plans (
    id SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES users(id),
    plantype VARCHAR(50) NOT NULL,
    workouts JSONB,
    startdate TIMESTAMPTZ DEFAULT NOW()
);
