const axios = require('axios');
const cacheService = require('./cacheService');
const logger = require('../config/logger');

const RAG_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000';
const MAX_RETRIES = parseInt(process.env.RAG_MAX_RETRIES) || 3;
const TIMEOUT = parseInt(process.env.RAG_TIMEOUT_MS) || 45000;
const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS) || 3600;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

class RAGProxyService {
  async query(queryText, userId, sessionId) {
    const cached = await cacheService.get(queryText);
    if (cached) return { ...cached, fromCache: true };

    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`RAG attempt ${attempt}/${MAX_RETRIES}`);
        const response = await axios.post(`${RAG_URL}/query`,
          { query: queryText, user_id: userId, session_id: sessionId },
          { timeout: TIMEOUT }
        );
        const result = { answer: response.data.answer, sources: response.data.sources || [], model: response.data.model, fromCache: false };
        await cacheService.set(queryText, result, CACHE_TTL);
        return result;
      } catch (err) {
        lastError = err;
        logger.warn(`RAG attempt ${attempt} failed: ${err.message}`);
        if (err.response && err.response.status >= 400 && err.response.status < 500)
          throw new Error(err.response.data?.detail || 'Bad request to RAG service');
        if (attempt < MAX_RETRIES) await sleep(Math.min(1000 * Math.pow(2, attempt - 1), 8000));
      }
    }
    throw lastError;
  }

  async healthCheck() {
    try {
      const res = await axios.get(`${RAG_URL}/health`, { timeout: 5000 });
      return { healthy: true, ...res.data };
    } catch { return { healthy: false }; }
  }
}

module.exports = new RAGProxyService();
