const router = require('express').Router();
const { getAdminAnalytics, getStudentAnalytics, getTeacherAnalytics } = require('../controllers/analyticsController');
const { verifyJWT, roleMiddleware } = require('../middleware/auth');

// All analytics routes require authentication
router.use(verifyJWT);

// GET /api/analytics/admin (admin only)
router.get('/admin', roleMiddleware('admin'), getAdminAnalytics);

// GET /api/analytics/teacher (teacher only)
router.get('/teacher', roleMiddleware('teacher', 'admin'), getTeacherAnalytics);

// GET /api/analytics/student/:id (admin, teacher, or the student themselves)
router.get('/student/:id', (req, res, next) => {
  // Allow students to view their own analytics
  if (req.user.role === 'student' && req.user._id.toString() !== req.params.id) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  next();
}, getStudentAnalytics);

module.exports = router;
