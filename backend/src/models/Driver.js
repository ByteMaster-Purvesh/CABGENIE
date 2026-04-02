const mongoose = require('mongoose');
const User = require('./User');

const driverSchema = User.schema.clone();

driverSchema.add({
  driverSpecific: {
    licenseNumber: { type: String, required: true, unique: true },
    licenseExpiry: { type: Date, required: true },
    vehicleRegistration: { type: String, required: true, unique: true },
    vehicleModel: { type: String, required: true },
    vehicleType: { 
      type: String, 
      required: true,
      enum: ['sedan', 'suv', 'hatchback', 'luxury', 'auto', 'bike']
    },
    vehicleColor: { type: String, required: true },
    seatingCapacity: { type: Number, required: true, min: 1, max: 10 },
    acAvailable: { type: Boolean, default: true },
    vehicleImages: [String],
    driverPhoto: String,
    documents: {
      licenseImage: String,
      registrationImage: String,
      insuranceImage: String,
      pollutionCertificate: String
    }
  },
  ratings: {
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    fiveStar: { type: Number, default: 0 },
    fourStar: { type: Number, default: 0 },
    threeStar: { type: Number, default: 0 },
    twoStar: { type: Number, default: 0 },
    oneStar: { type: Number, default: 0 }
  },
  performance: {
    totalRides: { type: Number, default: 0 },
    completedRides: { type: Number, default: 0 },
    cancelledRides: { type: Number, default: 0 },
    cancellationRate: { type: Number, default: 0 },
    acceptanceRate: { type: Number, default: 0 },
    reliabilityScore: { type: Number, default: 0, min: 0, max: 100 }
  },
  availability: {
    isAvailable: { type: Boolean, default: true },
    currentLocation: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
    },
    lastLocationUpdate: Date,
    workingHours: {
      start: { type: String, default: '00:00' },
      end: { type: String, default: '23:59' }
    }
  },
  earnings: {
    totalEarnings: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    lastPayout: Date,
    commissionRate: { type: Number, default: 15 } // 15% commission
  },
  verification: {
    isLicenseVerified: { type: Boolean, default: false },
    isVehicleVerified: { type: Boolean, default: false },
    isBackgroundCheckDone: { type: Boolean, default: false },
    verificationDate: Date,
    verifiedBy: String
  },
  fraudAlerts: [{
    type: String,
    description: String,
    severity: { type: String, enum: ['low', 'medium', 'high'] },
    date: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false }
  }]
});

// Set role to driver
driverSchema.pre('save', function(next) {
  this.role = 'driver';
  
  // Calculate cancellation rate
  if (this.performance.totalRides > 0) {
    this.performance.cancellationRate = (this.performance.cancelledRides / this.performance.totalRides) * 100;
  }
  
  // Calculate reliability score
  if (this.ratings.averageRating >= 4.0 && this.performance.cancellationRate < 5) {
    this.performance.reliabilityScore = Math.min(100, 
      (this.ratings.averageRating * 20) + 
      ((100 - this.performance.cancellationRate) * 0.5) +
      (this.performance.acceptanceRate * 0.3)
    );
  }
  
  next();
});

// Indexes for geospatial queries and performance
driverSchema.index({ 'availability.currentLocation': '2dsphere' });
driverSchema.index({ 'driverSpecific.vehicleType': 1 });
driverSchema.index({ 'ratings.averageRating': -1 });
driverSchema.index({ 'performance.reliabilityScore': -1 });
driverSchema.index({ 'availability.isAvailable': 1 });

module.exports = mongoose.model('Driver', driverSchema);