const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);
router.post('/send-query', chatController.sendQuery);
router.get('/history', chatController.getChatHistory);
router.delete('/:chatId', chatController.deleteChat);

module.exports = router;
