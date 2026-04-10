const { Pool } = require('pg');
require('dotenv').config();

// Database connection pool configuration
const poolConfig = {
  // Maximum number of clients in the pool
  max: 20,
  
  // Close idle clients after 30 seconds
  idleTimeoutMillis: 30000,
  
  // Return an error after 2 seconds if connection could not be established
  connectionTimeoutMillis: 2000,
  
  // Cancel queries running longer than 30 seconds to prevent hanging
  statement_timeout: 30000,
  
  // Log connection events for debugging
  log: (msg) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DB Pool]', msg);
    }
  }
};

// Helper function to validate DATABASE_URL
function isValidDatabaseUrl(url) {
  if (!url) return false;
  try {
    new URL(url);
    // Check if it has the basic postgres structure
    return url.startsWith('postgres://') || url.startsWith('postgresql://');
  } catch (e) {
    return false;
  }
}

const pool = isValidDatabaseUrl(process.env.DATABASE_URL)
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      ...poolConfig
    })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_DATABASE || 'zonerush',
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT) || 5432,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      ...poolConfig
    });

// Log which configuration is being used
if (isValidDatabaseUrl(process.env.DATABASE_URL)) {
  console.log('[DB] Using DATABASE_URL connection string');
} else {
  console.log('[DB] Using individual database parameters (DATABASE_URL is invalid or not set)');
  if (process.env.DATABASE_URL) {
    console.warn('[DB] WARNING: DATABASE_URL appears to be malformed. Using fallback configuration.');
  }
}

// Error handling for the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // Don't crash the server, but log the error
});

pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB] New client connected to pool');
  }
});

pool.on('remove', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB] Client removed from pool');
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[DB] SIGTERM received. Closing database pool...');
  await pool.end();
  console.log('[DB] Database pool closed');
});

process.on('SIGINT', async () => {
  console.log('[DB] SIGINT received. Closing database pool...');
  await pool.end();
  console.log('[DB] Database pool closed');
});

module.exports = pool;