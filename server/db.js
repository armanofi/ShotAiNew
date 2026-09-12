const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://salmanbs2018_db_user:shotai2026@cluster0.si43w8g.mongodb.net/shotai?appName=Cluster0';

// Cache koneksi agar tidak timeout di Vercel serverless
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // Jika sudah terhubung, gunakan koneksi yang ada
  if (cached.conn) {
    return cached.conn;
  }

  // Jika belum ada promise koneksi, buat baru
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('Connected to MongoDB Cloud');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection failed:', e.message);
    throw e;
  }

  return cached.conn;
};

module.exports = connectDB;
