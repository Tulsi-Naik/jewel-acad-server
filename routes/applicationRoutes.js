// backend/routes/applicationRoutes.js
const express = require('express');
const Application = require('../models/Application');

const router = express.Router();

// POST route to handle new application
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, businessName, message } = req.body;
    const newApp = new Application({ name, email, phone, businessName, message });
    await newApp.save();
    res.status(201).json({ message: 'Application submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

module.exports = router;
