const mongoose = require('mongoose');
const User = require('./models/User');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('Error: MONGODB_URI is not defined in .env');
      process.exit(1);
    }
    
    await mongoose.connect(uri);
    console.log('Connected to MongoDB Cloud');

    // Create default superadmin if not exists
    const adminExists = await User.findOne({ email: 'admin@shifa.com' });
    if (!adminExists) {
      await User.create({
        email: 'admin@shifa.com',
        password: 'admin' // In a real app, hash this password
      });
      console.log('Default superadmin created');
    }

  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
