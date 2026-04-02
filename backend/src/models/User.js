const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['passenger', 'driver', 'admin'],
    required: true
  },
  profile: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    address: String,
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    avatar: String
  },
  preferences: {
    language: { type: String, default: 'en' },
    accessibilityMode: { type: Boolean, default: false },
    highContrast: { type: Boolean, default: false },
    voiceEnabled: { type: Boolean, default: false },
    preferredVehicleTypes: [String],
    maxFarePreference: Number,
    safetyPriority: { type: Number, default: 5, min: 1, max: 10 }
  },
  wallet: {
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    paymentMethods: [{
      type: { type: String, enum: ['upi', 'card', 'wallet'] },
      provider: String,
      isDefault: { type: Boolean, default: false },
      details: mongoose.Schema.Types.Mixed
    }]
  },
  safety: {
    emergencyContacts: [{
      name: String,
      phone: String,
      relationship: String
    }],
    shareRideEnabled: { type: Boolean, default: true },
    panicButtonEnabled: { type: Boolean, default: true }
  },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'profile.phone': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update timestamp
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);