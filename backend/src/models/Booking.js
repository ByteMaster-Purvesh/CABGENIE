const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => 'CAB' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase()
  },
  passenger: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true }
  },
  driver: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    name: String,
    phone: String,
    vehicleNumber: String,
    vehicleModel: String,
    driverRating: Number
  },
  rideDetails: {
    pickupLocation: {
      address: { type: String, required: true },
      coordinates: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], required: true } // [longitude, latitude]
      },
      landmark: String
    },
    destination: {
      address: { type: String, required: true },
      coordinates: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], required: true }
      },
      landmark: String
    },
    estimatedDistance: { type: Number, required: true }, // in kilometers
    estimatedDuration: { type: Number, required: true }, // in minutes
    actualDistance: Number,
    actualDuration: Number
  },
  fare: {
    baseFare: { type: Number, required: true },
    distanceFare: { type: Number, required: true },
    timeFare: { type: Number, required: true },
    surgeMultiplier: { type: Number, default: 1.0 },
    tax: { type: Number, required: true },
    totalFare: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'wallet'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' }
  },
  provider: {
    name: { type: String, enum: ['uber', 'ola', 'rapido', 'blablacar', 'cabgenie'], required: true },
    providerId: String,
    estimatedArrival: Date,
    vehicleType: String
  },
  status: {
    type: String,
    enum: ['searching', 'confirmed', 'driver_assigned', 'driver_arriving', 'ride_started', 'ride_completed', 'cancelled'],
    default: 'searching'
  },
  timing: {
    bookingTime: { type: Date, default: Date.now },
    driverAssignedTime: Date,
    driverArrivalTime: Date,
    rideStartTime: Date,
    rideEndTime: Date,
    cancellationTime: Date
  },
  safety: {
    isNightRide: { type: Boolean, default: false },
    sharedWithContacts: [{ type: String }],
    panicButtonUsed: { type: Boolean, default: false },
    emergencyContactNotified: { type: Boolean, default: false },
    rideTrackingEnabled: { type: Boolean, default: true }
  },
  feedback: {
    passengerRating: { type: Number, min: 1, max: 5 },
    driverRating: { type: Number, min: 1, max: 5 },
    passengerComment: String,
    driverComment: String,
    issuesReported: [String]
  },
  aiRecommendation: {
    wasAIRecommended: { type: Boolean, default: false },
    recommendationScore: Number,
    recommendationReasons: [String]
  },
  cancellation: {
    cancelledBy: { type: String, enum: ['passenger', 'driver', 'system'] },
    reason: String,
    cancellationFee: Number,
    refundAmount: Number
  },
  tracking: [{
    timestamp: { type: Date, default: Date.now },
    location: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], required: true }
    },
    status: String
  }]
});

// Indexes for performance
bookingSchema.index({ bookingId: 1 });
bookingSchema.index({ 'passenger.userId': 1 });
bookingSchema.index({ 'driver.userId': 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ 'rideDetails.pickupLocation.coordinates': '2dsphere' });
bookingSchema.index({ bookingTime: -1 });

// Virtual for ride duration
bookingSchema.virtual('rideDuration').get(function() {
  if (this.timing.rideStartTime && this.timing.rideEndTime) {
    return Math.round((this.timing.rideEndTime - this.timing.rideStartTime) / 1000 / 60); // minutes
  }
  return null;
});

// Method to calculate night ride
bookingSchema.pre('save', function(next) {
  const bookingHour = new Date().getHours();
  this.safety.isNightRide = bookingHour >= 20 || bookingHour <= 6;
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);