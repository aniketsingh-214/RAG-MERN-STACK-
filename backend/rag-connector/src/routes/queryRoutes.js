const express = require('express');
const multer = require('multer');
const router = express.Router();
const queryController = require('../controllers/queryController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'));
  }
});

router.post('/query', queryController.handleQuery);
router.get('/health', queryController.healthCheck);

module.exports = router;
