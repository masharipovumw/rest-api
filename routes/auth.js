const router = require('express').Router();
const { register, login, getProfile, registerValidation, loginValidation } = require('../controllers/authController');
const { verifyJWT } = require('../middleware/auth');
const validate = require('../middleware/validate');

// POST /api/auth/register
router.post('/register', registerValidation, validate, register);

// POST /api/auth/login
router.post('/login', loginValidation, validate, login);

// GET /api/auth/profile (protected)
router.get('/profile', verifyJWT, getProfile);

module.exports = router;
