const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Get token from header - check both x-auth-token and Authorization
  let token = req.header('x-auth-token');
  
  // If not found in x-auth-token, check Authorization header
  if (!token) {
    const authHeader = req.header('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
  }

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { ...decoded.user, role: decoded.user.role }; // Ensure role is included
    next();
  } catch (err) {
    console.error('JWT verification error:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};