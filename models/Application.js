// backend/models/Application.js
const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  businessName: String,
  message: String,
  createdAt: { type: Date, default: Date.now },
  isReviewed: { type: Boolean, default: false } // NEW FIELD
});


// 🔥 Use 'authDB' explicitly
const appConnection = mongoose.connection.useDb('authDB');
module.exports = appConnection.model('Application', applicationSchema);
