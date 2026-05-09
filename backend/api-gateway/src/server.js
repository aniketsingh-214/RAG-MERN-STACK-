require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

connectDB();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'api-gateway' }));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);

app.use('*', (req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`[Startup] Environment diagnostics:`);
  logger.info(`  NODE_ENV       = ${process.env.NODE_ENV || '(not set)'}`);
  logger.info(`  MONGODB_URI    = ${process.env.MONGODB_URI ? '***set***' : '⚠ NOT SET'}`);
  logger.info(`  JWT_SECRET     = ${process.env.JWT_SECRET ? '***set***' : '⚠ NOT SET'}`);
  logger.info(`  SMTP_HOST      = ${process.env.SMTP_HOST || '⚠ NOT SET'}`);
  logger.info(`  SMTP_USER      = ${process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 4)}***` : '⚠ NOT SET'}`);
  logger.info(`  SMTP_PASS      = ${process.env.SMTP_PASS ? '***set***' : '⚠ NOT SET'}`);
  logger.info(`  RAG_SERVICE_URL = ${process.env.RAG_SERVICE_URL || '(default: http://localhost:8000)'}`);
  logger.info(`  FRONTEND_URL   = ${process.env.FRONTEND_URL || '(default: http://localhost:3000)'}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;
