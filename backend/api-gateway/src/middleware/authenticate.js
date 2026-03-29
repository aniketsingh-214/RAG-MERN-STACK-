const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    const token = authHeader.substring(7);
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'Token expired. Please login again.', code: 'TOKEN_EXPIRED' });
    if (error.name === 'JsonWebTokenError')
      return res.status(401).json({ error: 'Invalid token.', code: 'INVALID_TOKEN' });
    logger.error(`Auth error: ${error.message}`);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = authenticate;
