const { jwtVerify, createSecretKey } = require('jose');
const pool = require('../config/db');

module.exports = async function (req, res, next) {
  // Get token from cookie or header (for backward compatibility or non-browser clients)
  let token = req.cookies.token || req.header('x-auth-token');

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    // Check if token has been blacklisted (logged out or invalidated)
    if (payload.jti) {
      const blacklistCheck = await pool.query(
        'SELECT 1 FROM token_blacklist WHERE token_jti = $1',
        [payload.jti]
      );
      
      if (blacklistCheck.rows.length > 0) {
        return res.status(401).json({ msg: 'Token has been revoked. Please login again.' });
      }
    }
    
    req.user = payload.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
