const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const Driver = require('../models/Driver');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
}, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get user by ID (admin only)
router.get('/:id', authenticate, (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
}, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Update user status (admin only)
router.patch('/:id/status', authenticate, (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
}, async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Error updating user status' });
  }
});

// Get user statistics (admin only)
router.get('/stats/overview', authenticate, (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
}, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalDrivers = await Driver.countDocuments();
    const activeDrivers = await Driver.countDocuments({ isActive: true, 'availability.isAvailable': true });

    const recentUsers = await User.find()
      .select('profile.firstName profile.lastName email role createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalUsers,
      activeUsers,
      totalDrivers,
      activeDrivers,
      recentUsers
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Error fetching user statistics' });
  }
});

module.exports = router;