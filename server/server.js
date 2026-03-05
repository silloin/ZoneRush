const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const pool = require('./config/db'); // Import the PostgreSQL connection pool
require('dotenv').config(); // Load from .env in the server directory

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST'],
  },
});

// Test the database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error', err.stack);
  } else {
    console.log('Database connected on', res.rows[0].now);
  }
});

// Init Middleware
// app.use(express.json({ extended: false })); // Already added express.json() above

// Attach socket.io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Define Routes
// Serve static files from the React frontend
app.use(express.static(path.join(__dirname, '../client/dist')));

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

// For any other request, serve the index.html from the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Socket.io integration
require('./sockets')(io);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ msg: 'Something went wrong!', error: err.message });
});

// Start the server
const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`Server started on port ${port}`));
