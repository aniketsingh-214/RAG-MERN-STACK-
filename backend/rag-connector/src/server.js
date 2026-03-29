require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const queryRoutes = require('./routes/queryRoutes');

const app = express();
const PORT = process.env.PORT || 5002;

app.use(helmet());
app.use(cors({ origin: process.env.API_GATEWAY_URL || 'http://localhost:5001', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

app.use((req, res, next) => {
  if (req.headers['x-api-key'] !== process.env.INTERNAL_API_KEY)
    return res.status(401).json({ error: 'Unauthorized: invalid internal API key' });
  next();
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'rag-connector' }));
app.use('/api', queryRoutes);
app.use(errorHandler);

app.listen(PORT, () => logger.info(`RAG Connector running on port ${PORT}`));
module.exports = app;
