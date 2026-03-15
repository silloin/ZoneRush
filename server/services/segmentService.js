const pool = require('../config/db');

class SegmentService {
  // Detect if route intersects with segments
  async detectSegments(routeGeometry) {
    try {
      const query = `
        SELECT s.*, ST_AsGeoJSON(s.geometry) as geometry_json
        FROM segments s
        WHERE s.is_active = true
        AND ST_Intersects(
          s.geometry,
          ST_GeomFromText($1, 4326)
        )
      `;
      const result = await pool.query(query, [routeGeometry]);
      return result.rows.map(row => ({ ...row, geometry: JSON.parse(row.geometry_json) }));
    } catch (err) {
      console.warn('Segment detection skipped:', err.message);
      return [];
    }
  }

  // Record segment effort
  async recordSegmentEffort(segmentId, userId, runId, elapsedTime, startedAt, completedAt) {
    const segment = await this.getSegment(segmentId);
    const pace = (elapsedTime / 60) / (segment.distance / 1000);

    const query = `
      INSERT INTO segment_efforts 
      (segment_id, user_id, run_id, elapsed_time, pace, started_at, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      segmentId, userId, runId, elapsedTime, pace, startedAt, completedAt
    ]);

    await this.updateSegmentRanks(segmentId);
    
    return result.rows[0];
  }

  // Update segment leaderboard ranks
  async updateSegmentRanks(segmentId) {
    const query = `
      WITH ranked_efforts AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY elapsed_time ASC) as new_rank
        FROM segment_efforts
        WHERE segment_id = $1
      )
      UPDATE segment_efforts se
      SET rank = re.new_rank
      FROM ranked_efforts re
      WHERE se.id = re.id
    `;
    
    await pool.query(query, [segmentId]);
  }

  // Get segment leaderboard
  async getSegmentLeaderboard(segmentId, limit = 10) {
    const query = `
      SELECT 
        se.*,
        u.username,
        u.profile_picture,
        r.completed_at as run_date
      FROM segment_efforts se
      JOIN users u ON se.user_id = u.id
      JOIN runs r ON se.run_id = r.id
      WHERE se.segment_id = $1
      ORDER BY se.elapsed_time ASC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [segmentId, limit]);
    return result.rows;
  }

  // Get user's best effort on segment
  async getUserBestEffort(segmentId, userId) {
    const query = `
      SELECT se.*, r.completed_at as run_date
      FROM segment_efforts se
      JOIN runs r ON se.run_id = r.id
      WHERE se.segment_id = $1 AND se.user_id = $2
      ORDER BY se.elapsed_time ASC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [segmentId, userId]);
    return result.rows[0] || null;
  }

  // Create new segment
  async createSegment(name, description, coordinates, distance, difficulty, createdBy) {
    const lineString = `LINESTRING(${coordinates.map(c => `${c.lng} ${c.lat}`).join(', ')})`;
    const startPoint = `POINT(${coordinates[0].lng} ${coordinates[0].lat})`;
    const endPoint = `POINT(${coordinates[coordinates.length - 1].lng} ${coordinates[coordinates.length - 1].lat})`;

    const query = `
      INSERT INTO segments 
      (name, description, geometry, start_point, end_point, distance, difficulty, created_by)
      VALUES ($1, $2, ST_GeomFromText($3, 4326), ST_GeomFromText($4, 4326), 
              ST_GeomFromText($5, 4326), $6, $7, $8)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      name, description, lineString, startPoint, endPoint, distance, difficulty, createdBy
    ]);
    
    return result.rows[0];
  }

  // Get segment details
  async getSegment(segmentId) {
    const query = `
      SELECT s.*, 
             ST_AsGeoJSON(s.geometry) as geometry_json,
             u.username as creator_name,
             COUNT(DISTINCT se.user_id) as total_attempts
      FROM segments s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN segment_efforts se ON s.id = se.segment_id
      WHERE s.id = $1
      GROUP BY s.id, u.username
    `;
    
    const result = await pool.query(query, [segmentId]);
    
    if (result.rows.length === 0) return null;
    
    const segment = result.rows[0];
    segment.geometry = JSON.parse(segment.geometry_json);
    return segment;
  }

  // Get nearby segments
  async getNearbySegments(lat, lng, radiusMeters = 5000) {
    const query = `
      SELECT s.*, 
             ST_AsGeoJSON(s.geometry) as geometry_json,
             ST_Distance(
               s.start_point::geography,
               ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
             ) as distance_meters
      FROM segments s
      WHERE s.is_active = true
      AND ST_DWithin(
        s.start_point::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        $3
      )
      ORDER BY distance_meters ASC
      LIMIT 20
    `;
    
    const result = await pool.query(query, [lat, lng, radiusMeters]);
    return result.rows.map(row => ({
      ...row,
      geometry: JSON.parse(row.geometry_json)
    }));
  }

  // Get user's segment efforts
  async getUserSegmentEfforts(userId, limit = 20) {
    const query = `
      SELECT 
        se.*,
        s.name as segment_name,
        s.distance as segment_distance,
        r.completed_at as run_date
      FROM segment_efforts se
      JOIN segments s ON se.segment_id = s.id
      JOIN runs r ON se.run_id = r.id
      WHERE se.user_id = $1
      ORDER BY se.created_at DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }
}

module.exports = new SegmentService();
