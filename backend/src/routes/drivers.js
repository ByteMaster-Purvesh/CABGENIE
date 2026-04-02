const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const Driver = require('../models/Driver');
const User = require('../models/User');

const router = express.Router();

// Get all drivers (admin only)
const getAllDrivers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, verified } = req.query;
    
    const query = {};
    if (status) query['availability.status'] = status;
    if (verified !== undefined) query['verification.isVerified'] = verified === 'true';

    const drivers = await Driver.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Driver.countDocuments(query);

    res.json({
      drivers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get all drivers error:', error);
    res.status(500).json({ message: 'Error fetching drivers' });
  }
};

// Get driver details
const getDriverDetails = async (req, res) => {
  try {
    const { driverId } = req.params;
    
    const driver = await Driver.findById(driverId).select('-password');
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json({ driver });

  } catch (error) {
    console.error('Get driver details error:', error);
    res.status(500).json({ message: 'Error fetching driver details' });
  }
};

// Update driver verification status (admin only)
const updateDriverVerification = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { isVerified, verificationNotes } = req.body;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    driver.verification.isVerified = isVerified;
    driver.verification.verifiedBy = req.userId;
    driver.verification.verificationNotes = verificationNotes;
    driver.verification.verifiedAt = new Date();

    await driver.save();

    res.json({
      message: 'Driver verification updated successfully',
      driver: {
        id: driver._id,
        verification: driver.verification
      }
    });

  } catch (error) {
    console.error('Update driver verification error:', error);
    res.status(500).json({ message: 'Error updating driver verification' });
  }
};

// Get nearby drivers (for cab search)
const getNearbyDrivers = async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query; // radius in meters

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Convert radius from meters to radians (for MongoDB geospatial queries)
    const radiusInRadians = radius / 6371000; // Earth's radius in meters

    const drivers = await Driver.find({
      'availability.currentLocation': {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], radiusInRadians]
        }
      },
      'availability.status': 'available',
      'verification.isVerified': true,
      'ratings.averageRating': { $gte: 4.0 }
    })
    .select('profile.firstName profile.lastName profile.phone vehicle vehicleType ratings.averageRating availability.currentLocation')
    .limit(10);

    res.json({
      drivers: drivers.map(driver => ({
        id: driver._id,
        name: `${driver.profile.firstName} ${driver.profile.lastName}`,
        phone: driver.profile.phone,
        vehicle: driver.vehicle,
        vehicleType: driver.vehicleType,
        rating: driver.ratings.averageRating,
        location: driver.availability.currentLocation
      })),
      total: drivers.length
    });

  } catch (error) {
    console.error('Get nearby drivers error:', error);
    res.status(500).json({ message: 'Error fetching nearby drivers' });
  }
};

// Update driver availability
const updateDriverAvailability = async (req, res) => {
  try {
    const { status, currentLocation, workingHours } = req.body;

    const driver = await Driver.findById(req.userId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (status) {
      driver.availability.status = status;
    }

    if (currentLocation) {
      driver.availability.currentLocation = currentLocation;
    }

    if (workingHours) {
      driver.availability.workingHours = workingHours;
    }

    await driver.save();

    res.json({
      message: 'Driver availability updated successfully',
      availability: driver.availability
    });

  } catch (error) {
    console.error('Update driver availability error:', error);
    res.status(500).json({ message: 'Error updating driver availability' });
  }
};

// Get driver earnings
const getDriverEarnings = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { period = 'monthly' } = req.query; // daily, weekly, monthly, yearly

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Calculate earnings based on period
    let startDate;
    const now = new Date();
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'monthly':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'yearly':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    // This is a simplified earnings calculation
    // In a real system, you'd query completed bookings and sum up the earnings
    const earnings = {
      period,
      totalEarnings: driver.earnings.totalEarnings,
      currentBalance: driver.earnings.currentBalance,
      lastPayout: driver.earnings.lastPayout,
      completedRides: driver.performance.totalRides,
      averageRating: driver.ratings.averageRating
    };

    res.json({ earnings });

  } catch (error) {
    console.error('Get driver earnings error:', error);
    res.status(500).json({ message: 'Error fetching driver earnings' });
  }
};

// Routes
router.get('/all', authenticate, (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
}, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['available', 'busy', 'offline']),
  query('verified').optional().isBoolean()
], getAllDrivers);

router.get('/details/:driverId', authenticate, [
  param('driverId').isMongoId().withMessage('Invalid driver ID')
], getDriverDetails);

router.put('/verify/:driverId', authenticate, (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
}, [
  param('driverId').isMongoId().withMessage('Invalid driver ID'),
  body('isVerified').isBoolean().withMessage('Verification status is required'),
  body('verificationNotes').optional().isString().isLength({ max: 1000 })
], updateDriverVerification);

router.get('/nearby', authenticate, [
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  query('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  query('radius').optional().isInt({ min: 100, max: 50000 }).withMessage('Radius must be between 100-50000 meters')
], getNearbyDrivers);

router.put('/availability', authenticate, [
  body('status').optional().isIn(['available', 'busy', 'offline']),
  body('currentLocation.lat').optional().isFloat({ min: -90, max: 90 }),
  body('currentLocation.lng').optional().isFloat({ min: -180, max: 180 }),
  body('workingHours.start').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('workingHours.end').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
], updateDriverAvailability);

router.get('/earnings/:driverId', authenticate, [
  param('driverId').isMongoId().withMessage('Invalid driver ID'),
  query('period').optional().isIn(['daily', 'weekly', 'monthly', 'yearly'])
], getDriverEarnings);

module.exports = router;