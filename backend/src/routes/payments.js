const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  processBookingPayment,
  addWalletMoney,
  getWalletDetails,
  processRefund
} = require('../controllers/paymentController');

const router = express.Router();

// Process payment for booking
router.post('/process-booking-payment',
  authenticate,
  [
    body('bookingId').notEmpty().withMessage('Booking ID is required'),
    body('paymentMethod').isIn(['wallet', 'upi', 'card', 'cash']).withMessage('Invalid payment method'),
    body('paymentDetails').optional().isObject().withMessage('Payment details must be an object')
  ],
  processBookingPayment
);

// Add money to wallet
router.post('/add-wallet-money',
  authenticate,
  [
    body('amount').isFloat({ min: 10, max: 10000 }).withMessage('Amount must be between 10-10000'),
    body('paymentMethod').isIn(['upi', 'card']).withMessage('Invalid payment method for wallet recharge'),
    body('paymentDetails').optional().isObject().withMessage('Payment details must be an object')
  ],
  addWalletMoney
);

// Get wallet details
router.get('/wallet-details',
  authenticate,
  getWalletDetails
);

// Process refund
router.post('/refund',
  authenticate,
  [
    body('bookingId').notEmpty().withMessage('Booking ID is required'),
    body('reason').optional().isString().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
  ],
  processRefund
);

module.exports = router;