const Joi = require('joi');
const chatService = require('../services/chatService');
const logger = require('../config/logger');

exports.sendQuery = async (req, res, next) => {
  logger.info(`[ChatController] POST /chat/send-query → userId=${req.user?.userId}, queryLength=${req.body.query?.length || 0}`);
  try {
    const { error, value } = Joi.object({
      query: Joi.string().min(1).max(5000).required(),
      sessionId: Joi.string()
    }).validate(req.body);
    if (error) {
      logger.warn(`[ChatController] sendQuery validation failed: ${error.details[0].message}`);
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await chatService.sendQuery(req.user.userId, value.query, value.sessionId);
    logger.info(`[ChatController] Query answered — chatId=${result.chatId}, processingTime=${result.processingTime}ms`);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    logger.error(`[ChatController] sendQuery failed: ${err.message}`, { stack: err.stack });
    next(err);
  }
};

exports.getChatHistory = async (req, res, next) => {
  logger.info(`[ChatController] GET /chat/history → userId=${req.user?.userId}, page=${req.query.page}, limit=${req.query.limit}`);
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const result = await chatService.getChatHistory(req.user.userId, page, limit);
    logger.info(`[ChatController] History returned — count=${result.chats.length}, total=${result.pagination.total}`);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    logger.error(`[ChatController] getChatHistory failed: ${err.message}`, { stack: err.stack });
    next(err);
  }
};

exports.deleteChat = async (req, res, next) => {
  logger.info(`[ChatController] DELETE /chat/${req.params.chatId} → userId=${req.user?.userId}`);
  try {
    await chatService.deleteChat(req.params.chatId, req.user.userId);
    logger.info(`[ChatController] Chat deleted — chatId=${req.params.chatId}`);
    res.status(200).json({ success: true, message: 'Chat deleted' });
  } catch (err) {
    logger.error(`[ChatController] deleteChat failed: ${err.message}`, { stack: err.stack });
    next(err);
  }
};
