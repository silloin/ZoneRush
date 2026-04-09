const crypto = require('crypto');

/**
 * Middleware to verify HMAC signature of the request body
 * This prevents request tampering and ensures data integrity for sensitive endpoints.
 */
const verifyHMAC = (req, res, next) => {
  const signature = req.header('x-signature');
  const timestamp = req.header('x-timestamp');
  
  if (!signature || !timestamp) {
    return res.status(401).json({ msg: 'Missing request signature or timestamp' });
  }

  // Check if timestamp is within a reasonable range (e.g., 5 minutes) to prevent replay attacks
  const now = Date.now();
  if (Math.abs(now - parseInt(timestamp)) > 5 * 60 * 1000) {
    return res.status(401).json({ msg: 'Request timestamp expired' });
  }

  const secret = process.env.HMAC_SECRET || 'your-default-hmac-secret';
  const body = JSON.stringify(req.body);
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({ msg: 'Invalid request signature' });
  }

  next();
};

module.exports = { verifyHMAC };
