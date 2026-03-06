-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS training_plans CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS tiles CASCADE;
DROP TABLE IF EXISTS runs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
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
    createdat TIMESTAMPTZ DEFAULT NOW()
);

-- Create runs table
CREATE TABLE runs (
    id SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES users(id) ON DELETE CASCADE,
    distance NUMERIC,
    duration INTEGER,
    avgpace NUMERIC,
    route JSONB,
    createdat TIMESTAMPTZ DEFAULT NOW()
);

-- Create tiles table
CREATE TABLE tiles (
    id SERIAL PRIMARY KEY,
    geohash VARCHAR(20) UNIQUE NOT NULL,
    location GEOGRAPHY(Point, 4326),
    ownerid INTEGER REFERENCES users(id) ON DELETE SET NULL,
    capturedat TIMESTAMPTZ DEFAULT NOW(),
    value INTEGER DEFAULT 1,
    zoneid INTEGER,
    history JSONB DEFAULT '[]'::jsonb
);

-- Create zones table
CREATE TABLE zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    totaltiles INTEGER DEFAULT 0,
    kingid INTEGER REFERENCES users(id) ON DELETE SET NULL,
    queenid INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Create events table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    startdate TIMESTAMPTZ NOT NULL,
    enddate TIMESTAMPTZ NOT NULL,
    goaltype VARCHAR(50) NOT NULL,
    goalvalue NUMERIC NOT NULL,
    status VARCHAR(20) DEFAULT 'active'
);

-- Create training_plans table
CREATE TABLE training_plans (
    id SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES users(id) ON DELETE CASCADE,
    plantype VARCHAR(50) NOT NULL,
    workouts JSONB,
    startdate TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_tiles_geohash ON tiles(geohash);
CREATE INDEX idx_tiles_ownerid ON tiles(ownerid);
CREATE INDEX idx_runs_userid ON runs(userid);
CREATE INDEX idx_users_email ON users(email);
