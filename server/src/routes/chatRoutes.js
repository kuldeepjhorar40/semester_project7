const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/chatController');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const v = require('../validators');

// Protects the Gemini quota: 20 messages / minute / user
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user ? String(req.user._id) : req.ip),
  message: { success: false, message: 'You are sending messages too quickly. Please wait a moment.' },
});

router.use(protect, restrictTo('student'));
router.get('/history', ctrl.getHistory);
router.post('/message', chatLimiter, validate(v.chatMessage), ctrl.sendMessage);
router.delete('/history', ctrl.clearHistory);

module.exports = router;
