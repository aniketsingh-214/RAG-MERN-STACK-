const Joi = require('joi');
const chatService = require('../services/chatService');

exports.sendQuery = async (req, res, next) => {
  try {
    const { error, value } = Joi.object({
      query: Joi.string().min(1).max(5000).required(),
      sessionId: Joi.string()
    }).validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const result = await chatService.sendQuery(req.user.userId, value.query, value.sessionId);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

exports.getChatHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const result = await chatService.getChatHistory(req.user.userId, page, limit);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

exports.deleteChat = async (req, res, next) => {
  try {
    await chatService.deleteChat(req.params.chatId, req.user.userId);
    res.status(200).json({ success: true, message: 'Chat deleted' });
  } catch (err) { next(err); }
};
