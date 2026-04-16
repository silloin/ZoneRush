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
const securityConfig = require('./config/securityConfig');
const securityLogger = require('./middleware/securityLogger');
const createAbuseProtection = require('./middleware/abuseProtection');
const { 
  globalAbuseProtection,
  apiRateLimit,
  progressiveAbuseProtection
} = require('./middleware/abuseMiddleware');
const { 
  enforceHTTPS, 
  securityHeaders, 
  requestLogger, 
  detectSuspiciousTraffic 
} = require('./middleware/productionSecurity');
require('dotenv').config();

// Initialize centralized email service
const emailService = require('./services/emailService');
emailService.initialize();

// Initialize achievement service for weekly reset
const achievementService = require('./services/achievementService');

// Initialize abuse protection system
const abuseProtection = createAbuseProtection(redisClient, isRedisAvailable);
console.log('✅ Abuse protection system initialized');

// Validate production security configuration
const isSecureConfig = securityConfig.validateProductionConfig();
if (!isSecureConfig && process.env.NODE_ENV === 'production') {
  console.error('\n🚨 CRITICAL: Production security validation failed!');
  console.error('Server will not start. Fix configuration issues first.\n');
  process.exit(1);
}

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
const emailTestRoutes = require('./routes/emailTest');
const multiplayerSocketHandlers = require('./multiplayerSocketHandlers');
const sosSocketHandlers = require('./sosSocketHandlers');

// Create Express app
const app = express();
app.set('trust proxy', 1);

// Make abuseProtection accessible to app
app.set('abuseProtection', abuseProtection);

// Log server startup
securityLogger.logServerEvent({
  type: 'startup',
  port: process.env.PORT || 5000,
  environment: process.env.NODE_ENV || 'development',
  details: 'Server starting'
});

// Security Headers (apply to all environments)
app.use(securityHeaders);

// HTTPS Enforcement for Production
if (process.env.NODE_ENV === 'production') {
  app.use(enforceHTTPS);
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

// Suspicious Traffic Detection
app.use(detectSuspiciousTraffic);

// Request Logging
app.use(requestLogger);

// Serve manifest.webmanifest publicly (before CSRF middleware)
app.get('/manifest.webmanifest', (req, res) => {
  const manifestPath = path.resolve(__dirname, 'public', 'manifest.webmanifest');
  if (fs.existsSync(manifestPath)) {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(manifestPath);
  } else {
    res.status(404).json({ error: 'Manifest not found' });
  }
});

// CSRF Protection Disabled - Not required for this application
// app.use(csrfProtection);

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? [process.env.FRONTEND_URL, process.env.RENDER_EXTERNAL_URL, /.render\.com$/, /.vercel\.app$/, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean)
      : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket'],
});

// Setup Redis adapter for horizontal scalability (optional)
if (isRedisAvailable()) {
  const subClient = redisClient.duplicate();
  subClient.connect()
    .then(() => {
      if (isRedisAvailable()) {
        io.adapter(createAdapter(redisClient, subClient));
        console.log('✅ Socket.io Redis adapter connected');
      }
    })
    .catch(err => {
      console.log('⚠️ Redis not available - Socket.io running in single-server mode');
    });
} else {
  console.log('⚠️ Redis not configured - Socket.io running in single-server mode');
}

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

// Attach socket.io and abuse protection to req
app.use((req, res, next) => {
  req.io = io;
  req.abuseProtection = abuseProtection;
  next();
});

// Define Routes
// Serve static files from the React frontend (built and copied to server/public)
const publicPath = path.resolve(__dirname, 'public');
const hasPublicFolder = fs.existsSync(publicPath);

if (process.env.NODE_ENV === 'development' && !hasPublicFolder) {
  console.warn('Static public folder missing at:', publicPath);
}

// Only serve static files if public folder exists
if (hasPublicFolder) {
  app.use(express.static(publicPath));
}

// Serve uploaded files (profiles, etc.) - MUST be after cors middleware
const uploadsPath = path.resolve(__dirname, 'public', 'uploads');
app.use('/uploads', express.static(uploadsPath));

app.get('/api', (req, res) => {
  res.send('API is running 🚀');
});

// Apply global abuse protection to all API routes (production only)
if (process.env.NODE_ENV === 'production') {
  app.use('/api', globalAbuseProtection);
  app.use('/api', apiRateLimit);
}

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

