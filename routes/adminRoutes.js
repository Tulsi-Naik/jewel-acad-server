const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const requireAdmin = require('../middleware/requireAdmin');

const authConnection = mongoose.createConnection(process.env.MONGO_URI, {
  dbName: 'authDB',
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String,
  dbName: String,
  businessName: String,
address: String,
contact: String

});

const User = authConnection.model('User', userSchema, 'users');

// 🔐 Protect all routes with admin check
router.use(requireAdmin);

// 📋 GET /api/admin/vendors
router.get('/vendors', async (req, res) => {
  try {
    const vendors = await User.find({ role: 'vendor' }).select('-password');
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching vendors', error: err.message });
  }
});

// ➕ POST /api/admin/vendors
router.post('/vendors', async (req, res) => {
  try {
const { username, password, dbName, businessName, address, contact } = req.body;    if (!username || !password || !dbName) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
   const newUser = new User({
  username,
  password: hashed,
  role: 'vendor',
  dbName,
  businessName,
  address,
  contact
});

    await newUser.save();
    res.status(201).json({ message: 'Vendor created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error creating vendor', error: err.message });
  }
});
// ❌ DELETE /api/admin/vendors/:id
router.delete('/vendors/:id', async (req, res) => {
  try {
    const vendor = await User.findById(req.params.id);
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    await vendor.deleteOne();
    res.json({ message: 'Vendor deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting vendor', error: err.message });
  }
});
router.put('/vendors/:id', async (req, res) => {
  try {
const { username, dbName, businessName, address, contact } = req.body;
    const vendor = await User.findById(req.params.id);

    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    vendor.username = username;
    vendor.dbName = dbName;
    vendor.businessName = businessName;
vendor.address = address;
vendor.contact = contact;

    await vendor.save();

    res.json({ message: 'Vendor updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating vendor', error: err.message });
  }
});
// 🔐 PUT /api/admin/vendors/:id/password
router.put('/vendors/:id/password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const vendor = await User.findById(req.params.id);
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const hashed = await bcrypt.hash(password, 10);
    vendor.password = hashed;
    await vendor.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating password', error: err.message });
  }
});


module.exports = router;
