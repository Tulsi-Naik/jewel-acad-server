// reportRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportController');

// no need to add authenticateToken here
router.get('/daily', controller.getDailyReport);
router.get('/monthly', controller.getMonthlyReport);
router.get('/top-products', controller.getTopProducts);

module.exports = router;
