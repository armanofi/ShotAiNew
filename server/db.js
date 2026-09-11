const mongoose = require('mongoose');
const User = require('./models/User');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://salmanbs2018_db_user:shotai2026@cluster0.si43w8g.mongodb.net/shotai?appName=Cluster0';
    if (!uri) {
      console.error('Error: MONGODB_URI is not defined in .env');
      return;
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
  }
};

module.exports = connectDB;
