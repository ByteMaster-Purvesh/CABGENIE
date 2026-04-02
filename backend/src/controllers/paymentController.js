const { validationResult } = require('express-validator');
const User = require('../models/User');
const Booking = require('../models/Booking');

// Mock payment gateway functions
const mockPaymentGateway = {
  processPayment: async (amount, paymentMethod, paymentDetails) => {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate 95% success rate
    const success = Math.random() > 0.05;
    
    return {
      success,
      transactionId: success ? `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}` : null,
      message: success ? 'Payment processed successfully' : 'Payment failed',
      timestamp: new Date()
    };
  },

  refundPayment: async (transactionId, amount) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      refundId: `REF${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
      amount,
      transactionId,
      timestamp: new Date()
    };
  }
};

// Process payment for a booking
const processBookingPayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { bookingId, paymentMethod, paymentDetails } = req.body;

    // Get booking
    const booking = await Booking.findOne({ 
      bookingId,
      'passenger.userId': req.userId 
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.fare.paymentStatus === 'completed') {
      return res.status(400).json({ message: 'Payment already completed for this booking' });
    }

    // Get user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Handle wallet payment
    if (paymentMethod === 'wallet') {
      if (user.wallet.balance < booking.fare.totalFare) {
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }

      // Deduct from wallet
      user.wallet.balance -= booking.fare.totalFare;
      user.wallet.transactions.push({
        type: 'debit',
        amount: booking.fare.totalFare,
        description: `Ride payment for booking ${bookingId}`,
        bookingId: booking._id
      });
      await user.save();

      // Update booking payment status
      booking.fare.paymentStatus = 'completed';
      booking.fare.paymentMethod = 'wallet';
      booking.fare.transactionId = `WALLET_${Date.now()}`;
      await booking.save();

      return res.json({
        message: 'Payment processed successfully',
        payment: {
          bookingId: booking.bookingId,
          amount: booking.fare.totalFare,
          method: 'wallet',
          status: 'completed',
          transactionId: booking.fare.transactionId,
          walletBalance: user.wallet.balance
        }
      });
    }

    // Process payment through mock gateway for other methods
    const paymentResult = await mockPaymentGateway.processPayment(
      booking.fare.totalFare,
      paymentMethod,
      paymentDetails
    );

    if (paymentResult.success) {
      // Update booking payment status
      booking.fare.paymentStatus = 'completed';
      booking.fare.paymentMethod = paymentMethod;
      booking.fare.transactionId = paymentResult.transactionId;
      await booking.save();

      res.json({
        message: 'Payment processed successfully',
        payment: {
          bookingId: booking.bookingId,
          amount: booking.fare.totalFare,
          method: paymentMethod,
          status: 'completed',
          transactionId: paymentResult.transactionId,
          timestamp: paymentResult.timestamp
        }
      });
    } else {
      res.status(400).json({
        message: 'Payment failed',
        payment: {
          bookingId: booking.bookingId,
          amount: booking.fare.totalFare,
          method: paymentMethod,
          status: 'failed',
          error: paymentResult.message
        }
      });
    }

  } catch (error) {
    console.error('Process booking payment error:', error);
    res.status(500).json({ message: 'Error processing payment' });
  }
};

// Add money to wallet
const addWalletMoney = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { amount, paymentMethod, paymentDetails } = req.body;

    // Get user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Process payment through mock gateway
    const paymentResult = await mockPaymentGateway.processPayment(
      amount,
      paymentMethod,
      paymentDetails
    );

    if (paymentResult.success) {
      // Add to wallet
      user.wallet.balance += amount;
      user.wallet.transactions.push({
        type: 'credit',
        amount: amount,
        description: `Wallet recharge via ${paymentMethod}`,
        transactionId: paymentResult.transactionId
      });
      await user.save();

      res.json({
        message: 'Wallet recharged successfully',
        wallet: {
          balance: user.wallet.balance,
          transactionId: paymentResult.transactionId,
          amountAdded: amount,
          timestamp: paymentResult.timestamp
        }
      });
    } else {
      res.status(400).json({
        message: 'Payment failed',
        error: paymentResult.message
      });
    }

  } catch (error) {
    console.error('Add wallet money error:', error);
    res.status(500).json({ message: 'Error adding money to wallet' });
  }
};

// Get wallet balance and transactions
const getWalletDetails = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('wallet');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      wallet: {
        balance: user.wallet.balance,
        transactions: user.wallet.transactions.slice(-10) // Last 10 transactions
      }
    });

  } catch (error) {
    console.error('Get wallet details error:', error);
    res.status(500).json({ message: 'Error fetching wallet details' });
  }
};

// Process refund
const processRefund = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { bookingId, reason } = req.body;

    // Get booking
    const booking = await Booking.findOne({ 
      bookingId,
      'passenger.userId': req.userId 
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.fare.paymentStatus !== 'completed') {
      return res.status(400).json({ message: 'No payment to refund' });
    }

    // Check if refund is already processed
    if (booking.fare.refundStatus === 'completed') {
      return res.status(400).json({ message: 'Refund already processed' });
    }

    // Calculate refund amount (simplified - in real system, this would be more complex)
    let refundAmount = booking.fare.totalFare;
    if (booking.cancellation && booking.cancellation.cancellationFee) {
      refundAmount = booking.cancellation.refundAmount;
    }

    // Process refund through mock gateway
    const refundResult = await mockPaymentGateway.refundPayment(
      booking.fare.transactionId,
      refundAmount
    );

    if (refundResult.success) {
      // Update booking refund status
      booking.fare.refundStatus = 'completed';
      booking.fare.refundAmount = refundAmount;
      booking.fare.refundTransactionId = refundResult.refundId;
      await booking.save();

      // Add refund to wallet if original payment was via wallet
      if (booking.fare.paymentMethod === 'wallet') {
        const user = await User.findById(req.userId);
        user.wallet.balance += refundAmount;
        user.wallet.transactions.push({
          type: 'credit',
          amount: refundAmount,
          description: `Refund for booking ${bookingId}`,
          transactionId: refundResult.refundId
        });
        await user.save();
      }

      res.json({
        message: 'Refund processed successfully',
        refund: {
          bookingId: booking.bookingId,
          refundAmount: refundAmount,
          refundTransactionId: refundResult.refundId,
          reason: reason,
          timestamp: refundResult.timestamp
        }
      });
    } else {
      res.status(400).json({
        message: 'Refund failed',
        error: refundResult.message
      });
    }

  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ message: 'Error processing refund' });
  }
};

module.exports = {
  processBookingPayment,
  addWalletMoney,
  getWalletDetails,
  processRefund
};