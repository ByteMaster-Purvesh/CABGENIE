const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const cabRoutes = require('./routes/cabs');
const bookingRoutes = require('./routes/bookings');
const aiRoutes = require('./routes/ai');
const paymentRoutes = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB().then(() => {
  console.log('✅ Database connection established');
}).catch(err => {
  console.error('❌ Failed to connect to database:', err.message);
  console.log('🚀 Starting server anyway for development...');
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
})); 

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'CABGENIE Backend API'
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/cabs', cabRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/payments', paymentRoutes);
const driverRoutes = require('./routes/drivers');
app.use('/api/v1/drivers', driverRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 CABGENIE Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;