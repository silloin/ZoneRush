const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { SignJWT, createSecretKey } = require('jose');
const { authRateLimitMiddleware } = require('../middleware/rateLimiter');
const auth = require('../middleware/auth');
const pool = require('../config/db');
const emailVerificationService = require('../services/emailVerificationService');
const passwordResetService = require('../services/passwordResetService');

// @route   GET api/auth/csrf-token
// @desc    Get CSRF token (public endpoint for establishing session)
// @access  Public
router.get('/csrf-token', (req, res) => {
  // CSRF middleware already sets the cookie, just return success
  res.json({ msg: 'CSRF token set' });
});

// @route   GET api/auth
// @desc    Get user by token
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.xp, 
        u.level, 
        u.streak,
        COALESCE(u.total_xp, 0) as "totalDistance",
        COALESCE(u.territories_captured, 0) as "totalTiles",
        COALESCE(u.total_territory_area, 0) as "weeklyMileage"
      FROM users u
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error in auth middleware:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', authRateLimitMiddleware, async (req, res) => {
  const { username, email, password } = req.body;

  // Validate input
  if (!username || !email || !password) {
    return res.status(400).json({ msg: 'Please provide all fields' });
  }
  if (username.length < 3) {
    return res.status(400).json({ msg: 'Username must be at least 3 characters' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ msg: 'Invalid email format' });
  }
  if (password.length < 6) {
    return res.status(400).json({ msg: 'Password must be at least 6 characters' });
  }

  try {

    // Check if user exists
    let user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length > 0) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into database
    const newUser = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('CRITICAL: JWT_SECRET is not set in environment variables');
      return res.status(500).json({ msg: 'Server configuration error. Please contact administrator.' });
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const token = await new SignJWT({ user: { id: newUser.rows[0].id } })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(secret);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Send verification email (non-blocking)
    try {
      await emailVerificationService.sendVerificationEmail(
        newUser.rows[0].id,
        newUser.rows[0].email,
        newUser.rows[0].username
      );
      console.log(`Verification email sent to ${newUser.rows[0].email}`);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError.message);
      // Don't fail registration if email fails
    }

    res.json({ 
      user: {
        id: newUser.rows[0].id,
        username: newUser.rows[0].username,
        email: newUser.rows[0].email,
        emailVerified: false
      },
      msg: 'Registration successful. Please check your email to verify your account.'
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    console.error('Error details:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authRateLimitMiddleware, async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ msg: 'Please provide email and password' });
    }

    // Check if user exists
    let user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      console.log(`Login failed: User not found for email ${email}`);
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!isMatch) {
      console.log(`Login failed: Password mismatch for user ${email}`);
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('CRITICAL: JWT_SECRET is not set in environment variables');
      return res.status(500).json({ msg: 'Server configuration error. Please contact administrator.' });
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const token = await new SignJWT({ user: { id: user.rows[0].id } })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(secret);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({ 
      user: {
        id: user.rows[0].id,
        username: user.rows[0].username,
        email: user.rows[0].email
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// @route   POST api/auth/logout
// @desc    Logout user & clear cookie
// @access  Public
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ msg: 'Logged out successfully' });
});

// @route   POST api/auth/verify-email
// @desc    Verify email with token
// @access  Public
router.post('/verify-email', authRateLimitMiddleware, async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ msg: 'Verification token is required' });
  }

  try {
    const result = await emailVerificationService.verifyToken(token);

    if (!result.success) {
      return res.status(400).json({ msg: result.error });
    }

    res.json({
      msg: 'Email verified successfully',
      userId: result.userId,
      email: result.email
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ msg: 'Server error during verification' });
  }
});

// @route   POST api/auth/resend-verification
// @desc    Resend verification email
// @access  Private
router.post('/resend-verification', auth, authRateLimitMiddleware, async (req, res) => {
  try {
    const result = await emailVerificationService.resendVerificationEmail(req.user.id);

    res.json({
      msg: 'Verification email resent',
      expiresAt: result.expiresAt
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    
    if (error.message.includes('already verified')) {
      return res.status(400).json({ msg: 'Email already verified' });
    }
    
    if (error.message.includes('Too many requests')) {
      return res.status(429).json({ msg: error.message });
    }

    res.status(500).json({ msg: 'Failed to resend verification email' });
  }
});

// @route   GET api/auth/verification-status
// @desc    Check user's verification status
// @access  Private
router.get('/verification-status', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT email_verified, email FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json({
      emailVerified: result.rows[0].email_verified,
      email: result.rows[0].email
    });
  } catch (error) {
    console.error('Verification status check error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST api/auth/forgot-password
// @desc    Request password reset email
// @access  Public
router.post('/forgot-password', authRateLimitMiddleware, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ msg: 'Email is required' });
  }

  try {
    const result = await passwordResetService.requestPasswordReset(email);
    res.json(result);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', authRateLimitMiddleware, async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ msg: 'Token and new password are required' });
  }

  try {
    const result = await passwordResetService.resetPassword(token, newPassword);

    if (!result.success) {
      return res.status(400).json({ msg: result.error });
    }

    res.json({ msg: result.msg });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;