const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const router = express.Router();

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
router.get('/ping', (req, res) => {
  res.json({ message: 'Auth route is alive' });
});


router.post('/login', async (req, res) => {
  try {
    console.log('Login request body:', req.body);

    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      console.log('User not found');
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { username: user.username, role: user.role, dbName: user.dbName,businessName: user.businessName,
    address: user.address,
    contact: user.contact },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Login successful');
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
