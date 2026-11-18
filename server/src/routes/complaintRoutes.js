const router = require('express').Router();
const ctrl = require('../controllers/complaintController');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const v = require('../validators');

router.use(protect);

router.get('/', restrictTo('student'), validate(v.studentComplaintQuery, 'query'), ctrl.listMine);
router.post('/', restrictTo('student'), validate(v.createComplaint), ctrl.create);
router.get('/stats/summary', restrictTo('student'), ctrl.myStats); // must stay above '/:id'
router.get('/:id', validate(v.idParam, 'params'), ctrl.getOne);

module.exports = router;
