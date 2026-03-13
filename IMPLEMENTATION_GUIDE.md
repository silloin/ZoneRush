# 🏃♂️ ZoneRush - Advanced Running Tracker Implementation Guide

## 📋 Overview

This guide covers the complete implementation of gamification features including:
- ✅ Map Tile Capture System
- ✅ Real-time Route Visualization
- ✅ Strava-like Segment System
- ✅ Achievement System
- ✅ Advanced Statistics Dashboard
- ✅ Social Leaderboard
- ✅ Real-Time Runner Visualization
- ✅ Route Replay Feature
- ✅ Daily Challenges

## 🚀 Quick Setup

### 1. Database Setup

```bash
# Navigate to database directory
cd database

# Run the schema
psql -U your_username -d your_database -f schema.sql
```

### 2. Install Dependencies

```bash
# Server dependencies
cd server
npm install ngeohash

# Client dependencies (already installed)
cd ../client
npm install recharts
```

### 3. Update Server Routes

Add the new routes to your `server.js`:

```javascript
const tilesRouter = require('./routes/tiles');
const segmentsRouter = require('./routes/segments');
const achievementsRouter = require('./routes/achievements');
const challengesRouter = require('./routes/challenges');
const leaderboardRouter = require('./routes/leaderboard');
const runsRouter = require('./routes/runs');

app.use('/api/tiles', tilesRouter);
app.use('/api/segments', segmentsRouter);
app.use('/api/achievements', achievementsRouter);
app.use('/api/challenges', challengesRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/runs', runsRouter);
```

### 4. Update Socket.io

Replace your socket handlers with the new implementation:

```javascript
const socketHandlers = require('./socketHandlers');

// In your server setup
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

socketHandlers(io);
```

## 📡 API Endpoints

### Tiles

```
GET    /api/tiles/user/:userId          - Get user's captured tiles
GET    /api/tiles/bounds                - Get tiles in bounding box
POST   /api/tiles/capture               - Capture a single tile
GET    /api/tiles/stats/:userId         - Get tile statistics
```

### Segments

```
GET    /api/segments                    - Get nearby segments
GET    /api/segments/:segmentId         - Get segment details
GET    /api/segments/:segmentId/leaderboard - Get segment leaderboard
POST   /api/segments                    - Create new segment
POST   /api/segments/:segmentId/efforts - Record segment effort
GET    /api/segments/user/:userId/efforts - Get user's efforts
```

### Achievements

```
GET    /api/achievements                - Get all achievements
GET    /api/achievements/user/:userId   - Get user's achievements
GET    /api/achievements/user/:userId/progress - Get progress
POST   /api/achievements/check/:userId  - Check and unlock achievements
```

### Challenges

```
GET    /api/challenges/today            - Get today's challenges
GET    /api/challenges/user/:userId/progress - Get user progress
POST   /api/challenges/:challengeId/progress - Update progress
POST   /api/challenges/create           - Create challenge (admin)
POST   /api/challenges/generate         - Generate daily challenges
```

### Leaderboard

```
GET    /api/leaderboard?type=distance&limit=50 - Get leaderboard
GET    /api/leaderboard/user/:userId/rank      - Get user rank
```

### Runs

```
GET    /api/runs/user/:userId           - Get user's runs
GET    /api/runs/:runId                 - Get run details
POST   /api/runs                        - Create new run
DELETE /api/runs/:runId                 - Delete run
GET    /api/runs/user/:userId/stats     - Get user statistics
GET    /api/runs/user/:userId/heatmap   - Get activity heatmap
GET    /api/runs/user/:userId/pace-progression - Get pace data
GET    /api/runs/user/:userId/distance-progression - Get distance data
```

## 🔌 Socket.io Events

### Client → Server

```javascript
// Authentication
socket.emit('authenticate', { userId: 123 });

// Tracking
socket.emit('start-tracking', { runId: 456 });
socket.emit('location-update', { lat, lng, speed, heading, accuracy, timestamp });
socket.emit('stop-tracking', {});

// Active runners
socket.emit('get-active-runners', { bounds: { minLat, minLng, maxLat, maxLng } });

// Replay
socket.emit('start-replay', { runId, routePoints });
socket.emit('stop-replay', {});

// Segments
socket.emit('segment-entered', { segmentId, timestamp });
socket.emit('segment-completed', { segmentId, elapsedTime });
```

### Server → Client

```javascript
// Tiles
socket.on('tile-captured', (data) => {
  // { tile, totalTiles }
});

socket.on('tile-captured-global', (data) => {
  // { userId, tile }
});

// Achievements
socket.on('achievements-unlocked', (achievements) => {
  // Array of unlocked achievements
});

// Runners
socket.on('runner-started', (data) => {
  // { userId, runId }
});

socket.on('runner-position-update', (data) => {
  // { userId, position: { lat, lng, speed, heading }, timestamp }
});

socket.on('runner-stopped', (data) => {
  // { userId, runId }
});

socket.on('active-runners', (runners) => {
  // Array of active runners
});

// Replay
socket.on('replay-point', (data) => {
  // { runId, point, index, total }
});

socket.on('replay-complete', (data) => {
  // { runId }
});

// Segments
socket.on('segment-tracking-started', (data) => {
  // { segmentId, startTime }
});

socket.on('segment-completed-notification', (data) => {
  // { segmentId, elapsedTime }
});
```

