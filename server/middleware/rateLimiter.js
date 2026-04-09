const { RateLimiterRedis } = require('rate-limiter-flexible');
const redis = require('redis');

// Track Redis connection status
let redisConnected = false;

// Create Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  // Only log first error or reconnection attempts, not every failure
  if (redisConnected) {
    console.error('Redis Client Error', err.message);
    redisConnected = false;
  }
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected');
  redisConnected = true;
});

// Connect to redis (non-blocking, errors handled gracefully)
redisClient.connect().catch(() => {
  // Silent fail - Redis is optional
  redisConnected = false;
});

// Check if Redis is available
const isRedisAvailable = () => redisConnected && redisClient.isReady;

// Rate limiter for general API requests (in-memory fallback if Redis unavailable)
let rateLimiter;
let authRateLimiter;

// In-memory store for fallback rate limiting
const memoryStore = new Map();
const authMemoryStore = new Map();

// Create rate limiter with Redis if available, otherwise use in-memory
const createRateLimiter = () => {
  if (isRedisAvailable()) {
    return new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rate_limit',
      points: 100,
      duration: 60,
    });
  }
  return null;
};

const createAuthRateLimiter = () => {
  if (isRedisAvailable()) {
    return new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'auth_rate_limit',
      points: 5,
      duration: 60 * 15,
    });
  }
  return null;
};

rateLimiter = createRateLimiter();
authRateLimiter = createAuthRateLimiter();

// In-memory rate limiting helper
const checkMemoryLimit = (store, key, points, duration) => {
  const now = Date.now();
  const record = store.get(key);
  
  if (!record || now - record.resetTime > duration * 1000) {
    store.set(key, { points: points - 1, resetTime: now + duration * 1000 });
    return true;
  }
  
  if (record.points > 0) {
    record.points--;
    return true;
  }
  
  return false;
};

const rateLimitMiddleware = (req, res, next) => {
  const key = req.user ? `user_${req.user.id}` : `ip_${req.ip}`;
  
  // Use Redis if available
  if (rateLimiter && isRedisAvailable()) {
    rateLimiter.consume(key)
      .then(() => next())
      .catch(() => res.status(429).json({ msg: 'Too many requests, please try again later.' }));
    return;
  }
  
  // Fallback to in-memory
  if (checkMemoryLimit(memoryStore, key, 100, 60)) {
    next();
  } else {
    res.status(429).json({ msg: 'Too many requests, please try again later.' });
  }
};

const authRateLimitMiddleware = (req, res, next) => {
  const key = `ip_${req.ip}`;
  
  // Use Redis if available
  if (authRateLimiter && isRedisAvailable()) {
    authRateLimiter.consume(key)
      .then(() => next())
      .catch(() => res.status(429).json({ msg: 'Too many authentication attempts. Please try again in 15 minutes.' }));
    return;
  }
  
  // Fallback to in-memory
  if (checkMemoryLimit(authMemoryStore, key, 5, 60 * 15)) {
    next();
  } else {
    res.status(429).json({ msg: 'Too many authentication attempts. Please try again in 15 minutes.' });
  }
};

module.exports = {
  rateLimitMiddleware,
  authRateLimitMiddleware,
  redisClient,
  isRedisAvailable
};
