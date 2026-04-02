const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  createBooking,
  getUserBookings,
  getBookingDetails,
  cancelBooking,
  trackBooking,
  rateRide
} = require('../controllers/bookingController');

const router = express.Router();

// Validation helpers
const coordinateValidation = [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
];

const fareValidation = [
  body('fare.baseFare').isFloat({ min: 0 }).withMessage('Base fare must be positive'),
  body('fare.distanceFare').isFloat({ min: 0 }).withMessage('Distance fare must be positive'),
  body('fare.timeFare').isFloat({ min: 0 }).withMessage('Time fare must be positive'),
  body('fare.totalFare').isFloat({ min: 0 }).withMessage('Total fare must be positive')
];

// Create new booking
router.post('/create',
  authenticate,
  [
    body('pickupLocation.address').notEmpty().withMessage('Pickup address is required'),
    body('pickupLocation.coordinates').isObject().withMessage('Pickup coordinates are required'),
    body('pickupLocation.coordinates.lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid pickup latitude'),
    body('pickupLocation.coordinates.lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid pickup longitude'),
    
    body('destination.address').notEmpty().withMessage('Destination address is required'),
    body('destination.coordinates').isObject().withMessage('Destination coordinates are required'),
    body('destination.coordinates.lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid destination latitude'),
    body('destination.coordinates.lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid destination longitude'),
    
    body('estimatedDistance').isFloat({ min: 0 }).withMessage('Estimated distance must be positive'),
    body('estimatedDuration').isInt({ min: 0 }).withMessage('Estimated duration must be positive'),
    
    body('provider.name').isIn(['Uber', 'Ola', 'Rapido', 'BlaBlaCar', 'CABGENIE']).withMessage('Invalid provider'),
    body('provider.providerId').notEmpty().withMessage('Provider ID is required'),
    body('provider.vehicleType').notEmpty().withMessage('Vehicle type is required'),
    
    body('vehicleType').isIn(['auto', 'mini', 'sedan', 'suv', 'bike', 'shared']).withMessage('Invalid vehicle type'),
    
    ...fareValidation,
    
    body('paymentMethod').isIn(['wallet', 'upi', 'card', 'cash']).withMessage('Invalid payment method'),
    
    body('aiRecommended').optional().isBoolean().withMessage('AI recommended must be boolean'),
    body('aiScore').optional().isFloat({ min: 0, max: 100 }).withMessage('AI score must be between 0-100'),
    body('aiReasons').optional().isArray().withMessage('AI reasons must be an array')
  ],
  createBooking
);

// Get user's bookings
router.get('/my-bookings',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
    query('status').optional().isIn(['pending', 'confirmed', 'driver_assigned', 'ride_started', 'ride_completed', 'cancelled']).withMessage('Invalid status')
  ],
  getUserBookings
);

// Get booking details
router.get('/details/:bookingId',
  authenticate,
  [
    param('bookingId').notEmpty().withMessage('Booking ID is required')
  ],
  getBookingDetails
);

// Track booking (real-time updates)
router.get('/track/:bookingId',
  authenticate,
  [
    param('bookingId').notEmpty().withMessage('Booking ID is required')
  ],
  trackBooking
);

// Cancel booking
router.post('/cancel/:bookingId',
  authenticate,
  [
    param('bookingId').notEmpty().withMessage('Booking ID is required'),
    body('reason').optional().isString().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
  ],
  cancelBooking
);

// Rate completed ride
router.post('/rate/:bookingId',
  authenticate,
  [
    param('bookingId').notEmpty().withMessage('Booking ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1-5'),
    body('comment').optional().isString().isLength({ max: 1000 }).withMessage('Comment must be less than 1000 characters'),
    body('issues').optional().isArray().withMessage('Issues must be an array'),
    body('issues.*').isIn(['driver_behavior', 'vehicle_condition', 'route_issues', 'safety_concerns', 'payment_issues']).withMessage('Invalid issue type')
  ],
  rateRide
);

module.exports = router;