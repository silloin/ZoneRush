const pool = require('../config/db');

/**
 * IDOR Protection Middleware
 * Prevents Insecure Direct Object Reference vulnerabilities
 * by enforcing ownership checks on all resource access
 */

/**
 * Check if user owns a resource
 * @param {string} table - Database table name
 * @param {string} ownerColumn - Column name that stores the owner's user_id
 * @param {string} idParam - Request parameter name containing the resource ID
 */
const checkOwnership = (table, ownerColumn = 'user_id', idParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParam] || req.body[idParam];
      
      if (!resourceId) {
        return res.status(400).json({ 
          msg: `Missing resource ID parameter: ${idParam}` 
        });
      }

      // Validate ID is a positive integer
      const id = parseInt(resourceId, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ 
          msg: `Invalid ${idParam}: must be a positive integer` 
        });
      }

      // Check if resource exists and get owner
      const result = await pool.query(
        `SELECT ${ownerColumn} FROM ${table} WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          msg: 'Resource not found' 
        });
      }

      const ownerId = result.rows[0][ownerColumn];

      // Check if requesting user is the owner
      if (String(ownerId) !== String(req.user.id)) {
        // Log unauthorized access attempt
        await pool.query(
          `INSERT INTO security_events (user_id, event_type, ip_address, details)
           VALUES ($1, 'unauthorized_access', $2, $3)`,
          [req.user.id, req.ip, JSON.stringify({
            table,
            resourceId: id,
            resourceOwner: ownerId,
            attempt: 'IDOR'
          })]
        );

        return res.status(403).json({ 
          msg: 'Access denied. You do not own this resource.' 
        });
      }

      // Ownership verified - attach resource owner to request
      req.resourceOwner = ownerId;
      req.resourceId = id;
      next();
    } catch (error) {
      console.error('Ownership check error:', error.message);
      res.status(500).json({ msg: 'Server error during authorization check' });
    }
  };
};

/**
 * Check if user is participant in a conversation/message
 * Special handler for messaging systems
 */
const checkMessageParticipant = async (req, res, next) => {
  try {
    const messageId = req.params.messageId || req.params.id;
    
    if (!messageId) {
      return res.status(400).json({ msg: 'Missing message ID' });
    }

    const id = parseInt(messageId, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ msg: 'Invalid message ID' });
    }

    // Check if user is sender or receiver
    const result = await pool.query(
      `SELECT sender_id, receiver_id FROM messages WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'Message not found' });
    }

    const message = result.rows[0];
    const isParticipant = 
      String(message.sender_id) === String(req.user.id) || 
      String(message.receiver_id) === String(req.user.id);

    if (!isParticipant) {
      await pool.query(
        `INSERT INTO security_events (user_id, event_type, ip_address, details)
         VALUES ($1, 'unauthorized_access', $2, $3)`,
        [req.user.id, req.ip, JSON.stringify({
          type: 'message',
          messageId: id,
          attempt: 'IDOR'
        })]
      );

      return res.status(403).json({ 
        msg: 'Access denied. You are not a participant in this conversation.' 
      });
    }

    req.resourceId = id;
    next();
  } catch (error) {
    console.error('Message participant check error:', error.message);
    res.status(500).json({ msg: 'Server error during authorization check' });
  }
};

/**
 * Check if user can access another user's profile
 * Allows users to view their own profile, restricts sensitive data for others
 */
const checkProfileAccess = async (req, res, next) => {
  try {
    const profileUserId = req.params.userId;
    
    if (!profileUserId) {
      return res.status(400).json({ msg: 'Missing user ID' });
    }

    const id = parseInt(profileUserId, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ msg: 'Invalid user ID' });
    }

    // Check if user exists
    const result = await pool.query(
      `SELECT id, username, email FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const isOwnProfile = String(id) === String(req.user.id);
    req.isOwnProfile = isOwnProfile;
    req.resourceId = id;
    req.profileUser = result.rows[0];

    next();
  } catch (error) {
    console.error('Profile access check error:', error.message);
    res.status(500).json({ msg: 'Server error during authorization check' });
  }
};

/**
 * Validate and sanitize ID parameter
 */
const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName] || req.body[paramName];
    
    if (!id) {
      return res.status(400).json({ 
        msg: `Missing required parameter: ${paramName}` 
      });
    }

    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({ 
        msg: `Invalid ${paramName}: must be a positive integer` 
      });
    }

    req.resourceId = parsedId;
    next();
  };
};

module.exports = {
  checkOwnership,
  checkMessageParticipant,
  checkProfileAccess,
  validateId
};
