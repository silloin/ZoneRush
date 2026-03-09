const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');

// Helper function to calculate area from polygon
const calculateArea = async (polygon, pool) => {
  const result = await pool.query(
    'SELECT ST_Area($1::geography) / 1000000 as area_km2',
    [polygon]
  );
  return parseFloat(result.rows[0].area_km2);
};

// @route   GET api/territories
// @desc    Get all territories as GeoJSON
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Check if territories table exists
    const tableCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'territories'
      )`
    );

    if (!tableCheck.rows[0].exists) {
      return res.json({ type: 'FeatureCollection', features: [] });
    }

    const result = await pool.query(
      `SELECT 
        t.id, 
        t.userid, 
        u.username,
        ST_AsGeoJSON(t.area) as geojson,
        t.capturedat,
        t.tilescaptured
       FROM territories t
       JOIN users u ON t.userid = u.id
       ORDER BY t.capturedat DESC`
    );
    
    const features = result.rows.map(row => ({
      type: 'Feature',
      properties: {
        id: row.id,
        userId: row.userid,
        username: row.username,
        capturedAt: row.capturedat,
        tilesCaptured: row.tilescaptured
      },
      geometry: JSON.parse(row.geojson)
    }));

    res.json({
      type: 'FeatureCollection',
      features
    });
  } catch (err) {
    console.error(err.message);
    res.json({ type: 'FeatureCollection', features: [] });
  }
});

// @route   POST api/territories/claim
// @desc    Claim territory from route with war mechanics
// @access  Private
router.post('/claim', auth, async (req, res) => {
  const { route } = req.body;

  if (!route || route.length < 2) {
    return res.status(400).json({ msg: 'Route must have at least 2 points' });
  }

  try {
    // Convert route to LINESTRING
    const linestring = await pool.query(
      `SELECT ST_AsText(ST_MakeLine(
        ARRAY(
          SELECT ST_SetSRID(ST_MakePoint((coord->>'lng')::float, (coord->>'lat')::float), 4326)
          FROM jsonb_array_elements($1::jsonb) AS coord
        )
      )) as linestring`,
      [JSON.stringify(route)]
    );

    const line = linestring.rows[0].linestring;

    // Create polygon buffer around route (50 meters)
    const polygon = await pool.query(
      `SELECT ST_AsText(ST_Buffer($1::geography, 50)::geometry) as polygon`,
      [line]
    );

    const poly = polygon.rows[0].polygon;

    // Calculate area
    const areaKm2 = await calculateArea(poly, pool);
    const points = Math.max(10, Math.floor(areaKm2 * 100));

    // Check for overlaps with other users' territories (WAR MECHANIC)
    const overlaps = await pool.query(
      `SELECT t.id, t.userid, t.area_km2, u.username,
        ST_Area(ST_Intersection(t.area, $1::geometry)::geography) / 1000000 as overlap_km2
       FROM territories t
       JOIN users u ON t.userid = u.id
       WHERE ST_Intersects(t.area, $1::geometry) AND t.userid != $2`,
      [poly, req.user.id]
    );

    let battles = [];
    let totalPointsStolen = 0;

    // Process territory wars for each overlap
    for (const overlap of overlaps.rows) {
      const overlapArea = parseFloat(overlap.overlap_km2);
      const defenderArea = parseFloat(overlap.area_km2);
      
      // War rule: If attacker has larger total area, they can steal
      const attackerStats = await pool.query(
        'SELECT total_territory_area FROM users WHERE id = $1',
        [req.user.id]
      );
      
      const attackerTotalArea = parseFloat(attackerStats.rows[0]?.total_territory_area || 0);
      
      // Steal condition: Attacker's new area > defender's current territory
      if (areaKm2 > defenderArea * 0.5) {
        // Calculate stolen points
        const stolenPoints = Math.floor(overlapArea * 100);
        totalPointsStolen += stolenPoints;
        
        // Mark territory as stolen
        await pool.query(
          `UPDATE territories 
           SET is_stolen = TRUE, stolen_from = userid, userid = $1, points = $2
           WHERE id = $3`,
          [req.user.id, stolenPoints, overlap.id]
        );
        
        // Update defender's stats
        await pool.query(
          `UPDATE users 
           SET territory_points = GREATEST(0, territory_points - $1),
               total_territory_area = GREATEST(0, total_territory_area - $2)
           WHERE id = $3`,
          [stolenPoints, overlapArea, overlap.userid]
        );
        
        // Record battle
        const battle = await pool.query(
          `INSERT INTO territory_battles 
           (attacker_id, defender_id, territory_id, attacker_area, defender_area, winner_id, points_transferred)
           VALUES ($1, $2, $3, $4, $5, $1, $6) RETURNING *`,
          [req.user.id, overlap.userid, overlap.id, areaKm2, defenderArea, stolenPoints]
        );
        
        battles.push({
          ...battle.rows[0],
          defenderUsername: overlap.username,
          stolenArea: overlapArea,
          stolenPoints
        });
      }
    }

    // Insert new territory
    const newTerritory = await pool.query(
      `INSERT INTO territories (userid, area, tilescaptured, area_km2, points)
       VALUES ($1, $2::geometry, $3, $4, $5)
       RETURNING id, ST_AsGeoJSON(area) as geojson, capturedat, area_km2, points`,
      [req.user.id, poly, route.length, areaKm2, points]
    );

    // Update user's territory stats
    await pool.query(
      `UPDATE users 
       SET total_territory_area = total_territory_area + $1,
           territory_points = territory_points + $2,
           territories_captured = territories_captured + 1
       WHERE id = $3`,
      [areaKm2, points, req.user.id]
    );

    res.json({
      territory: {
        id: newTerritory.rows[0].id,
        geometry: JSON.parse(newTerritory.rows[0].geojson),
        capturedAt: newTerritory.rows[0].capturedat,
        areaKm2: parseFloat(newTerritory.rows[0].area_km2),
        points: newTerritory.rows[0].points
      },
      battles,
      totalPointsStolen,
      newTerritoryArea: areaKm2,
      totalPoints: points
    });
  } catch (err) {
    console.error('POST /territories/claim error:', err.message);
    console.error(err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/territories/user/:userId
// @desc    Get user territories
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        ST_AsGeoJSON(area) as geojson,
        capturedat,
        tilescaptured,
        ST_Area(area::geography) / 1000000 as area_km2
       FROM territories
       WHERE userid = $1
       ORDER BY capturedat DESC`,
      [req.params.userId]
    );

    const features = result.rows.map(row => ({
      type: 'Feature',
      properties: {
        id: row.id,
        capturedAt: row.capturedat,
        tilesCaptured: row.tilescaptured,
        areaKm2: parseFloat(row.area_km2).toFixed(2)
      },
      geometry: JSON.parse(row.geojson)
    }));

    res.json({
      type: 'FeatureCollection',
      features
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/territories/check-overlap
// @desc    Check if route overlaps existing territories
// @access  Private
router.post('/check-overlap', auth, async (req, res) => {
  const { route } = req.body;

  if (!route || route.length < 2) {
    return res.json([]);
  }

  try {
    const linestring = await pool.query(
      `SELECT ST_AsText(ST_MakeLine(
        ARRAY(
          SELECT ST_SetSRID(ST_MakePoint((coord->>'lng')::float, (coord->>'lat')::float), 4326)
          FROM jsonb_array_elements($1::jsonb) AS coord
        )
      )) as linestring`,
      [JSON.stringify(route)]
    );

    const overlaps = await pool.query(
      `SELECT 
        t.id,
        t.userid as "userId",
        u.username,
        ST_Area(ST_Intersection(t.area, ST_Buffer($1::geography, 50)::geometry)::geography) as "overlapArea"
       FROM territories t
       JOIN users u ON t.userid = u.id
       WHERE ST_Intersects(t.area, ST_Buffer($1::geography, 50)::geometry)`,
      [linestring.rows[0].linestring]
    );

    res.json(overlaps.rows);
  } catch (err) {
    console.error('POST /territories/check-overlap error:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/territories/leaderboard
// @desc    Get territory leaderboard by area and points
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'area' } = req.query; // 'area' or 'points' or 'battles'
    
    let query;
    if (type === 'area') {
      query = `
        SELECT 
          u.id, u.username, u.city,
          u.total_territory_area as "totalArea",
          u.territory_points as "territoryPoints",
          u.territories_captured as "territoriesCaptured",
          COUNT(t.id) as "currentTerritories"
        FROM users u
        LEFT JOIN territories t ON t.userid = u.id
        GROUP BY u.id, u.username, u.city, u.total_territory_area, u.territory_points, u.territories_captured
        ORDER BY u.total_territory_area DESC
        LIMIT 50
      `;
    } else if (type === 'points') {
      query = `
        SELECT 
          u.id, u.username, u.city,
          u.total_territory_area as "totalArea",
          u.territory_points as "territoryPoints",
          u.territories_captured as "territoriesCaptured",
          COUNT(t.id) as "currentTerritories"
        FROM users u
        LEFT JOIN territories t ON t.userid = u.id
        GROUP BY u.id, u.username, u.city, u.total_territory_area, u.territory_points, u.territories_captured
        ORDER BY u.territory_points DESC
        LIMIT 50
      `;
    } else if (type === 'battles') {
      query = `
        SELECT 
          u.id, u.username, u.city,
          COUNT(b.id) as "battlesWon",
          COALESCE(SUM(b.points_transferred), 0) as "totalPointsStolen"
        FROM users u
        LEFT JOIN territory_battles b ON b.winner_id = u.id
        GROUP BY u.id, u.username, u.city
        ORDER BY "battlesWon" DESC
        LIMIT 50
      `;
    }
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /territories/leaderboard error:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/territories/battles
// @desc    Get recent territory battles
// @access  Public
router.get('/battles', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const battles = await pool.query(
      `SELECT 
        b.id,
        a.username as "attackerName",
        d.username as "defenderName",
        w.username as "winnerName",
        b.attacker_area as "attackerArea",
        b.defender_area as "defenderArea",
        b.points_transferred as "pointsTransferred",
        b.battle_date as "battleDate"
       FROM territory_battles b
       JOIN users a ON a.id = b.attacker_id
       JOIN users d ON d.id = b.defender_id
       JOIN users w ON w.id = b.winner_id
       ORDER BY b.battle_date DESC
       LIMIT $1`,
      [limit]
    );
    
    res.json(battles.rows);
  } catch (err) {
    console.error('GET /territories/battles error:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/territories/stats/:userId
// @desc    Get user's territory statistics
// @access  Public
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user stats
    const userStats = await pool.query(
      `SELECT 
        total_territory_area as "totalArea",
        territory_points as "territoryPoints",
        territories_captured as "territoriesCaptured"
       FROM users WHERE id = $1`,
      [userId]
    );
    
    // Get current territories
    const territories = await pool.query(
      `SELECT COUNT(*) as count FROM territories WHERE userid = $1`,
      [userId]
    );
    
    // Get stolen territories count
    const stolen = await pool.query(
      `SELECT COUNT(*) as count FROM territories WHERE userid = $1 AND is_stolen = TRUE`,
      [userId]
    );
    
    // Get battles won/lost
    const battles = await pool.query(
      `SELECT 
        COUNT(CASE WHEN winner_id = $1 THEN 1 END) as won,
        COUNT(CASE WHEN attacker_id = $1 AND winner_id != $1 THEN 1 END) as lost_attacking,
        COUNT(CASE WHEN defender_id = $1 AND winner_id != $1 THEN 1 END) as lost_defending
       FROM territory_battles
       WHERE attacker_id = $1 OR defender_id = $1`,
      [userId]
    );
    
    res.json({
      ...userStats.rows[0],
      currentTerritories: parseInt(territories.rows[0].count),
      stolenTerritories: parseInt(stolen.rows[0].count),
      battlesWon: parseInt(battles.rows[0].won),
      battlesLostAttacking: parseInt(battles.rows[0].lost_attacking),
      battlesLostDefending: parseInt(battles.rows[0].lost_defending)
    });
  } catch (err) {
    console.error('GET /territories/stats error:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

module.exports = router;
