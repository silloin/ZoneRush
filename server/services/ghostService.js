const pool = require('../config/db');
const { redisClient, isRedisAvailable } = require('../middleware/rateLimiter');

class GhostService {
  constructor() {
    this.GHOST_KEY_PREFIX = 'ghost:';
    // In-memory fallback cache when Redis unavailable
    this.memoryCache = new Map();
  }

  async prepareGhost(runId) {
    const cacheKey = `${this.GHOST_KEY_PREFIX}${runId}`;
    
    // Check if already cached (Redis or in-memory)
    if (isRedisAvailable()) {
      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } else {
      const cached = this.memoryCache.get(cacheKey);
      if (cached) return cached;
    }

    // Fetch from DB
    const pointsQuery = `
      SELECT 
        ST_X(location::geometry) as lng,
        ST_Y(location::geometry) as lat,
        altitude,
        speed,
        recorded_at,
        sequence_order
      FROM route_points
      WHERE run_id = $1
      ORDER BY sequence_order ASC
    `;
    
    const result = await pool.query(pointsQuery, [runId]);
    const points = result.rows;

    // Cache (Redis or in-memory)
    if (isRedisAvailable()) {
      await redisClient.set(cacheKey, JSON.stringify(points), {
        EX: 86400 // 1 day
      });
    } else {
      this.memoryCache.set(cacheKey, points);
      // Simple TTL cleanup - remove after 1 day
      setTimeout(() => this.memoryCache.delete(cacheKey), 86400000);
    }

    return points;
  }

  // Get ghost position at a specific time offset (in milliseconds from start)
  getGhostPositionAtTime(points, timeOffsetMs) {
    if (!points || points.length === 0) return null;
    
    const startTime = new Date(points[0].recorded_at).getTime();
    const targetTime = startTime + timeOffsetMs;

    // Find the two points between which the ghost would be
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const t1 = new Date(p1.recorded_at).getTime();
      const t2 = new Date(p2.recorded_at).getTime();

      if (targetTime >= t1 && targetTime <= t2) {
        // Interpolate position
        const ratio = (targetTime - t1) / (t2 - t1);
        return {
          lat: p1.lat + (p2.lat - p1.lat) * ratio,
          lng: p1.lng + (p2.lng - p1.lng) * ratio,
          speed: p1.speed + (p2.speed - p1.speed) * ratio,
          altitude: p1.altitude + (p2.altitude - p1.altitude) * ratio
        };
      }
    }

    // If time is past the last point, return last point
    return points[points.length - 1];
  }
}

module.exports = new GhostService();
