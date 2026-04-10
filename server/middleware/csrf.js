const crypto = require('crypto');

/**
 * Custom CSRF Protection Middleware
 * 
 * 1. Generates a random CSRF token if not present in session/cookie.
 * 2. Sets the token in a non-httpOnly cookie so the frontend can read it.
 * 3. Validates the 'x-csrf-token' header on state-changing requests.
 */

const csrfProtection = (req, res, next) => {
  // 1. Generate token if it doesn't exist
  let csrfToken = req.cookies['csrf-token'];
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('hex');
    const cookieOptions = {
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false, // Must be accessible by frontend
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    };
    
    // In production, don't set domain to allow cross-origin cookies
    if (process.env.NODE_ENV !== 'production') {
      cookieOptions.domain = 'localhost';
    }
    
    res.cookie('csrf-token', csrfToken, cookieOptions);
  }

  // 2. Skip validation for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // 3. Validate token from header
  const headerToken = req.headers['x-csrf-token'];
  if (!headerToken || headerToken !== csrfToken) {
    return res.status(403).json({ msg: 'CSRF token mismatch or missing' });
  }

  next();
};

module.exports = csrfProtection;
