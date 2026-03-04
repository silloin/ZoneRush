CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    totalDistance NUMERIC DEFAULT 0,
    totalTiles INTEGER DEFAULT 0,
    weeklyMileage NUMERIC DEFAULT 0,
    role VARCHAR(10) DEFAULT 'user',
    trainingPlanId INTEGER,
    achievements TEXT[]
);

CREATE TABLE runs (
    id SERIAL PRIMARY KEY,
    userId INTEGER REFERENCES users(id),
    distance NUMERIC,
    duration INTEGER,
    avgPace NUMERIC,
    route JSONB
);

CREATE TABLE tiles (
    id SERIAL PRIMARY KEY,
    geoHash VARCHAR(20) UNIQUE NOT NULL,
    location GEOGRAPHY(Point, 4326),
    ownerId INTEGER REFERENCES users(id),
    capturedAt TIMESTAMPTZ DEFAULT NOW(),
    value INTEGER DEFAULT 1,
    zoneId INTEGER,
    history JSONB
);

CREATE TABLE zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    totalTiles INTEGER DEFAULT 0,
    kingId INTEGER REFERENCES users(id),
    queenId INTEGER REFERENCES users(id)
);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    startDate TIMESTAMPTZ NOT NULL,
    endDate TIMESTAMPTZ NOT NULL,
    goalType VARCHAR(50) NOT NULL,
    goalValue NUMERIC NOT NULL
);

CREATE TABLE training_plans (
    id SERIAL PRIMARY KEY,
    userId INTEGER REFERENCES users(id),
    planType VARCHAR(50) NOT NULL,
    workouts JSONB,
    startDate TIMESTAMPTZ DEFAULT NOW()
);
