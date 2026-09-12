const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user', enum: ['superadmin', 'user'] },
  name: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
