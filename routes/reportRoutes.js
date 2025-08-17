const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportController');
const authenticateToken = require('../middleware/authMiddleware'); //  add this

//  protect both endpoints so req.user is available for getDbForUser
router.get('/daily', authenticateToken, controller.getDailyReport);
router.get('/monthly', authenticateToken, controller.getMonthlyReport);

module.exports = router;
