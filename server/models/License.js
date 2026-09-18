const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ['free', 'premium'] },
  owner_email: { type: String },
  status: { type: String, default: 'active', enum: ['active', 'disabled', 'expired'] },
  duration: { type: String, default: 'Selamanya' },
  expires_at: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('License', licenseSchema);
