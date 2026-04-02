const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    return null;
  }
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    // Find user based on role
    let user;
    if (decoded.role === 'driver') {
      user = await Driver.findById(decoded.userId).select('-password');
    } else {
      user = await User.findById(decoded.userId).select('-password');
    }

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated.' });
    }

    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};

// Role-based authorization middleware
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        required: roles,
        current: req.userRole
      });
    }

    next();
  };
};

const passengerOnly = authorize(['passenger']);

// Rate limiting for auth endpoints
const authRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  }
});

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  passengerOnly,
  authRateLimit
};