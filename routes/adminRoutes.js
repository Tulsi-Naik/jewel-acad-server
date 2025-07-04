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
  dbName: String
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
    const { username, password, dbName } = req.body;
    if (!username || !password || !dbName) {
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
      dbName
    });

    await newUser.save();
    res.status(201).json({ message: 'Vendor created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error creating vendor', error: err.message });
  }
});

module.exports = router;
