const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/authController');
const { authenticate, authRateLimit } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .matches(/^[\d\s\-\+\(\)]+$/)
    .isLength({ min: 10, max: 15 })
    .withMessage('Please provide a valid phone number'),
  body('address')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Please provide a valid date of birth'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other')
];

const driverValidation = [
  body('licenseNumber')
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('License number must be between 5 and 20 characters'),
  body('licenseExpiry')
    .isISO8601()
    .toDate()
    .withMessage('Please provide a valid license expiry date'),
  body('vehicleRegistration')
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('Vehicle registration must be between 5 and 20 characters'),
  body('vehicleModel')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Vehicle model must be between 2 and 50 characters'),
  body('vehicleType')
    .isIn(['sedan', 'suv', 'hatchback', 'luxury', 'auto', 'bike'])
    .withMessage('Invalid vehicle type'),
  body('vehicleColor')
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Vehicle color must be between 2 and 30 characters'),
  body('seatingCapacity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Seating capacity must be between 1 and 10')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .isLength({ min: 10, max: 15 })
    .withMessage('Please provide a valid phone number'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Please provide a valid date of birth')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('New password must be different from current password')
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfileValidation, updateProfile);
router.put('/change-password', authenticate, changePasswordValidation, changePassword);

module.exports = router;