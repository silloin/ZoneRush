const { jwtVerify, createSecretKey } = require('jose');

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
    req.user = payload.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
