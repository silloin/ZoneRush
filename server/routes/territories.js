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
        t.user_id, 
        u.username,
        ST_AsGeoJSON(t.area) as geojson,
        t.captured_at,
        t.tiles_captured
       FROM territories t
       JOIN users u ON t.user_id = u.id
       ORDER BY t.captured_at DESC`
    );
    
    const features = result.rows.map(row => ({
      type: 'Feature',
      properties: {
        id: row.id,
        userId: row.user_id,
        username: row.username,
        capturedAt: row.captured_at,
        tilesCaptured: row.tiles_captured
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
    const linestringResult = await pool.query(
      `SELECT ST_AsText(ST_MakeLine(
        ARRAY(
          SELECT ST_SetSRID(ST_MakePoint((coord->>'lng')::float, (coord->>'lat')::float), 4326)
          FROM jsonb_array_elements($1::jsonb) AS coord
        )
      )) as linestring`,
      [JSON.stringify(route)]
    );

    const line = linestringResult.rows[0].linestring;

    // Create polygon buffer around route (50 meters)
    const polygonResult = await pool.query(
      `SELECT ST_AsText(ST_Buffer($1::geography, 50)::geometry) as polygon`,
      [line]
    );

    const poly = polygonResult.rows[0].polygon;

    // Calculate area
    const areaKm2 = await calculateArea(poly, pool);
    const points = Math.max(10, Math.floor(areaKm2 * 100));

    // Check for overlaps with other users' territories (WAR MECHANIC)
    const overlaps = await pool.query(
      `SELECT t.id, t.user_id, t.area_km2, u.username,
        ST_Area(ST_Intersection(t.area, $1::geometry)::geography) / 1000000 as overlap_km2
       FROM territories t
       JOIN users u ON t.user_id = u.id
       WHERE ST_Intersects(t.area, $1::geometry) AND t.user_id != $2`,
      [poly, req.user.id]
    );

    let battles = [];
    let totalPointsStolen = 0;

    // Process territory wars for each overlap
    for (const overlap of overlaps.rows) {
      const overlapArea = parseFloat(overlap.overlap_km2);
      const defenderArea = parseFloat(overlap.area_km2);
      
      // Override Rule: New user always takes ownership when overlap occurs
      // Calculate stolen points
      const stolenPoints = Math.floor(overlapArea * 200); // 2x points for stealing
      totalPointsStolen += stolenPoints;
      
      // Mark territory as stolen and transfer ownership
      await pool.query(
        `UPDATE territories 
         SET is_stolen = TRUE, stolen_from_id = user_id, user_id = $1, points = $2, area = ST_Difference(area, $3::geometry)
         WHERE id = $4`,
        [req.user.id, stolenPoints, poly, overlap.id]
      );
      
      // Update defender's stats
      await pool.query(
        `UPDATE users 
         SET territory_points = GREATEST(0, territory_points - $1),
             total_territory_area = GREATEST(0, total_territory_area - $2),
             territories_captured = GREATEST(0, territories_captured - 1)
         WHERE id = $3`,
        [stolenPoints, overlapArea, overlap.user_id]
      );
      
      // Record battle
      const battle = await pool.query(
        `INSERT INTO territory_battles 
         (attacker_id, defender_id, territory_id, attacker_area, defender_area, winner_id, points_transferred)
         VALUES ($1, $2, $3, $4, $5, $1, $6) RETURNING *`,
        [req.user.id, overlap.user_id, overlap.id, areaKm2, defenderArea, stolenPoints]
      );
      
      battles.push({
        ...battle.rows[0],
        defenderUsername: overlap.username,
        stolenArea: overlapArea,
        stolenPoints
      });

      // Broadcast the steal event via Socket.IO
      if (req.io) {
        req.io.emit('territory-stolen', {
          attackerId: req.user.id,
          defenderId: overlap.user_id,
          territoryId: overlap.id,
          stolenArea: overlapArea,
          stolenPoints
        });
      }
    }

    // Insert new territory
    const newTerritory = await pool.query(
      `INSERT INTO territories (user_id, area, tiles_captured, area_km2, points)
       VALUES ($1, $2::geometry, $3, $4, $5)
       RETURNING id, ST_AsGeoJSON(area) as geojson, captured_at, area_km2, points`,
      [req.user.id, poly, route.length, areaKm2, points]
    );

    const territoryId = newTerritory.rows[0].id;

    // Clan Integration: Associate territory with user's clan if they have one
    const clanMemberResult = await pool.query('SELECT clan_id FROM clan_members WHERE user_id = $1', [req.user.id]);
    if (clanMemberResult.rows.length > 0) {
      const clanId = clanMemberResult.rows[0].clan_id;
      await pool.query(
        'INSERT INTO clan_territories (clan_id, territory_id) VALUES ($1, $2) ON CONFLICT (territory_id) DO UPDATE SET clan_id = EXCLUDED.clan_id',
        [clanId, territoryId]
      );
      // Update clan stats
      await pool.query('UPDATE clans SET total_territory_area = total_territory_area + $1 WHERE id = $2', [areaKm2, clanId]);
    }

    // Update user's territory stats
    await pool.query(
      `UPDATE users 
       SET territory_points = territory_points + $1,
           total_territory_area = total_territory_area + $2,
           territories_captured = territories_captured + 1
       WHERE id = $3`,
      [points + totalPointsStolen, areaKm2, req.user.id]
    );

    res.json({
      territory: {
        id: newTerritory.rows[0].id,
        geojson: JSON.parse(newTerritory.rows[0].geojson),
        capturedAt: newTerritory.rows[0].captured_at,
        areaKm2: newTerritory.rows[0].area_km2,
        points: newTerritory.rows[0].points
      },
      battles,
      totalPointsStolen
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
