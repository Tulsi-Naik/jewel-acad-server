const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportController');

router.get('/daily', controller.getDailyReport);
router.get('/monthly', controller.getMonthlyReport);

module.exports = router;
