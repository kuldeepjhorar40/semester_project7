const Notification = require('../models/Notification');
const { AppError, asyncHandler } = require('../utils/AppError');

exports.list = asyncHandler(async (req, res) => {
  const [items, unreadCount] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ success: true, items, unreadCount });
});

exports.markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!n) throw new AppError('Notification not found', 404);
  res.json({ success: true, notification: n });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  const { modifiedCount } = await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true, modifiedCount });
});
