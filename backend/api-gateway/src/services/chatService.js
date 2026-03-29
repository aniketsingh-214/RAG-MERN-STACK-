const axios = require('axios');
const Chat = require('../models/Chat');
const logger = require('../config/logger');

const RAG_CONNECTOR_URL = process.env.RAG_CONNECTOR_URL || 'http://localhost:5002';

class ChatService {
  async sendQuery(userId, query, sessionId) {
    const startTime = Date.now();
    try {
      const ragResponse = await axios.post(
        `${RAG_CONNECTOR_URL}/api/query`,
        { query, userId, sessionId },
        { timeout: 60000, headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.INTERNAL_API_KEY } }
      );

      const { answer, sources, fromCache, model } = ragResponse.data;
      const processingTime = Date.now() - startTime;

      const chat = await Chat.create({
        userId, query, response: answer, sources: sources || [], sessionId,
        metadata: { processingTime, fromCache: fromCache || false, model }
      });

      return { chatId: chat._id, answer, sources, fromCache, processingTime };
    } catch (error) {
      logger.error(`RAG query failed: ${error.message}`);
      if (error.code === 'ECONNREFUSED') throw new Error('AI service is currently unavailable.');
      if (error.code === 'ETIMEDOUT') throw new Error('Query timed out. Please try a simpler query.');
      throw error;
    }
  }

  async getChatHistory(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [chats, total] = await Promise.all([
      Chat.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-__v').lean(),
      Chat.countDocuments({ userId })
    ]);
    return { chats, pagination: { total, page, limit, pages: Math.ceil(total / limit), hasMore: skip + chats.length < total } };
  }

  async deleteChat(chatId, userId) {
    const chat = await Chat.findOneAndDelete({ _id: chatId, userId });
    if (!chat) throw new Error('Chat not found or unauthorized');
    return true;
  }
}

module.exports = new ChatService();
