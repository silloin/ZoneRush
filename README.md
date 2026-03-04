# RunTerra - Real-time GPS Territory Capture Game

A competitive real-time GPS-based territory capture game where runners compete to claim geographic tiles through physical movement. Built with Node.js/Express backend and React frontend.

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
- **Geohash-based Tiles**: Efficient spatial indexing using H3/Geohash
- **PostGIS Integration**: Advanced geographic database queries
- **Real-time Sockets**: WebSocket-based instant updates via Socket.io

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

## Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm or yarn

### Server Setup

```bash
cd server
npm install
```

Create `.env` file:
```
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_DATABASE=runterra
DB_PORT=5432
JWT_SECRET=your_jwt_secret_key
PORT=5000
```

Run schema:
```bash
psql -U postgres -d runterra -f sql/create_tables.sql
```

Start server:
```bash
npm run dev  # Development with nodemon
npm start    # Production
```

### Client Setup

```bash
cd client
npm install
npm run dev
```

Visit `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/leaderboard` - Get global leaderboard
- `POST /api/users/prize-draw` - Random prize winner selection

### Runs
- `POST /api/runs` - Create run
- `GET /api/runs` - Get user's runs

### Tiles
- `POST /api/tiles/capture` - Capture tiles from route
- `GET /api/tiles` - Get all tiles

### GPX Files
- `POST /api/gpx/upload` - Upload and parse GPX file
- `GET /api/gpx` - Get all runs

### Zones
- `GET /api/zones` - Get all zones

### Events
- `GET /api/events` - Get all events

### Training Plans
- `POST /api/training-plans` - Create training plan
- `GET /api/training-plans` - Get user's plan

## Real-time Socket Events

### Client → Server
- `user-join` - User connects to the game
- `tile-capture` - User captures a tile
- `run-start` - Start running
- `run-complete` - Finish running
- `location-update` - Send live location
- `zone-ranking-update` - Update zone rankings
- `send-message` - Send chat message
- `achievement-unlock` - Unlock achievement
- `request-leaderboard` - Request leaderboard data

### Server → Client
- `users-online` - List of online users
- `tile-captured` - Someone captured a tile
- `run-started` - Someone started running
- `run-completed` - Someone finished running
- `location-updated` - User location changed
- `zone-rankings-updated` - Zone rankings changed
- `message-received` - New chat message
- `achievement-unlocked` - Someone unlocked achievement
- `leaderboard-update` - Leaderboard data

## Database Schema

### Tables
- **users** - User accounts and profiles
- **runs** - Recorded runs with route data
- **tiles** - Geographic tiles with ownership history
- **zones** - Geographic zones/regions
- **events** - Game events and challenges
- **training_plans** - User training plans

See `server/sql/create_tables.sql` for full schema.

## Project Structure

```
.
├── server/                 # Node.js backend
│   ├── config/            # Database configuration
│   ├── controllers/       # Business logic
│   ├── middleware/        # Express middleware
│   ├── routes/            # API route handlers
│   ├── sql/               # Database schemas
│   ├── sockets.js         # Real-time event handlers
│   └── server.js          # Entry point
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

## Key Improvements Made

### Database Migration (MongoDB → PostgreSQL)
- Completed migration from MongoDB/Mongoose to PostgreSQL direct queries
- Implemented PostGIS for efficient geographic queries
- All 7 orphaned Mongoose controllers removed
- Direct SQL queries in all routes

### GPX Support
- Full GPX file upload and parsing
- Automatic distance/duration/pace calculation
- Haversine formula for accurate distance computation

### Real-time Features
- Comprehensive Socket.io implementation
- User presence tracking
- Live location updates
- Real-time tile capture broadcasts

### Code Quality
- Removed 2 unused npm dependencies (geolib, gpxparser)
- Cleaned up orphaned directory structures
- Fixed case-sensitivity bugs in database queries
- 100% syntax validation passing

## Security

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for password security
- **CORS**: Configured for specific origins
- **Input Validation**: Multer file type validation for GPX uploads
- **Protected Routes**: Private endpoints require JWT token

## Performance Optimizations

- **Geohash Indexing**: O(1) tile lookups
- **Connection Pooling**: PostgreSQL pool for efficient connections
- **In-memory User Tracking**: Fast user presence updates
- **JSON Storage**: Efficient route data storage

## Development

### Running Tests
```bash
npm test
```

### Code Style
- Follows Node.js conventions
- Consistent formatting across backend

### Debugging
```bash
npm run dev
```

Server runs on `http://localhost:5000` by default.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT License - See LICENSE file

## Roadmap

- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] Advanced analytics dashboard
- [ ] Team/guild system
- [ ] Seasonal leaderboards
- [ ] Sponsorship/rewards system

## Support

For issues and questions, please open an issue on GitHub.

## Authors

- GPS Territory Capture Game Team

---

**Status**: Production Ready
**Last Updated**: March 2026
