const Notification = require('../models/Notification');
const User = require('../models/User');

async function notifyUser(userId, { title, message, type = 'info', complaint }) {
  return Notification.create({ user: userId, title, message, type, complaint });
}

async function notifyAdmins({ title, message, type = 'info', complaint }, excludeUserId) {
  const admins = await User.find({ role: 'admin' }).select('_id').lean();
  const docs = admins
    .filter((a) => !excludeUserId || String(a._id) !== String(excludeUserId))
    .map((a) => ({ user: a._id, title, message, type, complaint }));
  if (docs.length) await Notification.insertMany(docs);
}

module.exports = { notifyUser, notifyAdmins };
