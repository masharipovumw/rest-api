const router = require('express').Router();
const { getUsers, updateUserRole, getAnalytics } = require('../controllers/adminController');
const { verifyJWT, roleMiddleware } = require('../middleware/auth');

router.use(verifyJWT, roleMiddleware('admin'));

router.get('/users', getUsers);

router.patch('/users/:id/role', updateUserRole);

router.get('/analytics', getAnalytics);

module.exports = router;
