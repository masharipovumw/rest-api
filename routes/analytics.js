const router = require('express').Router();
const { getAdminAnalytics, getStudentAnalytics, getTeacherAnalytics } = require('../controllers/analyticsController');
const { verifyJWT, roleMiddleware } = require('../middleware/auth');

router.use(verifyJWT);

router.get('/admin', roleMiddleware('admin'), getAdminAnalytics);

router.get('/teacher', roleMiddleware('teacher', 'admin'), getTeacherAnalytics);

router.get('/student/:id', (req, res, next) => {

  if (req.user.role === 'student' && req.user._id.toString() !== req.params.id) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  next();
}, getStudentAnalytics);

module.exports = router;
