const express = require('express');
const router = express.Router();
const getDbForUser = require('../utils/getDbForUser');
const ledgerSchema = require('../models/LedgerSchema');

const {
  markAsPaid,
  getLedger,
  syncLedger,
} = require('../controllers/ledgerController');

router.post('/sync', syncLedger);

router.get('/', async (req, res) => {
  try {
    const db = getDbForUser(req.user);
    const Ledger = db.models['Ledger'] || db.model('Ledger', ledgerSchema);

    const ledgers = await Ledger.find({})
      .populate('customer')
      .populate('products')
      .sort({ createdAt: -1 });

    res.status(200).json(ledgers); // ✅ clean and correct
  } catch (error) {
    console.error('Ledger fetch error:', error);
    res.status(500).json({ message: 'Server error fetching ledgers' });
  }
});


router.post('/', async (req, res) => {
  try {
    const db = getDbForUser(req.user);
    const Ledger = db.models['Ledger'] || db.model('Ledger', ledgerSchema);

    const { customer, products, total } = req.body;
    if (!customer || !products || !total) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newLedger = new Ledger({ customer, products, total });
    const saved = await newLedger.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Ledger create error:', error);
    res.status(500).json({ message: 'Server error creating ledger' });
  }
});

router.patch('/:id/pay', async (req, res) => {
  try {
    const db = getDbForUser(req.user);
    const Ledger = db.models['Ledger'] || db.model('Ledger', ledgerSchema);

    const ledger = await Ledger.findById(req.params.id);
    if (!ledger) {
      return res.status(404).json({ message: 'Ledger not found' });
    }

    ledger.paidAmount = ledger.total;
    ledger.total = 0;
    ledger.paid = true;
    ledger.paidAt = new Date();

    const updatedLedger = await ledger.save();
    res.json({ success: true, message: 'Ledger marked as paid', ledger: updatedLedger });
  } catch (error) {
    console.error('Ledger pay error:', error);
    res.status(500).json({ success: false, message: 'Server error updating ledger' });
  }
});

router.patch('/:id/partial-pay', async (req, res) => {
  try {
    const db = getDbForUser(req.user);
    const Ledger = db.models['Ledger'] || db.model('Ledger', ledgerSchema);

    const ledgerId = req.params.id;
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const ledger = await Ledger.findById(ledgerId);
    if (!ledger) {
      return res.status(404).json({ success: false, message: 'Ledger not found' });
    }

    const newTotal = ledger.total - amount;
    if (newTotal < 0) {
      return res.status(400).json({ success: false, message: 'Amount exceeds total' });
    }

    ledger.total = newTotal;
    if (newTotal === 0) {
      ledger.paid = true;
    }

    const updatedLedger = await ledger.save();
    res.json({
      success: true,
      message: 'Partial payment updated',
      ledger: updatedLedger
    });
  } catch (error) {
    console.error('Partial payment error:', error);
    res.status(500).json({ success: false, message: 'Server error processing partial payment' });
  }
});

module.exports = router;
