const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const v = require('../validators');

router.use(protect, restrictTo('admin'));

router.get('/complaints', validate(v.adminComplaintQuery, 'query'), ctrl.listAll);
router.patch('/complaints/:id', validate(v.objectIdParam, 'params'), validate(v.updateComplaint), ctrl.updateComplaint);
router.get('/staff', ctrl.listStaff);
router.get('/analytics', ctrl.analytics);
router.get('/recent', ctrl.recent);

module.exports = router;
