const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const v = require('../validators');

router.use(protect);

router.get('/', ctrl.list);
router.patch('/read-all', ctrl.markAllRead); // must stay above '/:id/read'
router.patch('/:id/read', validate(v.objectIdParam, 'params'), ctrl.markRead);

module.exports = router;
