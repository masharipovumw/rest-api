const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const { success, error } = require('../utils/response');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return error(res, 'Email already registered.', 400);
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'student',
    });

    const token = generateToken(user);

    return success(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    }, 'Registration successful', 201);
  } catch (err) {
    console.error('Register error:', err);
    return error(res, 'Registration failed.');
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return error(res, 'Invalid email or password.', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return error(res, 'Invalid email or password.', 401);
    }

    const token = generateToken(user);

    return success(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      token,
    }, 'Login successful');
  } catch (err) {
    console.error('Login error:', err);
    return error(res, 'Login failed.');
  }
};

const getProfile = async (req, res) => {
  try {
    return success(res, {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      avatar: req.user.avatar,
      createdAt: req.user.createdAt,
    });
  } catch (err) {
    console.error('Profile error:', err);
    return error(res, 'Failed to get profile.');
  }
};

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = {
  register,
  login,
  getProfile,
  registerValidation,
  loginValidation,
};
