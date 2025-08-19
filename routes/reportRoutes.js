// reportRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportController');

// no need to add authenticateToken here
router.get('/daily', controller.getDailyReport);
router.get('/monthly', controller.getMonthlyReport);
router.get('/top-products', controller.getTopProducts);
router.get('/slow-products', controller.getSlowProducts);
router.get('/customers', controller.getCustomerReport);
router.get('/stock', controller.getStockReport);
router.get('/ledger/outstanding', controller.getOutstandingLedger);

module.exports = router;
//