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
// GET route to fetch all applications
router.get('/', async (req, res) => {
  try {
    const applications = await Application.find().sort({ createdAt: -1 }); // Most recent first
    res.status(200).json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});
// ✅ DELETE an application
router.delete('/:id', async (req, res) => {
  try {
    await Application.findByIdAndDelete(req.params.id);
    res.json({ message: 'Application deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete application' });
  }
});
// ✅ PATCH to mark as reviewed
router.patch('/:id/review', async (req, res) => {
  try {
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { isReviewed: true },
      { new: true }
    );
    res.json(application);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update review status' });
  }
});

module.exports = router;
