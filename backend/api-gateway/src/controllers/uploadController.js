const Document = require('../models/Document');
const ragService = require('../services/ragService');
const logger = require('../config/logger');
const fs = require('fs');

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, path } = req.file;
    const userId = req.user.userId;

    logger.info(`User ${userId} uploading document: ${originalname}`);

    // 1. Forward to RAG Service
    const fileStream = fs.createReadStream(path);
    const ragResponse = await ragService.upload(fileStream, originalname, userId);

    // 2. Save metadata in MongoDB
    const document = await Document.create({
      userId,
      fileName: originalname,
      ragId: ragResponse.id || null, // Assuming RAG service might return an ID
      createdAt: new Date()
    });

    // 3. Cleanup local temp file
    fs.unlink(path, (err) => {
      if (err) logger.error(`Failed to delete temp file ${path}: ${err.message}`);
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded and processed successfully',
      document: {
        id: document._id,
        fileName: document.fileName,
        createdAt: document.createdAt
      }
    });
  } catch (error) {
    // Cleanup on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    logger.error(`Upload controller failed: ${error.message}`);
    next(error);
  }
};

exports.getUserDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .select('-__v');
    
    res.status(200).json({
      success: true,
      documents
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Optional: Call RAG service to delete from vector store if implemented
    
    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
