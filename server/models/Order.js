const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  order_number: { type: String, required: true, unique: true },
  user_email: { type: String, required: true },
  product_name: { type: String, required: true },
  package_type: { type: String, default: '1 Bulan' },
  price: { type: String, default: 'Rp 49.000' },
  status: { type: String, default: 'Selesai', enum: ['Selesai', 'Pending', 'Batal'] },
  license_code: { type: String },
  notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
