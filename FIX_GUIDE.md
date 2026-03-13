# ZoneRush - Complete Fix & Setup Guide

## 🚀 Quick Fix (5 Minutes)

### Step 1: Install Missing Dependencies

```bash
# In server directory
cd server
npm install ngeohash

# In client directory
cd ../client
npm install recharts
```

### Step 2: Run Database Migration

```bash
# Connect to your PostgreSQL database
psql -U postgres -d runterra

# Run the migration
\i database/migration_add_features.sql

# Or from command line:
psql -U postgres -d runterra -f database/migration_add_features.sql
```

### Step 3: Verify Server Routes

The server.js should include these routes (already updated):
- ✅ /api/segments
- ✅ /api/challenges  
- ✅ /api/leaderboard
- ✅ /api/ai-coach
- ✅ /api/heatmap

### Step 4: Start the Application

```bash
# Terminal 1 - Start server
cd server
npm start

# Terminal 2 - Start client
cd client
npm run dev
```

## 🔧 Detailed Fixes

### Fix 1: Database Connection Issues

**Problem:** `config/database` not found

**Solution:** Created `config/database.js` as alias to `config/db.js`

**Verify:**
```bash
ls server/config/
# Should show both db.js and database.js
```

### Fix 2: Missing Routes

**Problem:** AI Coach and Heatmap routes missing

**Solution:** Created:
- `routes/aiCoach.js`
- `routes/heatmap.js`

**Verify:**
```bash
ls server/routes/
# Should show aiCoach.js and heatmap.js
```

### Fix 3: Socket.io Handlers

**Problem:** Old socket handlers not supporting multiplayer

**Solution:** Updated server.js to use `multiplayerSocketHandlers.js`

**Verify:**
```javascript
// In server.js, should see:
const multiplayerSocketHandlers = require('./multiplayerSocketHandlers');
multiplayerSocketHandlers(io);
```

### Fix 4: Database Schema

**Problem:** Missing tables for new features

**Solution:** Run migration script

**Tables Added:**
- route_heatmap
- ai_recommendations
- kudos
- comments
- followers

**Verify:**
```sql
-- In psql
\dt
-- Should show all new tables
```

### Fix 5: Missing Services

**Problem:** Services reference wrong database path

**Solution:** All services now use `require('../config/database')`

**Verify:**
```bash
grep -r "require.*config/database" server/services/
# Should show all services using correct path
```

## 🧪 Testing

### Test 1: API Endpoints

```bash
# Test server is running
curl http://localhost:5000/api

# Test AI Coach
curl http://localhost:5000/api/ai-coach/recommendations/1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test Heatmap
curl "http://localhost:5000/api/heatmap/bounds?minLat=25.2&minLng=55.2&maxLat=25.3&maxLng=55.3" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 2: Database

```sql
-- Check if new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('route_heatmap', 'ai_recommendations', 'kudos');

-- Check if materialized views exist
SELECT matviewname FROM pg_matviews;
-- Should show: tile_leaderboard, segment_leaderboard

-- Check if triggers exist
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

### Test 3: Socket.io

```javascript
// In browser console
const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('✅ Connected to server');
  
  // Test authentication
  socket.emit('authenticate', { userId: 1 });
  
  // Test location update
  socket.emit('location-update', {
    lat: 25.2048,
    lng: 55.2708,
    speed: 2.5,
    heading: 90,
    timestamp: new Date()
  });
});

socket.on('tile-captured', (data) => {
  console.log('✅ Tile captured:', data);
});
```

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot find module 'ngeohash'"

**Solution:**
```bash
cd server
npm install ngeohash
```

### Issue 2: "relation 'route_heatmap' does not exist"

**Solution:**
```bash
psql -U postgres -d runterra -f database/migration_add_features.sql
```

### Issue 3: "Cannot find module '../config/database'"

**Solution:** Already fixed - `config/database.js` created

### Issue 4: Socket.io connection refused

**Solution:**
```javascript
// Check CORS in server.js
const io = socketIo(server, {
  cors: {
    origin: '*', // Or specific origin
    methods: ['GET', 'POST'],
  },
});
```

### Issue 5: PostGIS functions not working

**Solution:**
```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify
SELECT PostGIS_version();
```

## 📊 Verification Checklist

Run this checklist to ensure everything is working:

- [ ] Server starts without errors
- [ ] Client starts without errors
- [ ] Database connection successful
- [ ] All routes respond (test with curl)
- [ ] Socket.io connects
- [ ] Tiles can be captured
- [ ] Runs can be created
- [ ] Achievements unlock
- [ ] Leaderboard displays
- [ ] AI recommendations generate
- [ ] Heatmap displays

## 🔄 Reset & Fresh Start

If you want to start completely fresh:

```bash
# 1. Drop and recreate database
psql -U postgres
DROP DATABASE runterra;
CREATE DATABASE runterra;
\c runterra
CREATE EXTENSION postgis;
\q

# 2. Run complete schema
psql -U postgres -d runterra -f database/complete_schema.sql

# 3. Reinstall dependencies
cd server
rm -rf node_modules package-lock.json
npm install

cd ../client
rm -rf node_modules package-lock.json
npm install

# 4. Start fresh
cd ../server
npm start
```

## 📞 Still Having Issues?

### Check Logs

```bash
# Server logs
cd server
npm start 2>&1 | tee server.log

# Database logs
tail -f /var/log/postgresql/postgresql-*.log
```

### Debug Mode

```javascript
// Add to server.js
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Add to socket handlers
socket.on('*', (event, data) => {
  console.log('Socket event:', event, data);
});
```

### Environment Variables

```bash
# Check .env file exists
cat server/.env

# Should contain:
# DB_USER=postgres
# DB_HOST=localhost
# DB_DATABASE=runterra
# DB_PASSWORD=your_password
# DB_PORT=5432
# JWT_SECRET=your_secret
# PORT=5000
```

## ✅ Success Indicators

You'll know everything is working when:

1. **Server Console Shows:**
   ```
   Database connected on [timestamp]
   Database schema initialization complete
   Server started on port 5000
   ```

2. **Client Console Shows:**
   ```
   VITE ready in [time]
   Local: http://localhost:3000
   ```

3. **Browser Console Shows:**
   ```
   Socket connected
   Map initialized
   User authenticated
   ```

4. **Database Query Works:**
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM runs;
   SELECT COUNT(*) FROM tiles;
   ```

## 🎉 You're All Set!

Once everything is working:

1. Register a new user
2. Start a run
3. Watch tiles being captured
4. Check the dashboard
5. View AI recommendations
6. Explore the heatmap
7. Check leaderboards

Enjoy your complete fitness platform! 🏃‍♂️💨
