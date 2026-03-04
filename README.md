# RunTerra - Real-time GPS Territory Capture Game

A competitive real-time GPS-based territory capture game where runners compete to claim geographic tiles through physical movement. Built with Node.js/Express backend and React frontend.

**Status**: Production Ready | **Last Updated**: March 2026

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Quick Start](#quick-start)
4. [Installation Guide](#installation-guide)
5. [API Endpoints](#api-endpoints)
6. [Architecture](#architecture)
7. [Contributing](#contributing)
8. [License](#license)

---

## Features

### Core Gameplay
- **Tile Capture System**: Capture geographic tiles (geohashed locations) by running through them
- **Territory Ownership**: Compete with other players to claim and defend territory
- **Live Leaderboards**: Real-time global and city-based rankings
- **Run Tracking**: Upload and track GPX files from running apps (Strava, Garmin, etc.)

### Real-time Features
- **Live Location Tracking**: See other players moving on the map in real-time
- **Instant Tile Updates**: Watch the map change as players capture tiles
- **Achievement System**: Unlock badges for completing milestones
- **In-game Chat**: Communicate with other players
- **Zone Rankings**: Compete for dominance in specific geographic zones

### Performance Features
- **Geohash-based Tiles**: Efficient spatial indexing using Geohash
- **PostGIS Integration**: Advanced geographic database queries
- **Real-time Sockets**: WebSocket-based instant updates via Socket.io

---

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with PostGIS
- **Real-time**: Socket.io
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **GPX Parsing**: xml2js

### Frontend
- **Framework**: React with Vite
- **Maps**: Google Maps API
- **Real-time**: Socket.io client
- **Styling**: CSS3

### Active Dependencies (10 total)
- bcryptjs - Password hashing
- cors - CORS handling
- dotenv - Environment variables
- express - Web framework
- jsonwebtoken - JWT authentication
- multer - File uploads
- ngeohash - Geohashing library
- pg - PostgreSQL driver
- socket.io - Real-time events
- xml2js - GPX parsing

---

## Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm or yarn
- Git

### Fast Setup (3 minutes)

```bash
# Clone repository
git clone https://github.com/silloin/gps.git
cd gps

# Setup backend
cd server
cp .env.example .env  # Edit database credentials
npm install
npm run dev

# In new terminal, setup frontend
cd client
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## Installation Guide

### Prerequisites Verification

```bash
node --version    # v16.0.0+
npm --version     # 7.0.0+
psql --version    # PostgreSQL 12.0+
git --version     # git 2.30+
```

### Step 1: Database Setup

```bash
# Create PostgreSQL database
psql -U postgres

# In PostgreSQL shell:
CREATE DATABASE runterra;
CREATE USER runterra_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE runterra TO runterra_user;

# Enable PostGIS
\c runterra
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
\q
```

### Step 2: Initialize Database Schema

```bash
psql -U runterra_user -d runterra -f sql/create_tables.sql
```

### Step 3: Backend Setup

```bash
cd server
npm install
```

Create `server/.env`:
```env
DB_USER=runterra_user
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_DATABASE=runterra
DB_PORT=5432
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key
CORS_ORIGIN=http://localhost:5173
```

Verify database connection:
```bash
npm run dev
# Look for: "Database connected on [timestamp]"
```

### Step 4: Frontend Setup

```bash
cd client
npm install
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

Obtain Google Maps API key:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable Maps JavaScript API
4. Create API key

Start frontend:
```bash
npm run dev
```

### Step 5: Test Setup

**Backend Test:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"pass"}'
```

**Frontend Test:**
- Visit `http://localhost:5173`
- Should load without errors
- No console errors

---

## API Endpoints

All requests use `http://localhost:5000/api` as base URL.

### Authentication

#### Register User
```
POST /auth/register
Content-Type: application/json

{
  "username": "runner_name",
  "email": "user@example.com",
  "password": "securepassword123"
}

Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Login User
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}

Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Users

#### Get Leaderboard
```
GET /users/leaderboard?city=New York

Query Parameters:
- city (optional): Filter by city name

Response (200):
[
  {
    "username": "runner1",
    "totalTiles": 1250,
    "totalDistance": 524.3,
    "city": "New York"
  }
]
```

#### Monthly Prize Draw
```
POST /users/prize-draw
Headers: x-auth-token: <JWT_TOKEN>

Response (200):
{
  "winner": "runner1",
  "prize": "RunTerra Pro Achievement Badge + $25 Gear Voucher"
}
```

### Runs

#### Create Run
```
POST /runs
Content-Type: application/json
Headers: x-auth-token: <JWT_TOKEN>

{
  "distance": 5.2,
  "duration": 1800,
  "avgPace": 5.77,
  "route": [
    { "lat": 40.7128, "lng": -74.0060 },
    { "lat": 40.7130, "lng": -74.0058 }
  ]
}

Response (200):
{
  "id": 455,
  "userId": 12,
  "distance": 5.2,
  "duration": 1800,
  "avgPace": 5.77,
  "createdAt": "2026-03-04T10:30:00Z"
}
```

#### Get User Runs
```
GET /runs
Headers: x-auth-token: <JWT_TOKEN>

Response (200):
[
  {
    "id": 455,
    "userId": 12,
    "distance": 5.2,
    "duration": 1800,
    "avgPace": 5.77,
    "createdAt": "2026-03-04T10:30:00Z"
  }
]
```

### Tiles

#### Capture Tiles
```
POST /tiles/capture
Content-Type: application/json
Headers: x-auth-token: <JWT_TOKEN>

{
  "route": [
    { "lat": 40.7128, "lng": -74.0060 },
    { "lat": 40.7130, "lng": -74.0058 },
    { "lat": 40.7135, "lng": -74.0055 }
  ]
}

Response (200):
[
  {
    "id": 1,
    "geohash": "dr5regf",
    "ownerId": 12,
    "capturedAt": "2026-03-04T10:30:00Z",
    "history": []
  }
]
```

#### Get All Tiles
```
GET /tiles

Response (200):
[
  {
    "id": 1,
    "geohash": "dr5regf",
    "ownerId": 12,
    "capturedAt": "2026-03-04T10:30:00Z"
  }
]
```

### GPX Files

#### Upload GPX File
```
POST /gpx/upload
Content-Type: multipart/form-data
Headers: x-auth-token: <JWT_TOKEN>

Form Data:
- gpxFile: <GPX_FILE>

Response (200):
{
  "msg": "GPX file uploaded successfully",
  "run": {
    "id": 456,
    "userId": 12,
    "distance": 10.5,
    "duration": 3600,
    "avgPace": 5.71,
    "createdAt": "2026-03-04T10:30:00Z"
  }
}
```

#### Get All Runs
```
GET /gpx

Response (200):
[
  {
    "id": 456,
    "userId": 12,
    "distance": 10.5,
    "duration": 3600,
    "avgPace": 5.71,
    "createdAt": "2026-03-04T10:30:00Z"
  }
]
```

### Zones & Events

#### Get All Zones
```
GET /zones

Response (200):
[
  {
    "id": 1,
    "name": "Central Park",
    "ownerId": 12,
    "totalTiles": 156
  }
]
```

#### Get All Events
```
GET /events

Response (200):
[
  {
    "id": 1,
    "name": "Manhattan Takeover",
    "description": "Capture 50 tiles in Manhattan",
    "status": "active",
    "prize": "Limited Edition Badge"
  }
]
```

### Training Plans

#### Create Training Plan
```
POST /training-plans
Content-Type: application/json
Headers: x-auth-token: <JWT_TOKEN>

{
  "planType": "beginner",
  "workouts": [
    {
      "day": "Monday",
      "type": "easy",
      "distance": 3.0,
      "duration": 1800
    }
  ]
}
```

#### Get User Training Plan
```
GET /training-plans
Headers: x-auth-token: <JWT_TOKEN>

Response (200):
{
  "id": 1,
  "userId": 12,
  "planType": "beginner",
  "workouts": [...]
}
```

### Real-time Socket Events

#### Client → Server
- `user-join` - User connects to the game
- `tile-capture` - User captures a tile
- `run-start` - Start running
- `run-complete` - Finish running
- `location-update` - Send live location
- `zone-ranking-update` - Update zone rankings
- `send-message` - Send chat message
- `achievement-unlock` - Unlock achievement
- `request-leaderboard` - Request leaderboard data

#### Server → Client
- `users-online` - List of online users
- `tile-captured` - Someone captured a tile
- `run-started` - Someone started running
- `run-completed` - Someone finished running
- `location-updated` - User location changed
- `zone-rankings-updated` - Zone rankings changed
- `message-received` - New chat message
- `achievement-unlocked` - Someone unlocked achievement
- `leaderboard-update` - Leaderboard data

---

## Architecture

### System Overview

```
┌─────────────────────────────────────┐
│   React Client (Port 5173)          │
│  ├── Pages: Map, Profile, etc       │
│  ├── Socket.io: Real-time           │
│  └── Google Maps: Visualization     │
└──────────────┬──────────────────────┘
               │ HTTP + WebSocket
     ┌─────────┴──────────┐
     │                    │
┌────▼────────────────┐   │   ┌─────────────────────┐
│ Express Server      │   │   │ PostgreSQL Database │
│ (Port 5000)         │◄──┤   │ ├── Tables         │
│ ├── REST API        │   │   │ └── PostGIS        │
│ ├── JWT Auth        │   │   └─────────────────────┘
│ ├── Socket.io       │   │
│ └── GPX Handler     │   │
└────────────────────┘   │
      ▲                   │
      │ Connection Pool   │
      └───────────────────┘
```

### Backend Components

**Express Server** (`server.js`)
- HTTP server initialization
- CORS configuration
- Socket.io attachment
- Route mounting
- Global error handling

**Database Layer** (`config/db.js`)
- PostgreSQL connection pool
- Query execution management

**Middleware** (`middleware/auth.js`)
- JWT token verification
- User authentication

**Route Handlers** (`routes/*`)
- RESTful endpoint definitions
- Business logic orchestration
- Database queries

**Real-time Handler** (`sockets.js`)
- Socket.io connection management
- User presence tracking
- Event broadcasting

### Data Flows

**Tile Capture Flow:**
1. User's GPS location → Client
2. Coordinates sent → POST /api/tiles/capture
3. Server geohashes coordinates → ngeohash library
4. Check tile ownership → PostgreSQL query
5. Update tile in database → INSERT/UPDATE
6. Emit socket event → io.emit('tile-captured')
7. All clients receive update → Real-time display

**Authentication Flow:**
1. User registers → POST /api/auth/register
2. Password hashed → bcryptjs
3. User created → INSERT INTO users
4. JWT token generated → jwt.sign()
5. Token returned → Client localStorage
6. Client sends token → x-auth-token header
7. Middleware verifies → jwt.verify()
8. User extracted → req.user populated

**GPX Upload Flow:**
1. User uploads file → POST /api/gpx/upload
2. Multer parses file → Memory storage
3. xml2js parses XML → Track points extracted
4. Distance calculated → Haversine formula
5. Run stored → INSERT INTO runs
6. Response sent → Run object returned

### Database Schema

**Tables:**
- `users` - User accounts and profiles
- `runs` - Recorded runs with route data
- `tiles` - Geographic tiles with ownership history
- `zones` - Geographic zones/regions
- `events` - Game events and challenges
- `training_plans` - User training plans

See `server/sql/create_tables.sql` for full schema.

### Project Structure

```
.
├── server/                 # Node.js backend
│   ├── config/            # Database configuration
│   ├── controllers/       # Business logic (userController)
│   ├── middleware/        # Express middleware
│   ├── routes/            # API endpoints (8 route files)
│   ├── sql/               # Database schemas
│   ├── sockets.js         # Real-time event handlers
│   ├── server.js          # Entry point
│   └── package.json       # Dependencies
│
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   └── App.jsx        # Root component
│   └── public/            # Static assets
│
└── README.md              # This file
```

---

## Key Improvements Made

### Database Migration (MongoDB → PostgreSQL)
✓ Completed migration from MongoDB/Mongoose to PostgreSQL direct queries
✓ Implemented PostGIS for efficient geographic queries
✓ All 7 orphaned Mongoose controllers removed
✓ Direct SQL queries in all routes

### GPX Support
✓ Full GPX file upload and parsing
✓ Automatic distance/duration/pace calculation
✓ Haversine formula for accurate distance computation

### Real-time Features
✓ Comprehensive Socket.io implementation
✓ User presence tracking
✓ Live location updates
✓ Real-time tile capture broadcasts

### Code Quality
✓ Removed 2 unused npm dependencies (geolib, gpxparser)
✓ Cleaned up orphaned directory structures
✓ Fixed case-sensitivity bugs in database queries
✓ 100% syntax validation passing

---

## Security

- **JWT Authentication**: Secure token-based authentication with 360,000 second expiration
- **Password Hashing**: bcryptjs with 10 salt rounds
- **CORS**: Configured for specific origins
- **Input Validation**: Multer file type validation for GPX uploads
- **Protected Routes**: Private endpoints require JWT token
- **SQL Injection Prevention**: Parameterized queries throughout

---

## Performance Optimizations

- **Geohash Indexing**: O(1) tile lookups
- **Connection Pooling**: PostgreSQL pool for 10 concurrent connections
- **In-memory User Tracking**: Fast user presence updates via Map
- **JSON Storage**: Efficient route data storage

---

## Development

### Running Locally

```bash
# Terminal 1: Backend
cd server
npm run dev     # Runs with nodemon for auto-reload

# Terminal 2: Frontend
cd client
npm run dev     # Runs on port 5173
```

### Debugging

Backend: `http://localhost:5000`
Frontend: `http://localhost:5173`

View logs:
```bash
# Backend logs in your terminal
# Frontend: Open browser DevTools (F12)
```

### Code Style
- Follows Node.js conventions
- Consistent 2-space indentation
- Clear variable naming
- Modular code structure

---

## Contributing

### Setup Development Environment

```bash
git clone https://github.com/silloin/gps.git
cd gps
git checkout -b feature/your-feature-name
```

### Code Guidelines

**Commits:**
- Use clear commit messages
- Format: `type(scope): description`
- Examples: `feat(tiles): add tile validation`, `fix(auth): resolve JWT expiration`

**Code:**
- Keep functions small and focused
- Use meaningful variable names
- Comment complex logic
- Follow existing code patterns

**Backend:**
- Use parameterized queries (prevent SQL injection)
- Handle errors with try/catch
- Return consistent JSON responses
- Use HTTP status codes correctly

**Frontend:**
- Use functional components with hooks
- Keep components small
- Separate concerns (logic, presentation)
- Handle loading and error states

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature/name`
3. Make changes with clear commits
4. Push to fork: `git push origin feature/name`
5. Create Pull Request with description
6. Address review feedback

---

## Troubleshooting

### Database Connection Error
```bash
# Verify PostgreSQL is running
psql -U postgres

# Check credentials in .env
# Test connection:
psql -U runterra_user -d runterra -c "SELECT 1"
```

### Port Already in Use
```bash
# Find process on port
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port
PORT=5001 npm start
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors
```bash
# Verify CORS_ORIGIN in .env
# Restart backend server
# Check API URL in client .env
```

---

## Production Deployment

### Environment Variables
```env
NODE_ENV=production
DB_HOST=production-db-server
DB_USER=prod_user
DB_PASSWORD=strong_password
JWT_SECRET=very_long_random_secret
CORS_ORIGIN=https://yourdomain.com
```

### Database Backup
```bash
pg_dump -U runterra_user -d runterra > backup.sql
psql -U runterra_user -d runterra < backup.sql
```

### Process Management (PM2)
```bash
npm install -g pm2
pm2 start server.js --name "runterra"
pm2 startup
pm2 save
```

---

## Roadmap

- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] Advanced analytics dashboard
- [ ] Team/guild system
- [ ] Seasonal leaderboards
- [ ] Sponsorship/rewards system

---

## Support

- **Issues**: Open an issue on [GitHub](https://github.com/silloin/gps/issues)
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: See inline code comments and markdown files

---

## License

MIT License - See LICENSE file for details.

---

## Authors

GPS Territory Capture Game Team

---

**Repository**: https://github.com/silloin/gps
**Last Updated**: March 2026
**Status**: Production Ready ✅
