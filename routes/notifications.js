const router = require('express').Router();
const {
  getNotifications,
  createNotification,
  markAsRead,
} = require('../controllers/notificationController');
const { verifyJWT } = require('../middleware/auth');

router.use(verifyJWT);

router.get('/:studentId', getNotifications);

router.post('/', createNotification);

router.patch('/:id/read', markAsRead);

module.exports = router;
