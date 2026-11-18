const ChatMessage = require('../models/ChatMessage');
const { asyncHandler } = require('../utils/AppError');
const chatService = require('../services/chatService');
const gemini = require('../services/gemini');

exports.sendMessage = asyncHandler(async (req, res) => {
  const result = await chatService.processMessage(req.user, req.body.message);
  res.status(201).json({ success: true, ...result });
});

exports.getHistory = asyncHandler(async (req, res) => {
  const messages = await ChatMessage.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('complaint', 'ticketId title category priority status')
    .lean();
  res.json({ success: true, messages: messages.reverse(), aiEnabled: gemini.isConfigured() });
});

// Clears chat history only; filed complaints are never deleted.
exports.clearHistory = asyncHandler(async (req, res) => {
  const { deletedCount } = await ChatMessage.deleteMany({ user: req.user._id });
  res.json({ success: true, deletedCount });
});
