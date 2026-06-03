const router = require('express').Router();
const {
  getStudentDashboard,
  getStudentAnalyticsDetail,
} = require('../controllers/analyticsController');
const { verifyJWT } = require('../middleware/auth');

// All student routes require authentication
router.use(verifyJWT);

// Self-access guard: students can only view their own data
const selfAccessGuard = (req, res, next) => {
  if (req.user.role === 'student' && req.user._id.toString() !== req.params.studentId) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  next();
};

// GET /api/student/dashboard/:studentId
router.get('/dashboard/:studentId', selfAccessGuard, getStudentDashboard);

// GET /api/student/analytics/:studentId
router.get('/analytics/:studentId', selfAccessGuard, getStudentAnalyticsDetail);

module.exports = router;
