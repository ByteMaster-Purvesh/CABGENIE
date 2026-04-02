const { validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Driver = require('../models/Driver');
const User = require('../models/User');

// Create a new booking
const createBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const {
      pickupLocation,
      destination,
      estimatedDistance,
      estimatedDuration,
      provider,
      vehicleType,
      fare,
      paymentMethod
    } = req.body;

    // Validate pickup and destination coordinates
    if (!pickupLocation.coordinates || !destination.coordinates) {
      return res.status(400).json({ message: 'Pickup and destination coordinates are required' });
    }

    // Get user details
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has sufficient balance if using wallet
    if (paymentMethod === 'wallet' && user.wallet.balance < fare.totalFare) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    // Create booking
    const booking = new Booking({
      passenger: {
        userId: req.userId,
        name: `${user.profile.firstName} ${user.profile.lastName}`,
        phone: user.profile.phone,
        email: user.email
      },
      rideDetails: {
        pickupLocation,
        destination,
        estimatedDistance,
        estimatedDuration
      },
      fare: {
        ...fare,
        paymentMethod,
        paymentStatus: 'pending'
      },
      provider: {
        name: provider.name,
        providerId: provider.providerId,
        vehicleType: vehicleType
      },
      safety: {
        isNightRide: new Date().getHours() >= 20 || new Date().getHours() <= 6,
        shareRideEnabled: user.safety.shareRideEnabled,
        panicButtonEnabled: user.safety.panicButtonEnabled
      }
    });

    await booking.save();

    // Deduct from wallet if payment method is wallet
    if (paymentMethod === 'wallet') {
      user.wallet.balance -= fare.totalFare;
      await user.save();
    }

    res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        bookingId: booking.bookingId,
        status: booking.status,
        pickupLocation: booking.rideDetails.pickupLocation,
        destination: booking.rideDetails.destination,
        estimatedFare: booking.fare.totalFare,
        provider: booking.provider.name,
        estimatedArrival: booking.provider.estimatedArrival
      }
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Error creating booking' });
  }
};

// Get user's bookings
const getUserBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { 'passenger.userId': req.userId };
    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .sort({ bookingTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-tracking'); // Exclude tracking data for privacy

    const total = await Booking.countDocuments(query);

    res.json({
      bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};

// Get booking details
const getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await Booking.findOne({ 
      bookingId,
      'passenger.userId': req.userId 
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ booking });

  } catch (error) {
    console.error('Get booking details error:', error);
    res.status(500).json({ message: 'Error fetching booking details' });
  }
};

// Cancel booking
const cancelBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findOne({ 
      bookingId,
      'passenger.userId': req.userId 
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if booking can be cancelled
    if (booking.status === 'ride_completed') {
      return res.status(400).json({ message: 'Cannot cancel completed ride' });
    }

    if (booking.status === 'ride_started') {
      return res.status(400).json({ message: 'Cannot cancel ride in progress' });
    }

    // Update booking status
    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy: 'passenger',
      reason,
      cancellationTime: new Date()
    };

    // Calculate cancellation fee (if applicable)
    const timeSinceBooking = Date.now() - new Date(booking.bookingTime).getTime();
    const minutesSinceBooking = timeSinceBooking / (1000 * 60);
    
    if (minutesSinceBooking > 5) {
      booking.cancellation.cancellationFee = Math.round(booking.fare.totalFare * 0.1); // 10% fee
      booking.cancellation.refundAmount = booking.fare.totalFare - booking.cancellation.cancellationFee;
    } else {
      booking.cancellation.refundAmount = booking.fare.totalFare;
    }

    await booking.save();

    // Refund to wallet if payment was made via wallet
    if (booking.fare.paymentMethod === 'wallet' && booking.cancellation.refundAmount > 0) {
      const user = await User.findById(req.userId);
      user.wallet.balance += booking.cancellation.refundAmount;
      await user.save();
    }

    res.json({
      message: 'Booking cancelled successfully',
      booking: {
        bookingId: booking.bookingId,
        status: booking.status,
        cancellationFee: booking.cancellation.cancellationFee,
        refundAmount: booking.cancellation.refundAmount
      }
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Error cancelling booking' });
  }
};

// Track booking (get real-time updates)
const trackBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await Booking.findOne({ 
      bookingId,
      'passenger.userId': req.userId 
    }).select('status timing driver tracking');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Get driver location if driver is assigned
    let driverLocation = null;
    if (booking.driver.userId) {
      const driver = await Driver.findById(booking.driver.userId)
        .select('availability.currentLocation');
      if (driver) {
        driverLocation = driver.availability.currentLocation;
      }
    }

    res.json({
      booking: {
        bookingId: booking.bookingId,
        status: booking.status,
        timing: booking.timing,
        driver: booking.driver,
        tracking: booking.tracking,
        driverLocation
      }
    });

  } catch (error) {
    console.error('Track booking error:', error);
    res.status(500).json({ message: 'Error tracking booking' });
  }
};

// Rate completed ride
const rateRide = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { bookingId } = req.params;
    const { rating, comment, issues } = req.body;

    const booking = await Booking.findOne({ 
      bookingId,
      'passenger.userId': req.userId,
      status: 'ride_completed'
    });

    if (!booking) {
      return res.status(404).json({ message: 'Completed booking not found' });
    }

    if (booking.feedback.passengerRating) {
      return res.status(400).json({ message: 'Ride already rated' });
    }

    // Update booking with feedback
    booking.feedback.passengerRating = rating;
    booking.feedback.passengerComment = comment;
    if (issues && issues.length > 0) {
      booking.feedback.issuesReported = issues;
    }

    await booking.save();

    // Update driver rating if applicable
    if (booking.driver.userId) {
      const driver = await Driver.findById(booking.driver.userId);
      if (driver) {
        // Update driver ratings
        const oldTotal = driver.ratings.averageRating * driver.ratings.totalRatings;
        driver.ratings.totalRatings += 1;
        driver.ratings.averageRating = (oldTotal + rating) / driver.ratings.totalRatings;
        
        // Update star distribution
        if (rating === 5) driver.ratings.fiveStar += 1;
        else if (rating === 4) driver.ratings.fourStar += 1;
        else if (rating === 3) driver.ratings.threeStar += 1;
        else if (rating === 2) driver.ratings.twoStar += 1;
        else if (rating === 1) driver.ratings.oneStar += 1;

        await driver.save();
      }
    }

    res.json({
      message: 'Ride rated successfully',
      rating: booking.feedback.passengerRating
    });

  } catch (error) {
    console.error('Rate ride error:', error);
    res.status(500).json({ message: 'Error rating ride' });
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  getBookingDetails,
  cancelBooking,
  trackBooking,
  rateRide
};