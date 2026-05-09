const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  logger.error(`[ErrorHandler] [${statusCode}] ${req.method} ${req.originalUrl} — ${message}`, {
    errorName: err.name,
    errorCode: err.code,
    stack: err.stack,
  });

  res.status(statusCode).json({ error: message });
};

module.exports = errorHandler;
