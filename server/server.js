const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pool = require('./config/db'); // Import the PostgreSQL connection pool
require('dotenv').config(); // Load from .env in the server directory

// Create Express app
const app = express();
app.set('trust proxy', 1);
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || true)  // same-origin on Render; set FRONTEND_URL if separate
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
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
    console.log(`Successfully executed ${path.basename(filePath)}`);
  } catch (err) {
    console.error(`Error executing ${path.basename(filePath)}:`, err.stack);
    throw err; // Propagate error to stop initialization if something critical fails
  }
};

// Initialize database schema
const initializeDatabase = async () => {
  console.log('Initializing database schema...');
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS postgis');
    // It's crucial to run these in the correct order
    await executeSqlFile('./sql/setup_database.sql');
    await executeSqlFile('./sql/postgis_setup.sql');
    await executeSqlFile('./sql/social_gamification.sql');
    console.log('Database schema initialization complete.');
  } catch (err) {
    console.error('Failed to initialize database schema. Server is starting, but some features might not work.');
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

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/runs', require('./routes/runs'));
app.use('/api/tiles', require('./routes/tiles'));
app.use('/api/zones', require('./routes/zones'));
app.use('/api/events', require('./routes/events'));
app.use('/api/training-plans', require('./routes/trainingPlans'));
app.use('/api/gpx', require('./routes/gpx'));
app.use('/api/social', require('./routes/social'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/territories', require('./routes/territories'));
app.use('/api/segments', require('./routes/segments'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/ai-coach', require('./routes/aiCoach'));
app.use('/api/heatmap', require('./routes/heatmap'));

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
const multiplayerSocketHandlers = require('./multiplayerSocketHandlers');
multiplayerSocketHandlers(io);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ msg: 'Something went wrong!', error: err.message });
});

// Start the server
const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`Server started on port ${port}`));