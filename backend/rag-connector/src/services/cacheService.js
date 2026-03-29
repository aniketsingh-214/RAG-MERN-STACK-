const Redis = require('ioredis');
const crypto = require('crypto');
const logger = require('../config/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.enabled = false;
    this._connect();
  }

  _connect() {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        lazyConnect: true,
        enableOfflineQueue: false,
        retryStrategy: (times) => times > 3 ? null : Math.min(times * 500, 2000)
      });
      this.client.on('connect', () => { this.enabled = true; logger.info('Redis connected'); });
      this.client.on('error', (err) => { logger.warn(`Redis error: ${err.message}`); this.enabled = false; });
      this.client.connect().catch(() => {});
    } catch (err) {
      logger.warn(`Redis init failed: ${err.message}`);
    }
  }

  _key(query) {
    return `rag:query:${crypto.createHash('sha256').update(query.toLowerCase().trim()).digest('hex')}`;
  }

  async get(query) {
    if (!this.enabled) return null;
    try {
      const cached = await this.client.get(this._key(query));
      if (cached) { logger.info('Cache HIT'); return JSON.parse(cached); }
    } catch (err) { logger.warn(`Cache get error: ${err.message}`); }
    return null;
  }

  async set(query, value, ttl = 3600) {
    if (!this.enabled) return;
    try { await this.client.setex(this._key(query), ttl, JSON.stringify(value)); }
    catch (err) { logger.warn(`Cache set error: ${err.message}`); }
  }

  async invalidate() {
    if (!this.enabled) return;
    try {
      const keys = await this.client.keys('rag:query:*');
      if (keys.length > 0) await this.client.del(...keys);
    } catch (err) { logger.warn(`Cache invalidate error: ${err.message}`); }
  }
}

module.exports = new CacheService();
