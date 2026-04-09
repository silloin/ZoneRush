const ngeohash = require('ngeohash');
const pool = require('../config/db');

class TileService {
  constructor() {
    this.TILE_PRECISION = 8; // ~38m x 19m tiles
  }

  // Generate geohash for a coordinate
  generateGeohash(lat, lng, precision = this.TILE_PRECISION) {
    return ngeohash.encode(lat, lng, precision);
  }

  // Get tile bounds from geohash
  getTileBounds(geohash) {
    return ngeohash.decode_bbox(geohash);
  }

  // Create tile polygon geometry
  createTileGeometry(geohash) {
    const [minLat, minLng, maxLat, maxLng] = this.getTileBounds(geohash);
    return `POLYGON((${minLng} ${minLat}, ${maxLng} ${minLat}, ${maxLng} ${maxLat}, ${minLng} ${maxLat}, ${minLng} ${minLat}))`;
  }

  // Get or create tile
  async getOrCreateTile(lat, lng) {
    const geohash = this.generateGeohash(lat, lng);
    
    const checkQuery = 'SELECT * FROM tiles WHERE geohash = $1';
    const result = await pool.query(checkQuery, [geohash]);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }

    const geometry = this.createTileGeometry(geohash);
    const centerPoint = `POINT(${lng} ${lat})`;
    
    const insertQuery = `
      INSERT INTO tiles (geohash, geometry, center_point, value)
      VALUES ($1, ST_GeomFromText($2, 4326), ST_GeomFromText($3, 4326), 1)
      RETURNING *
    `;
    
    const insertResult = await pool.query(insertQuery, [geohash, geometry, centerPoint]);
    return insertResult.rows[0];
  }

  // Capture tile for user
  async captureTile(userId, lat, lng, runId = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const tile = await this.getOrCreateTile(lat, lng);
      
      // Use SELECT FOR UPDATE to prevent race conditions during concurrent captures
      await client.query('SELECT * FROM tiles WHERE id = $1 FOR UPDATE', [tile.id]);
      
      const captureQuery = `
        INSERT INTO captured_tiles (tile_id, user_id, run_id, capture_count, first_captured_at, last_captured_at)
        VALUES ($1, $2, $3, 1, NOW(), NOW())
        ON CONFLICT (tile_id, user_id) DO UPDATE SET
          capture_count = captured_tiles.capture_count + 1,
          last_captured_at = NOW(),
          run_id = EXCLUDED.run_id
        RETURNING *, (xmax = 0) as is_new_capture
      `;
      
      const result = await client.query(captureQuery, [tile.id, userId, runId]);
      await client.query('COMMIT');
      
      return { 
        captured: true, 
        tile, 
        isNew: result.rows[0].is_new_capture 
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getUserCapturedTiles(currentUserId) {
    const query = `
      SELECT t.geohash, ct.user_id,
             ct.user_id = $1 as is_mine
      FROM tiles t
      JOIN captured_tiles ct ON t.id = ct.tile_id
      ORDER BY ct.last_captured_at DESC
    `;
    const result = await pool.query(query, [currentUserId]);
    return result.rows;
  }

  // Get tiles in bounding box
  async getTilesInBounds(minLat, minLng, maxLat, maxLng) {
    const query = `
      SELECT t.*, 
             u.username as owner_username,
             ct.user_id as owner_id,
             ST_AsGeoJSON(t.geometry) as geometry_json
      FROM tiles t
      LEFT JOIN captured_tiles ct ON t.id = ct.tile_id
      LEFT JOIN users u ON ct.user_id = u.id
      WHERE ST_Intersects(
        t.geometry,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )
    `;
    
    const result = await pool.query(query, [minLng, minLat, maxLng, maxLat]);
    return result.rows.map(row => ({
      ...row,
      geometry: row.geometry_json ? JSON.parse(row.geometry_json) : null
    }));
  }

  // Process route and capture tiles
  async processRouteForTiles(userId, routePoints, runId) {
    const capturedTiles = [];
    const uniqueGeohashes = new Set();

    for (const point of routePoints) {
      const geohash = this.generateGeohash(point.lat, point.lng);
      
      if (!uniqueGeohashes.has(geohash)) {
        uniqueGeohashes.add(geohash);
        const result = await this.captureTile(userId, point.lat, point.lng, runId);
        
        if (result.isNew) {
          capturedTiles.push(result.tile);
        }
      }
    }

    return capturedTiles;
  }

  // Get tile capture statistics
  async getTileStats(userId) {
    const query = `
      SELECT 
        COUNT(*) as total_tiles,
        COUNT(DISTINCT DATE(last_captured_at)) as days_active,
        MIN(first_captured_at) as first_capture,
        MAX(last_captured_at) as last_capture
      FROM captured_tiles
      WHERE user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }
}

module.exports = new TileService();
