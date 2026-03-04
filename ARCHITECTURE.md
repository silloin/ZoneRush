# Architecture Guide

## System Overview

RunTerra uses a modern full-stack architecture with a clean separation between frontend and backend, connected via REST API and WebSockets.

```
┌─────────────────────────────────────────────────────────────┐
│                     React Client (Port 5173)                │
│  ├── Pages: Map, Profile, Leaderboard, Settings            │
│  ├── Socket.io: Real-time events                            │
│  └── Google Maps: Visualization                             │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP + WebSocket
     ┌─────────────────┴──────────────────┐
     │                                    │
┌────▼──────────────────────────────────┐ │ ┌──────────────────────────────┐
│   Express Server (Port 5000)          │ │ │   PostgreSQL Database        │
│  ├── REST API Routes                  │◄─┤  ├── Tables: users, runs,      │
│  ├── JWT Auth Middleware              │   │  │   tiles, zones, events      │
│  ├── Socket.io Real-time Handler      │ │ │   └── PostGIS Extension      │
│  └── GPX/File Upload Handler          │ │ └──────────────────────────────┘
└─────────────────────────────────────────┘ │
                       ▲
                       │ Database Connection Pool
                       │
            ┌──────────┴──────────┐
            │   pg (Node.js)      │
            │   PostgreSQL Driver │
            └─────────────────────┘
```

## Backend Architecture

### Core Components

#### 1. **Express Server** (`server.js`)
- HTTP server initialization
- CORS configuration
- Socket.io attachment
- Route mounting
- Global error handling

```javascript
// Core setup
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });
```

#### 2. **Database Layer** (`config/db.js`)
- PostgreSQL connection pool
- Connection management
- Query execution

```javascript
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
```

#### 3. **Middleware** (`middleware/auth.js`)
- JWT token verification
- User authentication
- Protected route enforcement

#### 4. **Route Handlers** (`routes/*`)
- RESTful endpoint definitions
- Request validation
- Business logic orchestration
- Response formatting

### Data Flow

#### Tile Capture Flow
```
1. User's GPS location → Client sent
2. Client sends coordinates → POST /api/tiles/capture
3. Server geohashes coordinates → ngeohash library
4. Check tile ownership → PostgreSQL query
5. Update tile in database → INSERT/UPDATE
6. Emit socket event → io.emit('tile-captured')
7. All clients receive update → Real-time display
```

#### Authentication Flow
```
1. User registers → POST /api/auth/register
2. Password hashed → bcryptjs.hash()
3. User created → INSERT INTO users
4. JWT token generated → jwt.sign()
5. Token returned → Client stores in localStorage
6. Client sends token → X-auth-token header
7. Middleware verifies → jwt.verify()
8. User extracted → req.user populated
```

#### GPX Upload Flow
```
1. User uploads GPX file → POST /api/gpx/upload
2. Multer parses file → Memory storage
3. xml2js parses XML → Track points extracted
4. Distance calculated → Haversine formula
5. Run stored → INSERT INTO runs
6. Route data → JSON.stringify(route)
7. Response sent → Run object returned
```

## Real-time Architecture with Socket.io

### User Connection Pool
```javascript
// In-memory map of connected users
const connectedUsers = new Map();

// Structure: socket.id → { userId, username, location, socketId }
```

### Event Categories

#### Game Events
- `tile-capture` - Territory claimed
- `run-start` - User begins running
- `run-complete` - User finishes run
- User presence updates

#### Location Events
- `location-update` - Live GPS tracking
- Zone-based proximity detection

#### Social Events
- `send-message` - In-game chat
- `achievement-unlock` - Milestone celebrations

#### Admin Events
- `zone-ranking-update` - Competitive standings
- `request-leaderboard` - Data refresh

### Broadcast Patterns

**io.emit()** - Broadcast to ALL connected clients
```javascript
io.emit('tile-captured', { tileId, userId, timestamp });
```

**socket.broadcast.emit()** - Broadcast to everyone EXCEPT sender
```javascript
socket.broadcast.emit('run-started', { userId, username });
```

