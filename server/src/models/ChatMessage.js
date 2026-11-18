const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['user', 'bot'], required: true },
    content: { type: String, required: true, maxlength: 4000 },
    // Set on the bot message that created a ticket
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
    provider: { type: String, enum: ['gemini', 'fallback', 'system'] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

chatMessageSchema.index({ user: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