// Message routes (messageProtection is already applied in messages.js route)
app.use('/api/messages', messagesRoutes);
app.use('/api/global-chat', globalChatRoutes);
app.use('/api/notifications', notificationsRoutes);

// Emergency SOS System Routes
app.use('/api/emergency', emergencyRoutes);

// Email Test Routes (for debugging)
app.use('/api/email-test', emailTestRoutes);

// ============================================
// HEALTH CHECK ENDPOINTS (Production monitoring)
// ============================================

// Simple health check for load balancers
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ZoneRush API'
  });
});

// Detailed health check for monitoring
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 1000,
    api: 'running',
    version: '1.0.0'
  });
});

// For any other request, serve the index.html from the frontend (if available)
app.get('/{*splat}', (req, res) => {
  const indexPath = path.resolve(publicPath, 'index.html');
  
  // Only serve frontend if public folder exists
  if (hasPublicFolder && fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // In production without frontend, return API info
    res.status(200).json({
      msg: 'ZoneRush API is running 🚀',
      frontend: 'https://zonerush.vercel.app',
      api: 'https://zonerush-api.onrender.com/api',
      note: 'Frontend is deployed separately on Vercel'
    });
  }
});

// Socket.io integration - Use enhanced multiplayer handlers
const NotificationService = require('./services/notificationService');
const notificationService = new NotificationService(io);
notificationService.initialize();

multiplayerSocketHandlers(io, notificationService);

// SOS Emergency Live Tracking
sosSocketHandlers(io);

// Global Error Handler - Enhanced with security logging
app.use((err, req, res, next) => {
  // Log error with security logger
  securityLogger.logAPIError({
    endpoint: req.originalUrl,
    method: req.method,
    statusCode: err.statusCode || 500,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    userId: req.user?.id || null,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    params: req.params,
    query: req.query
  });

  // Don't leak error details in production
  const errorResponse = {
    msg: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };

  res.status(err.statusCode || 500).json(errorResponse);
});

// Start the server
const port = process.env.PORT || 5000;
server.listen(port, () => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`✅ Server started in ${env} mode on port ${port}`);
  
  // Log to security logger
  securityLogger.logServerEvent({
    type: 'startup_complete',
    port,
    environment: env,
    details: `Server ready to accept connections`
  });
  
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
    
    securityLogger.logServerEvent({
      type: 'startup_failed',
      port,
      environment: process.env.NODE_ENV || 'development',
      details: `Port ${port} already in use`
    });
  } else {
    console.error('❌ Server error:', err.message);
    
    securityLogger.logServerEvent({
      type: 'error',
      port,
      environment: process.env.NODE_ENV || 'development',
      details: err.message
    });
  }
  process.exit(1);
});

// Setup weekly achievements reset (every Monday at 00:00)
function setupWeeklyReset() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const hoursUntilMonday = (1 - dayOfWeek + 7) % 7 || 7; // Days until next Monday
  const msUntilMonday = hoursUntilMonday * 24 * 60 * 60 * 1000;
  
  // Set time to midnight Monday
  const nextMonday = new Date(now.getTime() + msUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  
  const msToWait = nextMonday.getTime() - now.getTime();
  
  console.log(`⏰ Weekly achievements reset scheduled for: ${nextMonday.toLocaleString()}`);
  console.log(`⏰ Time until reset: ${Math.round(msToWait / (1000 * 60 * 60))} hours`);
  
  // Schedule weekly reset
  setTimeout(() => {
    // Perform reset
    achievementService.resetWeeklyAchievements()
      .then(result => {
        console.log('✅ Weekly achievements reset completed:', result);
      })
      .catch(error => {
        console.error('❌ Weekly achievements reset failed:', error);
      });
    
    // Repeat every week (7 days)
    setInterval(() => {
      achievementService.resetWeeklyAchievements()
        .then(result => {
          console.log('✅ Weekly achievements reset completed:', result);
        })
        .catch(error => {
          console.error('❌ Weekly achievements reset failed:', error);
        });
    }, 7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
    
  }, msToWait);
}

// Start weekly reset scheduler
if (process.env.NODE_ENV !== 'test') {
  setupWeeklyReset();
}