**socket.emit()** - Send to specific socket
```javascript
socket.emit('leaderboard-update', { users, rankings });
```

## Database Schema Design

### Entity Relationships

```
Users ──1:N── Runs
      └─1:N– Tiles (ownership)
      └─1:N– Training Plans
      └─1:N── Messages

Tiles ──M:M── Events (participation)

Zones ──1:N── Tiles (geographic containment)

Events ──1:N── Registrations (user participation)
```

### Key Tables

#### users
- `id` - Primary key (SERIAL)
- `username` - Unique username
- `email` - Unique email
- `password` - Hashed password
- `city` - User's location
- `totalTiles` - Stat counter
- `totalDistance` - Stat counter
- `createdAt` - Account creation timestamp

#### tiles
- `id` - Primary key (SERIAL)
- `geoHash` - Unique geohash (7 characters = ~150m)
- `location` - PostGIS point geometry
- `ownerId` - Foreign key to users
- `capturedAt` - Last capture timestamp
- `history` - JSON array of ownership changes

#### runs
- `id` - Primary key (SERIAL)
- `userId` - Foreign key to users
- `distance` - In kilometers
- `duration` - In seconds
- `avgPace` - Minutes per km
- `route` - JSON array of coordinates
- `createdAt` - Run timestamp

#### zones
- `id` - Primary key (SERIAL)
- `name` - Zone name
- `boundary` - PostGIS polygon
- `ownerId` - Current dominant user
- `totalTiles` - Tile count in zone

## API Architecture

### Request/Response Pattern

#### Standard Response Format
```javascript
// Success
res.json({ data: {...}, msg: "Success" })

// Error
res.status(400).json({ msg: "Error message" })
```

#### Authentication Header
```
x-auth-token: <JWT_TOKEN>
```

### Endpoint Categories

**Public** - No authentication required
- GET /api/tiles
- GET /api/zones
- GET /api/events
- GET /api/users/leaderboard

**Private** - Requires JWT token
- POST /api/runs
- GET /api/runs
- POST /api/tiles/capture
- POST /api/gpx/upload
- POST /api/training-plans
- GET /api/training-plans

**Admin** - May require elevated permissions
- POST /api/users/prize-draw

## Scalability Considerations

### Current Optimizations
1. **Connection Pooling** - PostgreSQL pool reuses connections
2. **Geohash Indexing** - Fast tile lookups
3. **In-memory Tracking** - Socket connections cached
4. **JSON Storage** - Routes stored as JSON for flexibility

### Future Improvements
1. **Redis Caching** - Cache leaderboards, user sessions
2. **Database Sharding** - Partition tiles by geographic region
3. **CDN** - Serve static assets from edge nodes
4. **Load Balancing** - Multiple server instances
5. **Pub/Sub System** - For distributed Socket.io

## Error Handling

### Server-side Error Handling
```javascript
try {
  // Query execution
} catch (err) {
  console.error(err.message);
  res.status(500).send('Server Error');
}
```

### Global Error Handler
```javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ msg: 'Something went wrong!', error: err.message });
});
```

## Security Architecture

### Authentication Layer
- JWT tokens with 360,000 second expiration
- Password hashing with bcryptjs (10 rounds)
- Token stored in secure header

### Authorization
- Middleware checks token validity
- User ID extracted from decoded token
- Resource ownership verified before operations

### Input Validation
- Multer file type filtering
- GPX file MIME type checking
- Parameterized queries (no SQL injection)

## Deployment Considerations

### Environment Variables Required
```
DB_USER
DB_PASSWORD
DB_HOST
DB_DATABASE
DB_PORT
JWT_SECRET
PORT
NODE_ENV (development|production)
```

### Database Initialization
1. Create PostgreSQL database
2. Install PostGIS extension
3. Run `server/sql/create_tables.sql`
4. Verify constraints and indexes

### Server Start
```bash
npm install
npm start
```

---

**Version**: 1.0.0
**Status**: Production Ready
