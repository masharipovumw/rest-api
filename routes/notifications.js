const router = require('express').Router();
const {
  getNotifications,
  createNotification,
  markAsRead,
} = require('../controllers/notificationController');
const { verifyJWT } = require('../middleware/auth');

// All notification routes require authentication
router.use(verifyJWT);

// GET /api/notifications/:studentId — get all notifications for a student
router.get('/:studentId', getNotifications);

// POST /api/notifications — create a new notification
router.post('/', createNotification);

// PATCH /api/notifications/:id/read — mark notification as read
router.patch('/:id/read', markAsRead);

module.exports = router;
