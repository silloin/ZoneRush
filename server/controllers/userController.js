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
      prize: 'RunTerra Pro Achievement Badge + $25 Gear Voucher' 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET api/users/profile
// @desc    Get current user's full profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, city, bio, fitness_level, profile_picture, level, xp, streak,
              total_territory_area as total_distance, territories_captured as total_tiles, role, created_at
       FROM users 
       WHERE id = $1`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    const userProfile = result.rows[0];
    
    // Convert relative profile_picture URL to full URL if it exists
    if (userProfile.profile_picture && userProfile.profile_picture.startsWith('/uploads/')) {
      userProfile.profile_picture = `${req.protocol}://${req.get('host')}${userProfile.profile_picture}`;
    }
    
    res.json(userProfile);
  } catch (err) {
    console.error('Error fetching profile:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route   PUT api/users/profile
// @desc    Update user profile (username, city, bio, fitness_level)
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { username, city, bio, fitness_level } = req.body;
    
    // Validate input
    if (!username && !city && !bio && !fitness_level) {
      return res.status(400).json({ msg: 'At least one field is required' });
    }
    
    const userId = parseInt(req.user.id, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ msg: 'Invalid user' });
    }

    if (username) {
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, userId]
      );
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ msg: 'Username already taken' });
      }
    }
    
    const ALLOWED_FITNESS_LEVELS = ['beginner', 'intermediate', 'advanced'];
    if (fitness_level && !ALLOWED_FITNESS_LEVELS.includes(fitness_level)) {
      return res.status(400).json({ msg: 'Invalid fitness level' });
    }

    const result = await pool.query(
      `UPDATE users SET
         username      = COALESCE(NULLIF($1, ''), username),
         city          = COALESCE(NULLIF($2, ''), city),
         bio           = COALESCE(NULLIF($3, ''), bio),
         fitness_level = COALESCE(NULLIF($4, ''), fitness_level),
         updated_at    = NOW()
       WHERE id = $5
       RETURNING id, username, city, bio, fitness_level, profile_picture, level, xp`,
      [username || null, city || null, bio || null, fitness_level || null, userId]
    );
    
    const updatedUser = result.rows[0];
    
    // Convert relative profile_picture URL to full URL if it exists
    if (updatedUser.profile_picture && updatedUser.profile_picture.startsWith('/uploads/')) {
      updatedUser.profile_picture = `${req.protocol}://${req.get('host')}${updatedUser.profile_picture}`;
    }
    
    res.json({
      msg: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('Error updating profile:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route   PUT api/users/profile/photo
// @desc    Update user profile photo URL
// @access  Private
exports.updateProfilePhoto = async (req, res) => {
  try {
    const { profilePhotoUrl } = req.body;
    
    if (!profilePhotoUrl) {
      return res.status(400).json({ msg: 'Profile photo URL is required' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(profilePhotoUrl);
    } catch {
      return res.status(400).json({ msg: 'Invalid profile photo URL' });
    }
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ msg: 'Profile photo URL must use http or https' });
    }

    const safeUrl = parsedUrl.href;
    const userId = parseInt(req.user.id, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ msg: 'Invalid user' });
    }

    const result = await pool.query(
      `UPDATE users 
       SET profile_picture = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, profile_picture`,
      [safeUrl, userId]
    );
    
    res.json({
      msg: 'Profile photo updated successfully',
      profilePhotoUrl: result.rows[0].profile_picture
    });
  } catch (err) {
    console.error('Error updating profile photo:', err.message);
    res.status(500).send('Server Error');
  }
};
