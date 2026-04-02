const { validationResult } = require('express-validator');
const User = require('../models/User');
const Driver = require('../models/Driver');
const { generateToken } = require('../middleware/auth');

// Register a new user
const register = async (req, res) => {
  try {
    console.log('Registration request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone,
      address,
      dateOfBirth,
      gender
    } = req.body;
    
    console.log('Extracted data:', { email, firstName, lastName, phone, address, dateOfBirth, gender });

    // Force passenger role - only passenger registration allowed
    const role = 'passenger';

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check phone uniqueness
    const existingPhone = await User.findOne({ 'profile.phone': phone });
    if (existingPhone) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    // Create passenger user - only passenger registration allowed
    const user = new User({
      email,
      password,
      role: 'passenger',
      profile: {
        firstName,
        lastName,
        phone,
        address,
        dateOfBirth,
        gender
      }
    });

    console.log('Creating user with profile:', user.profile);

    await user.save();
    console.log('User saved successfully');

    // Generate token
    const token = generateToken(user._id, user.role);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find user
    let user = await User.findOne({ email });
    let isDriver = false;

    if (!user) {
      // Check if it's a driver
      user = await Driver.findOne({ email });
      isDriver = true;
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id, user.role);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    let user;
    
    if (req.userRole === 'driver') {
      user = await Driver.findById(req.userId).select('-password');
    } else {
      user = await User.findById(req.userId).select('-password');
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const updates = req.body;
    let user;

    if (req.userRole === 'driver') {
      user = await Driver.findById(req.userId);
    } else {
      user = await User.findById(req.userId);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update profile fields
    Object.keys(updates).forEach(key => {
      if (key !== 'password' && key !== 'email' && key !== 'role') {
        user[key] = updates[key];
      }
    });

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: 'Profile updated successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;

    let user;
    if (req.userRole === 'driver') {
      user = await Driver.findById(req.userId);
    } else {
      user = await User.findById(req.userId);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error during password change' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
};