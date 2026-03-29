const logger = require('../config/logger');
module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  logger.error(`[${statusCode}] ${req.method} ${req.originalUrl} - ${err.message}`);
  res.status(statusCode).json({ error: err.message || 'Internal Server Error' });
};
