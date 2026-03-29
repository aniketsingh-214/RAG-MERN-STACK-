const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  query: { type: String, required: true, trim: true, maxlength: 5000 },
  response: { type: String, required: true },
  sources: [{ content: String, source: String, page: Number, score: Number }],
  metadata: { processingTime: Number, fromCache: { type: Boolean, default: false }, model: String },
  sessionId: { type: String }
}, { timestamps: true });

chatSchema.index({ userId: 1, createdAt: -1 });
module.exports = mongoose.model('Chat', chatSchema);
