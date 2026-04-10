const { Pool } = require('pg');
require('dotenv').config();

// Database connection pool configuration
const poolConfig = {
  // Maximum number of clients in the pool
  max: 20,
  
  // Close idle clients after 30 seconds
  idleTimeoutMillis: 30000,
  
  // Return an error after 10 seconds if connection could not be established
  connectionTimeoutMillis: 10000,
  
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

// Helper function to parse DATABASE_URL and handle special characters
function parseDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    return {
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      host: parsed.hostname,
      port: parseInt(parsed.port) || 5432,
      database: parsed.pathname.substring(1), // Remove leading '/'
      ssl: { rejectUnauthorized: false }
    };
  } catch (e) {
    console.error('[DB] Error parsing DATABASE_URL:', e.message);
    return null;
  }
}

let pool;

if (isValidDatabaseUrl(process.env.DATABASE_URL)) {
  const parsedConfig = parseDatabaseUrl(process.env.DATABASE_URL);
  
  if (parsedConfig) {
    // Use parsed configuration for better handling of special characters
    pool = new Pool({
      user: parsedConfig.user,
      password: parsedConfig.password,
      host: parsedConfig.host,
      port: parsedConfig.port,
      database: parsedConfig.database,
      ssl: { 
        rejectUnauthorized: false,
        // Supabase-specific SSL settings
        requestCert: true
      },
      ...poolConfig
    });
    console.log('[DB] Using DATABASE_URL connection string (parsed)');
  } else {
    // Fallback to direct connection string
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      ...poolConfig
    });
    console.log('[DB] Using DATABASE_URL connection string (direct)');
  }
} else {
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'zonerush',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    ...poolConfig
  });
  console.log('[DB] Using individual database parameters');
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