const pool = require('../config/db');

/**
 * Check if user is within a safe zone (geofence)
 * @param {number} userId - User ID
 * @param {number} latitude - Current latitude
 * @param {number} longitude - Current longitude
 * @param {number} radiusMeters - Acceptable radius in meters
 * @returns {Promise<object>} - Geofence status
 */
async function checkGeofence(userId, latitude, longitude, radiusMeters = 100) {
  try {
    // Tier 2: Check for Rival Clan Territories nearby
    const rivalTerritory = await pool.query(`
      SELECT ct.clan_id, c.name as clan_name, t.id as territory_id
      FROM clan_territories ct
      JOIN clans c ON ct.clan_id = c.id
      JOIN territories t ON ct.territory_id = t.id
      WHERE ST_DWithin(t.area::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography, 200)
      AND ct.clan_id != (SELECT clan_id FROM clan_members WHERE user_id = $3)
      LIMIT 1
    `, [longitude, latitude, userId]);

    if (rivalTerritory.rows.length > 0) {
      return {
        type: 'rival_territory',
        message: `Warning: Entering ${rivalTerritory.rows[0].clan_name} territory!`,
        clanId: rivalTerritory.rows[0].clan_id
      };
    }

    // Get user's saved safe zones
    const zonesResult = await pool.query(
      `SELECT id, name, latitude, longitude, radius_meters, is_active
       FROM user_geofences
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );
    
    if (zonesResult.rows.length === 0) {
      return {
        hasGeofences: false,
        insideZone: null,
        message: 'No geofences configured'
      };
    }
    
    // Check if current position is inside any zone
    let nearestZone = null;
    let distanceToNearest = Infinity;
    
    for (const zone of zonesResult.rows) {
      const distance = calculateDistance(
        latitude, longitude,
        zone.latitude, zone.longitude
      );
      
      if (distance <= zone.radius_meters) {
        return {
          hasGeofences: true,
          insideZone: {
            id: zone.id,
            name: zone.name,
            distance: 0
          },
          message: `Inside ${zone.name}`
        };
      }
      
      // Track nearest zone
      if (distance < distanceToNearest) {
        distanceToNearest = distance;
        nearestZone = zone;
      }
    }
    
    // Outside all zones
    return {
      hasGeofences: true,
      insideZone: null,
      nearestZone: nearestZone ? {
        name: nearestZone.name,
        distance: Math.round(distanceToNearest)
      } : null,
      message: `Outside all zones. Nearest: ${nearestZone?.name || 'none'} (${Math.round(distanceToNearest)}m)`
    };
    
  } catch (err) {
    console.error('Error checking geofence:', err.message);
    return {
      hasGeofences: false,
      error: err.message
    };
  }
}

/**
 * Create a new geofence (safe zone)
 * @param {number} userId - User ID
 * @param {object} geofenceData - Geofence details
 * @returns {Promise<object>} - Created geofence
 */
async function createGeofence(userId, geofenceData) {
  try {
    const { name, latitude, longitude, radiusMeters = 100 } = geofenceData;
    
    const result = await pool.query(
      `INSERT INTO user_geofences 
       (user_id, name, latitude, longitude, radius_meters, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING *`,
      [userId, name, latitude, longitude, radiusMeters]
    );
    
    return {
      success: true,
      geofence: result.rows[0]
    };
  } catch (err) {
    console.error('Error creating geofence:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * @param {number} lat1, lng1 - First point
 * @param {number} lat2, lng2 - Second point
 * @returns {number} - Distance in meters
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Start check-in timer for user
 * @param {number} userId - User ID
 * @param {number} intervalMinutes - Check-in interval
 * @returns {Promise<object>} - Timer status
 */
async function startCheckInTimer(userId, intervalMinutes = 30) {
  try {
    // Cancel any existing timer
    await pool.query(
      `UPDATE user_checkin_timers 
       SET is_active = FALSE 
       WHERE user_id = $1`,
      [userId]
    );
    
    // Create new timer
    const expiresAt = new Date(Date.now() + intervalMinutes * 60 * 1000);
    
    const result = await pool.query(
      `INSERT INTO user_checkin_timers 
       (user_id, interval_minutes, next_checkin_at, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING *`,
      [userId, intervalMinutes, expiresAt]
    );
    
    return {
      success: true,
      timer: result.rows[0],
      message: `Check-in timer started. Next check-in due by ${expiresAt.toLocaleString()}`
    };
  } catch (err) {
    console.error('Error starting check-in timer:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Record user check-in
 * @param {number} userId - User ID
 * @param {string} message - Optional check-in message
 * @returns {Promise<object>} - Check-in result
 */
async function recordCheckIn(userId, message = '') {
  try {
    const now = new Date();
    
    // Record check-in
    await pool.query(
      `INSERT INTO user_checkins (user_id, message, checked_in_at)
       VALUES ($1, $2, $3)`,
      [userId, message, now]
    );
    
    // Update timer
    const timerResult = await pool.query(
      `UPDATE user_checkin_timers 
       SET last_checkin_at = NOW(),
           next_checkin_at = NOW() + (interval_minutes || ' minutes')::INTERVAL
       WHERE user_id = $1 AND is_active = TRUE
       RETURNING *`,
      [userId]
    );
    
    return {
      success: true,
      message: 'Check-in recorded successfully!',
      nextCheckIn: timerResult.rows[0]?.next_checkin_at || null
    };
  } catch (err) {
    console.error('Error recording check-in:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Check if user is overdue for check-in
 * @param {number} userId - User ID
 * @returns {Promise<object>} - Overdue status
 */
async function checkOverdue(userId) {
  try {
    const result = await pool.query(
      `SELECT * FROM user_checkin_timers
       WHERE user_id = $1 AND is_active = TRUE
       AND next_checkin_at < NOW()`,
      [userId]
    );
    
    if (result.rows.length > 0) {
      const timer = result.rows[0];
      const overdueMinutes = Math.floor(
        (Date.now() - new Date(timer.next_checkin_at).getTime()) / 60000
      );
      
      return {
        isOverdue: true,
        overdueMinutes,
        message: `User is ${overdueMinutes} minutes overdue for check-in`
      };
    }
    
    return {
      isOverdue: false,
      message: 'User is up to date with check-ins'
    };
  } catch (err) {
    console.error('Error checking overdue status:', err.message);
    return {
      isOverdue: false,
      error: err.message
    };
  }
}

module.exports = {
  checkGeofence,
  createGeofence,
  startCheckInTimer,
  recordCheckIn,
  checkOverdue,
  calculateDistance
};
