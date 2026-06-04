const router = require('express').Router();
const { register, login, getProfile, registerValidation, loginValidation } = require('../controllers/authController');
const { verifyJWT } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/register', registerValidation, validate, register);

router.post('/login', loginValidation, validate, login);

router.get('/profile', verifyJWT, getProfile);

module.exports = router;