## 🎨 Frontend Components

### Import Components

```javascript
import Dashboard from './components/Dashboard/Dashboard';
import Achievements from './components/Achievements/Achievements';
import Leaderboard from './components/Leaderboard/Leaderboard';
import RouteReplay from './components/RouteReplay/RouteReplay';
```

### Usage Examples

```javascript
// Dashboard
<Dashboard userId={user.id} />

// Achievements
<Achievements userId={user.id} />

// Leaderboard
<Leaderboard currentUserId={user.id} />

// Route Replay
<RouteReplay runId={123} onClose={() => setShowReplay(false)} />
```

## 🗺️ Tile System Configuration

### Adjust Tile Precision

In `server/services/tileService.js`:

```javascript
constructor() {
  this.TILE_PRECISION = 8; // Change this value
}
```

**Precision Guide:**
- 6: ~1.2km × 609m
- 7: ~153m × 153m
- 8: ~38m × 19m (default)
- 9: ~4.8m × 4.8m
- 10: ~1.2m × 0.6m

## 🎮 Gamification Features

### Achievement Types

1. **Distance Achievements**
   - First Steps (1 run)
   - 5K Runner (5km total)
   - 10K Runner (10km total)
   - Marathon Ready (42.2km total)

2. **Tile Achievements**
   - Territory Explorer (10 tiles)
   - Territory Master (50 tiles)
   - Territory Legend (100 tiles)

3. **Streak Achievements**
   - Week Warrior (7 days streak)

4. **Speed Achievements**
   - Speed Demon (pace under 4 min/km)

### Daily Challenges

Challenges are automatically generated or manually created:

```javascript
// Generate random challenges
POST /api/challenges/generate

// Create custom challenge
POST /api/challenges/create
{
  "title": "Morning Runner",
  "description": "Run 3 km today",
  "challengeType": "distance",
  "targetValue": 3000,
  "xpReward": 100,
  "validDate": "2024-01-15"
}
```

## 📊 Statistics & Analytics

### Available Metrics

- Total distance, runs, duration
- Weekly/monthly statistics
- Personal bests (pace, distance, duration)
- Activity heatmap
- Pace progression
- Distance progression
- Current/longest streak
- Tiles captured
- XP and level

### Leaderboard Categories

- Distance
- Total Runs
- Tiles Captured
- Experience Points (XP)
- Current Streak

## 🔧 Advanced Configuration

### Segment Detection

Segments are automatically detected when a run intersects with predefined segments. Create segments via API:

```javascript
POST /api/segments
{
  "name": "City Center Sprint",
  "description": "Fast 1km through downtown",
  "coordinates": [
    { lat: 25.2048, lng: 55.2708 },
    { lat: 25.2058, lng: 55.2718 }
  ],
  "distance": 1000,
  "difficulty": "easy"
}
```

### Real-Time Runner Tracking

Enable real-time runner visualization:

```javascript
// In your map component
useEffect(() => {
  socket.emit('get-active-runners', {
    bounds: {
      minLat: mapBounds.south,
      minLng: mapBounds.west,
      maxLat: mapBounds.north,
      maxLng: mapBounds.east
    }
  });

  socket.on('active-runners', (runners) => {
    // Render runners on map
    runners.forEach(runner => {
      // Add marker for each runner
    });
  });
}, [mapBounds]);
```

## 🎯 Best Practices

1. **Tile Capture Optimization**
   - Use geohash for efficient spatial indexing
   - Batch tile captures during run processing
   - Cache frequently accessed tiles

2. **Performance**
   - Use database indexes on spatial columns
   - Implement pagination for large datasets
   - Cache user statistics

3. **Real-Time Updates**
   - Throttle location updates (every 1-2 seconds)
   - Use rooms for efficient broadcasting
   - Clean up disconnected sockets

4. **Security**
   - Validate all user inputs
   - Use JWT authentication
   - Implement rate limiting
   - Sanitize geospatial queries

## 🐛 Troubleshooting

### Tiles Not Appearing

1. Check PostGIS extension is installed
2. Verify geohash precision
3. Check map bounds query
4. Ensure tiles are being captured

### Socket Connection Issues

1. Verify CORS configuration
2. Check Socket.io version compatibility
3. Ensure proper authentication
4. Check network/firewall settings

### Performance Issues

1. Add database indexes
2. Implement caching (Redis)
3. Optimize spatial queries
4. Use connection pooling

## 📚 Additional Resources

- [PostGIS Documentation](https://postgis.net/docs/)
- [Mapbox GL JS API](https://docs.mapbox.com/mapbox-gl-js/api/)
- [Socket.io Documentation](https://socket.io/docs/)
- [Geohash Algorithm](https://en.wikipedia.org/wiki/Geohash)

## 🤝 Contributing

Feel free to extend the system with:
- Custom achievement types
- New challenge categories
- Additional statistics
- Social features (friends, groups)
- Route recommendations
- Weather integration

## 📄 License

MIT License - See LICENSE file for details
