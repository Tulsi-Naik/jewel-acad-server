const express = require('express');
const router = express.Router();
const controller = require('../controllers/salesController');

router.post('/', controller.recordSale);
router.get('/', (req, res) => {
  res.json({ message: 'Sales route is working and protected' });
});

module.exports = router;
