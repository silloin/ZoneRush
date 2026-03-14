# 🚀 Quick Start & Testing Guide

## 🏁 Getting Started in 5 Minutes

### Step 1: Database Setup (2 minutes)

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE zonerush;

# Connect to database
\c zonerush

# Enable PostGIS
CREATE EXTENSION postgis;

# Run schema
\i database/schema.sql

# Verify tables
\dt
```

### Step 2: Server Setup (1 minute)

```bash
cd server

# Install new dependency
npm install ngeohash

# Update server.js - add these lines after existing routes:
```

Add to `server/server.js`:
```javascript
// New routes
app.use('/api/tiles', require('./routes/tiles'));
app.use('/api/segments', require('./routes/segments'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

// Update socket handlers
const socketHandlers = require('./socketHandlers');
socketHandlers(io);
```

### Step 3: Client Setup (1 minute)

```bash
cd client

# Install chart library
npm install recharts

# Components are already created, just import them in your routes
```

### Step 4: Start Application (1 minute)

```bash
# Terminal 1 - Start server
cd server
npm start

# Terminal 2 - Start client
cd client
npm run dev
```

## 🧪 Testing Features

### Test 1: Tile Capture System

1. Start a run
2. Move around (or simulate GPS)
3. Watch tiles being captured in real-time
4. Check database:
```sql
SELECT COUNT(*) FROM captured_tiles WHERE user_id = 1;
```

### Test 2: Achievements

1. Complete your first run
2. Check achievements endpoint:
```bash
curl http://localhost:5000/api/achievements/check/1
```
3. Should unlock "First Steps" achievement

### Test 3: Leaderboard

1. Visit `/leaderboard` route
2. Switch between categories
3. Check your rank

### Test 4: Dashboard

1. Visit `/dashboard` route
2. View statistics
3. Check charts and heatmap

### Test 5: Route Replay

1. Complete a run
2. Go to run history
3. Click replay button
4. Watch animated playback

### Test 6: Daily Challenges

1. Generate challenges:
```bash
curl -X POST http://localhost:5000/api/challenges/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
2. Complete a run
3. Check challenge progress

### Test 7: Segments

1. Create a segment:
```bash
curl -X POST http://localhost:5000/api/segments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Segment",
    "description": "Test segment",
    "coordinates": [
      {"lat": 25.2048, "lng": 55.2708},
      {"lat": 25.2058, "lng": 55.2718}
    ],
    "distance": 1000,
    "difficulty": "easy"
  }'
```
2. Run through the segment
3. Check leaderboard

### Test 8: Real-Time Tracking

1. Open app in two browsers
2. Start run in browser 1
3. Watch live updates in browser 2

## 🔍 API Testing with cURL

### Get User Stats
```bash
curl http://localhost:5000/api/runs/user/1/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Leaderboard
```bash
curl "http://localhost:5000/api/leaderboard?type=distance&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Achievements Progress
```bash
curl http://localhost:5000/api/achievements/user/1/progress \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Today's Challenges
```bash
curl http://localhost:5000/api/challenges/today \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Captured Tiles
```bash
curl http://localhost:5000/api/tiles/user/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🐛 Common Issues & Solutions

### Issue 1: PostGIS Not Found
```bash
# Install PostGIS
sudo apt-get install postgresql-postgis

# Or on Mac
brew install postgis
```

### Issue 2: Tiles Not Appearing
```sql
-- Check if tiles exist
SELECT COUNT(*) FROM tiles;

-- Check if captured
SELECT COUNT(*) FROM captured_tiles;

-- Verify geohash function
SELECT * FROM tiles LIMIT 1;
```

### Issue 3: Socket Connection Failed
```javascript
// Check CORS in server.js
const io = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});
```

### Issue 4: Charts Not Rendering
```bash
# Reinstall recharts
npm uninstall recharts
npm install recharts
```

## 📊 Database Queries for Testing

### Check User Progress
```sql
SELECT 
  u.username,
  us.total_runs,
  us.total_distance / 1000 as km,
  us.total_tiles_captured,
  us.current_streak,
  u.level,
  u.total_xp
FROM users u
JOIN user_stats us ON u.id = us.user_id
WHERE u.id = 1;
```

### View Achievements
```sql
SELECT 
  a.name,
  a.description,
  ua.unlocked_at
FROM achievements a
JOIN user_achievements ua ON a.id = ua.achievement_id
WHERE ua.user_id = 1
ORDER BY ua.unlocked_at DESC;
```

### Check Leaderboard
```sql
SELECT 
  u.username,
  us.total_distance / 1000 as km,
  us.total_runs,
  us.total_tiles_captured,
  u.level
FROM users u
JOIN user_stats us ON u.id = us.user_id
ORDER BY us.total_distance DESC
LIMIT 10;
```

### View Recent Runs
```sql
SELECT 
  id,
  distance / 1000 as km,
  duration / 60 as minutes,
  pace,
  completed_at
FROM runs
WHERE user_id = 1
ORDER BY completed_at DESC
LIMIT 5;
```

## 🎮 Feature Testing Checklist

- [ ] User can register and login
- [ ] GPS tracking works
- [ ] Tiles are captured during run
- [ ] Route is drawn on map
- [ ] Run is saved to database
- [ ] Statistics are updated
- [ ] Achievements unlock automatically
- [ ] Leaderboard shows rankings
- [ ] Dashboard displays charts
- [ ] Route replay works
- [ ] Daily challenges appear
- [ ] Segments are detected
- [ ] Real-time updates work
- [ ] Socket.io connects properly

## 🚀 Performance Testing

### Load Test Tile Capture
```javascript
// Simulate 1000 tile captures
for (let i = 0; i < 1000; i++) {
  await axios.post('/api/tiles/capture', {
    lat: 25.2048 + (Math.random() * 0.01),
    lng: 55.2708 + (Math.random() * 0.01),
    runId: 1
  });
}
```

### Test Leaderboard Performance
```sql
-- Should complete in < 100ms
EXPLAIN ANALYZE
SELECT * FROM user_stats
ORDER BY total_distance DESC
LIMIT 50;
```

## 📱 Mobile Testing

1. Get your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Update client `.env`:
```
VITE_API_URL=http://YOUR_IP:5000/api
```
3. Access from mobile: `http://YOUR_IP:3000`

## 🎯 Success Criteria

Your implementation is successful when:
- ✅ All API endpoints return 200
- ✅ Tiles appear on map
- ✅ Achievements unlock
- ✅ Leaderboard updates
- ✅ Charts render correctly
- ✅ Socket.io connects
- ✅ No console errors
- ✅ Database triggers work

## 🏆 Next Steps

After testing:
1. Add more achievements
2. Create custom segments
3. Invite friends to test
4. Monitor performance
5. Deploy to production

## 📞 Support

If you encounter issues:
1. Check console logs (browser & server)
2. Verify database connections
3. Check API responses
4. Review socket events
5. Validate JWT tokens

Happy testing! 🎉
