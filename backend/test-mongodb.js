const mongoose = require('mongoose');
const User = require('./src/models/User');

async function testMongoDB() {
  try {
    console.log('Testing MongoDB connection...');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/cabgenie', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB connected successfully');
    
    // Test creating a simple user document
    console.log('Testing user creation...');
    
    const testUser = new User({
      email: 'test.mongodb@example.com',
      password: 'password123',
      role: 'passenger',
      profile: {
        firstName: 'MongoDB',
        lastName: 'Test',
        phone: '1234567890',
        address: '123 Test Street',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male'
      }
    });
    
    console.log('User document created:', testUser);
    
    // Try to save the user
    await testUser.save();
    console.log('User saved successfully!');
    
    // Clean up - delete the test user
    await User.deleteOne({ email: 'test.mongodb@example.com' });
    console.log('Test user cleaned up');
    
  } catch (error) {
    console.error('MongoDB test failed:', error);
  } finally {
    await mongoose.connection.close();
  }
}

testMongoDB();