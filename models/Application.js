const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  businessName: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Application', applicationSchema);
