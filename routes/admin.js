const router = require('express').Router();
const { getUsers, updateUserRole, getAnalytics } = require('../controllers/adminController');
const { verifyJWT, roleMiddleware } = require('../middleware/auth');

// All admin routes require JWT + admin role
router.use(verifyJWT, roleMiddleware('admin'));

// GET /api/admin/users
router.get('/users', getUsers);

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', updateUserRole);

// GET /api/admin/analytics
router.get('/analytics', getAnalytics);

module.exports = router;
