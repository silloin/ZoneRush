const pool = require('../config/db');

// @route   GET api/users/leaderboard
// @desc    Get global or city leaderboard
// @access  Public
exports.getLeaderboard = async (req, res) => {
  const { city } = req.query;
  let query = 'SELECT username, totaltiles as "totalTiles", totaldistance as "totalDistance", city FROM users';
  const params = [];

  if (city) {
    query += ' WHERE city ILIKE $1';
    params.push(`%${city}%`);
  }

  query += ' ORDER BY totaltiles DESC LIMIT 20';

  try {
    const users = await pool.query(query, params);
    res.json(users.rows);
  } catch (err) {
    console.error(err.message);
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
