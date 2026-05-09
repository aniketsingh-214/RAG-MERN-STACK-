const Document = require('../models/Document');
const ragService = require('../services/ragService');
const logger = require('../config/logger');
const fs = require('fs');

exports.uploadDocument = async (req, res, next) => {
  logger.info(`[UploadController] POST /upload → userId=${req.user?.userId}, file=${req.file?.originalname || '(none)'}, size=${req.file?.size || 0}bytes`);
  try {
    if (!req.file) {
      logger.warn('[UploadController] Upload attempted with no file');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, path } = req.file;
    const userId = req.user.userId;

    // 1. Forward to RAG Service
    logger.info(`[UploadController] Forwarding to RAG service — file=${originalname}`);
    const fileStream = fs.createReadStream(path);
    const ragResponse = await ragService.upload(fileStream, originalname, userId);
    logger.info(`[UploadController] RAG service responded — ragId=${ragResponse.id || 'none'}`);

    // 2. Save metadata in MongoDB
    logger.info(`[UploadController] Saving document metadata to DB`);
    const document = await Document.create({
      userId,
      fileName: originalname,
      ragId: ragResponse.id || null,
      createdAt: new Date()
    });
    logger.info(`[UploadController] Document saved — docId=${document._id}`);

    // 3. Cleanup local temp file
    fs.unlink(path, (err) => {
      if (err) logger.error(`[UploadController] Failed to delete temp file ${path}: ${err.message}`);
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
    logger.error(`[UploadController] Upload failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

exports.getUserDocuments = async (req, res, next) => {
  logger.info(`[UploadController] GET /upload → userId=${req.user?.userId}`);
  try {
    const documents = await Document.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .select('-__v');
    
    logger.info(`[UploadController] Returning ${documents.length} documents`);
    res.status(200).json({
      success: true,
      documents
    });
  } catch (error) {
    logger.error(`[UploadController] getUserDocuments failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  logger.info(`[UploadController] DELETE /upload/${req.params.id} → userId=${req.user?.userId}`);
  try {
    const document = await Document.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!document) {
      logger.warn(`[UploadController] Document not found for deletion — docId=${req.params.id}`);
      return res.status(404).json({ error: 'Document not found' });
    }

    logger.info(`[UploadController] Document deleted — docId=${req.params.id}`);
    // Optional: Call RAG service to delete from vector store if implemented
    
    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    logger.error(`[UploadController] deleteDocument failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};
