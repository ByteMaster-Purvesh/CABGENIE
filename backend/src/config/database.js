const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cabgenie', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 second timeout
    });

    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error; // Re-throw the error so the server can handle it properly
  }
};

module.exports = connectDB;