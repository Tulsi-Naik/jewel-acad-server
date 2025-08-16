// routes/LedgerRoutes.js
const express = require('express');
const router = express.Router();

const {
  markAsPaid,
  partialPay,
  getLedger,
  syncLedger,
  getLedgerGroupedByCustomer  // ✅ import the new function
} = require('../controllers/ledgerController');

// Sync or create ledger
router.post('/sync', syncLedger);

// Get all ledgers
router.get('/', getLedger);

// Get ledger grouped by customer
router.get('/group-by-customer', getLedgerGroupedByCustomer); // ✅ new route

// Mark ledger as fully paid
router.patch('/:id/pay', markAsPaid);

// Make a partial payment
router.patch('/:id/partial-pay', partialPay);

module.exports = router;
