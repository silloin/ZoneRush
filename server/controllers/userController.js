const pool = require('../config/db');

// @route   GET api/users/leaderboard
// @desc    Get global or city leaderboard
// @access  Public
exports.getLeaderboard = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id, 
        u.username, 
        u.xp, 
        u.level, 
        u.streak,
        (SELECT COUNT(*) FROM captured_tiles ct WHERE ct.user_id = u.id) as "totalTiles",
        (SELECT COALESCE(SUM(r.distance), 0) FROM runs r WHERE r.user_id = u.id) as "totalDistance"
      FROM users u
      ORDER BY xp DESC, "totalTiles" DESC
      LIMIT 20
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching leaderboard:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route   POST api/users/prize-draw
// @desc    Random monthly prize draw from top users
// @access  Private/Admin
exports.monthlyPrizeDraw = async (req, res) => {
  try {
    const topUsers = await pool.query(
      'SELECT username FROM users ORDER BY totaltiles DESC LIMIT 10'
    );

    if (topUsers.rows.length === 0) {
      return res.status(404).json({ msg: 'No eligible users found' });
    }

    const winner = topUsers.rows[Math.floor(Math.random() * topUsers.rows.length)];

    res.json({
      winner: winner.username,
      prize: 'RunTerra Pro Achievement Badge + $25 Gear Voucher',
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
