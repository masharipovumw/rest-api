const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { error } = require('../utils/response');

const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Access denied. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return error(res, 'User not found.', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token expired.', 401);
    }
    return error(res, 'Invalid token.', 401);
  }
};

const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required.', 401);
    }

    if (!roles.includes(req.user.role)) {
      return error(res, `Access denied. Required role: ${roles.join(' or ')}`, 403);
    }

    next();
  };
};

module.exports = { verifyJWT, roleMiddleware };
