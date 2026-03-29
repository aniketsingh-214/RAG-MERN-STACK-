const ragProxyService = require('../services/ragProxyService');
const logger = require('../config/logger');

exports.handleQuery = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { query, userId, sessionId } = req.body;
    if (!query) return res.status(400).json({ error: 'query is required' });
    const result = await ragProxyService.query(query, userId, sessionId);
    logger.info(`Query resolved in ${Date.now() - startTime}ms (cached: ${result.fromCache})`);
    res.status(200).json({ success: true, ...result, processingTime: Date.now() - startTime });
  } catch (err) { next(err); }
};

exports.healthCheck = async (req, res) => {
  const ragHealth = await ragProxyService.healthCheck();
  res.status(ragHealth.healthy ? 200 : 503).json({ service: 'rag-connector', ragService: ragHealth });
};
