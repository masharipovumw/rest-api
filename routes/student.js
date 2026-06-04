const router = require('express').Router();
const {
  getStudentDashboard,
  getStudentAnalyticsDetail,
} = require('../controllers/analyticsController');
const { verifyJWT } = require('../middleware/auth');

router.use(verifyJWT);

const selfAccessGuard = (req, res, next) => {
  if (req.user.role === 'student' && req.user._id.toString() !== req.params.studentId) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  next();
};

router.get('/dashboard/:studentId', selfAccessGuard, getStudentDashboard);

router.get('/analytics/:studentId', selfAccessGuard, getStudentAnalyticsDetail);

module.exports = router;
