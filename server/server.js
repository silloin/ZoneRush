const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { redisClient, isRedisAvailable } = require('./middleware/rateLimiter');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const csrfProtection = require('./middleware/csrf');
const path = require('path');
const fs = require('fs');
const pool = require('./config/db');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const runsRoutes = require('./routes/runs');
const tilesRoutes = require('./routes/tiles');
const zonesRoutes = require('./routes/zones');
const eventsRoutes = require('./routes/events');
const trainingPlansRoutes = require('./routes/trainingPlans');
const gpxRoutes = require('./routes/gpx');
const socialRoutes = require('./routes/social');
const achievementsRoutes = require('./routes/achievements');
const territoriesRoutes = require('./routes/territories');
const segmentsRoutes = require('./routes/segments');
const challengesRoutes = require('./routes/challenges');
const leaderboardRoutes = require('./routes/leaderboard');
const aiCoachRoutes = require('./routes/aiCoach');
const heatmapRoutes = require('./routes/heatmap');
const safetyRoutes = require('./routes/safety');
const clansRoutes = require('./routes/clans');
const monetizationRoutes = require('./routes/monetization');
const friendRequestsRoutes = require('./routes/friendRequests');
const messagesRoutes = require('./routes/messages');
const globalChatRoutes = require('./routes/globalChat');
const notificationsRoutes = require('./routes/notifications');
const emergencyRoutes = require('./routes/emergency');
const multiplayerSocketHandlers = require('./multiplayerSocketHandlers');
const sosSocketHandlers = require('./sosSocketHandlers');

// Create Express app
const app = express();
app.set('trust proxy', 1);

// HTTPS Enforcement for Production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Check if request is secure (HTTPS)
    if (req.header('x-forwarded-proto') !== 'https' && req.secure !== true) {
      // Redirect to HTTPS version of the URL
      const httpsUrl = `https://${req.header('host')}${req.url}`;
      console.log(`[HTTPS] Redirecting to: ${httpsUrl}`);
      return res.redirect(301, httpsUrl);
    }
    next();
  });
  
  // Set strict security headers
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
}

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.FRONTEND_URL,
      process.env.RENDER_EXTERNAL_URL, // Render deployment
      /.render\.com$/, // All render subdomains
      /.vercel\.app$/, // All Vercel subdomains
      'https://zonerush.vercel.app', // Specific Vercel deployment
    ].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    
    if (!isAllowed) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(csrfProtection);

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? [process.env.FRONTEND_URL, process.env.RENDER_EXTERNAL_URL, /.render\.com$/].filter(Boolean)
      : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket'],
});

// Setup Redis adapter for horizontal scalability (optional)
const subClient = redisClient.duplicate();
subClient.connect()
  .then(() => {
    if (isRedisAvailable()) {
      io.adapter(createAdapter(redisClient, subClient));
      console.log('✅ Socket.io Redis adapter connected');
    } else {
      console.log('⚠️ Redis not available - Socket.io running in single-server mode');
    }
  })
  .catch(err => {
    console.log('⚠️ Redis not available - Socket.io running in single-server mode');
  });

// Test the database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error', err.stack);
  } else {
    console.log('Database connected on', res.rows[0].now);
    initializeDatabase();
  }
});

// Function to read and execute SQL file
const executeSqlFile = async (filePath) => {
  try {
    const sql = fs.readFileSync(path.resolve(__dirname, filePath), 'utf8');
    await pool.query(sql);
    console.log(`✅ Successfully executed ${path.basename(filePath)}`);
    return true;
  } catch (err) {
    console.error(`❌ Error executing ${path.basename(filePath)}:`, err.message);
    console.log(`   Continuing with other files...`);
    return false;
  }
};

// Initialize database schema
const initializeDatabase = async () => {
  console.log('🔄 Initializing database schema...');
  const files = [
    './sql/setup_database.sql',       // Core tables first (includes PostGIS setup)
    './sql/postgis_setup.sql',        // Geometry columns/indexes after tables exist
    './sql/social_gamification.sql',
    './sql/emergency_contacts.sql',
    './sql/sos_alerts.sql',
    './sql/clans.sql',
    './sql/chat_system.sql'           // Chat system last (depends on users table)
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  await pool.query('CREATE EXTENSION IF NOT EXISTS postgis');
  console.log('✅ PostGIS extension ready');
  
  for (const filePath of files) {
    const success = await executeSqlFile(filePath);
    if (success) successCount++;
    else errorCount++;
  }
  
  console.log(`\n📊 Schema init complete: ${successCount} success, ${errorCount} errors`);
  if (errorCount === 0) {
    console.log('🎉 All database tables ready!');
  } else {
    console.log('⚠️  Server running with some schema issues - check logs');
  }
};

// Init Middleware
// app.use(express.json({ extended: false })); // Already added express.json() above

// Attach socket.io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Define Routes
// Serve static files from the React frontend (built and copied to server/public)
const publicPath = path.resolve(__dirname, 'public');

if (process.env.NODE_ENV === 'development' && !fs.existsSync(publicPath)) {
  console.warn('Static public folder missing at:', publicPath);
}

app.use(express.static(publicPath));

app.get('/api', (req, res) => {
  res.send('API is running 🚀');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/runs', runsRoutes);
app.use('/api/tiles', tilesRoutes);
app.use('/api/zones', zonesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/training-plans', trainingPlansRoutes);
app.use('/api/gpx', gpxRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/territories', territoriesRoutes);
app.use('/api/segments', segmentsRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/ai-coach', aiCoachRoutes);
app.use('/api/heatmap', heatmapRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/clans', clansRoutes);
app.use('/api/monetization', monetizationRoutes);

// Chat and Notification System Routes
app.use('/api/friend-requests', friendRequestsRoutes);
app.use('/api/friends', friendRequestsRoutes); // Alias for friends list
app.use('/api/messages', messagesRoutes);
app.use('/api/global-chat', globalChatRoutes);
app.use('/api/notifications', notificationsRoutes);

// Emergency SOS System Routes
app.use('/api/emergency', emergencyRoutes);

// For any other request, serve the index.html from the frontend
app.get('/{*splat}', (req, res) => {
  const indexPath = path.resolve(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error('CRITICAL: index.html is missing at:', indexPath);
    res.status(404).json({
      msg: 'Frontend not found!',
      error: `File missing at ${indexPath}`,
      currentDir: __dirname,
      dirContents: fs.existsSync(publicPath) ? fs.readdirSync(publicPath) : 'public folder missing'
    });
  }
});

// Socket.io integration - Use enhanced multiplayer handlers
multiplayerSocketHandlers(io);

// SOS Emergency Live Tracking
sosSocketHandlers(io);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ msg: 'Something went wrong!', error: err.message });
});

// Start the server
const port = process.env.PORT || 5000;
server.listen(port, () => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`✅ Server started in ${env} mode on port ${port}`);
  
  if (env === 'development') {
    console.log(`🌐 API available at http://localhost:${port}/api`);
    console.log(`🔌 Socket.IO server running on http://localhost:${port}`);
  } else {
    console.log(`🌐 Production server running on port ${port}`);
    if (process.env.RENDER_EXTERNAL_URL) {
      console.log(`🌐 External URL: ${process.env.RENDER_EXTERNAL_URL}`);
    }
  }
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use!`);
    console.error('💡 Solution: Run "stop-server.bat" to kill the existing process, then restart.');
    console.error('   Or use: taskkill /F /PID <process_id>');
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});