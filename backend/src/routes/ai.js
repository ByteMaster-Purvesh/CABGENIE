const express = require('express');
const { body } = require('express-validator');
const { getAIRecommendations, getAIInsights } = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation for AI recommendations
const aiRecommendationValidation = [
  body('pickupLat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Pickup latitude must be between -90 and 90'),
  body('pickupLng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Pickup longitude must be between -180 and 180'),
  body('destinationLat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Destination latitude must be between -90 and 90'),
  body('destinationLng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Destination longitude must be between -180 and 180'),
  body('vehicleType')
    .optional()
    .isIn(['any', 'bike', 'auto', 'hatchback', 'sedan', 'suv', 'luxury', 'shared'])
    .withMessage('Invalid vehicle type'),
  body('maxFare')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum fare must be a positive number'),
  body('passengerCount')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Passenger count must be between 1 and 10'),
  body('weather')
    .optional()
    .isIn(['clear', 'rainy', 'foggy', 'stormy'])
    .withMessage('Invalid weather condition')
];

// Routes
router.post('/recommendations', authenticate, aiRecommendationValidation, getAIRecommendations);
router.get('/insights', authenticate, getAIInsights);

module.exports = router;