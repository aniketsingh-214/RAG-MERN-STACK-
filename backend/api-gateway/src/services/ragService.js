const axios = require('axios');
const logger = require('../config/logger');

const RAG_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000';
const MAX_RETRIES = parseInt(process.env.RAG_MAX_RETRIES) || 3;
const TIMEOUT = parseInt(process.env.RAG_TIMEOUT_MS) || 60000;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

class RAGService {
  async query(queryText, userId, sessionId) {
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`RAG Query attempt ${attempt}/${MAX_RETRIES} for user ${userId}`);
        const response = await axios.post(`${RAG_URL}/query`,
          { query: queryText, user_id: userId, session_id: sessionId },
          { timeout: TIMEOUT }
        );
        return {
          answer: response.data.answer,
          sources: response.data.sources || [],
          model: response.data.model,
          fromCache: response.data.from_cache || false
        };
      } catch (err) {
        lastError = err;
        logger.warn(`RAG Query attempt ${attempt} failed: ${err.message}`);
        
        // Don't retry on 4xx errors
        if (err.response && err.response.status >= 400 && err.response.status < 500) {
          throw new Error(err.response.data?.detail || 'Invalid request to AI service');
        }

        if (attempt < MAX_RETRIES) {
          await sleep(Math.min(1000 * Math.pow(2, attempt - 1), 8000));
        }
      }
    }
    throw lastError;
  }

  async upload(fileStream, fileName, userId) {
    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', fileStream, fileName);
      form.append('user_id', userId);

      const response = await axios.post(`${RAG_URL}/upload`, form, {
        headers: { ...form.getHeaders() },
        timeout: TIMEOUT
      });
      return response.data;
    } catch (error) {
      logger.error(`RAG Upload failed: ${error.message}`);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const res = await axios.get(`${RAG_URL}/health`, { timeout: 5000 });
      return { healthy: true, ...res.data };
    } catch {
      return { healthy: false };
    }
  }
}

module.exports = new RAGService();
