// backend/models/Application.js
import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  businessName: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Application', applicationSchema);
