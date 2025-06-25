const express = require('express');
const router = express.Router();
const Ledger = require('../models/Ledger');


router.get('/', async (req, res) => {
  try {
    const ledgers = await Ledger.find({ total: { $gt: 0 }, paid: false })
      .populate('customer')
       .populate('products')  
      .sort({ createdAt: -1 });
    if (!ledgers.length) {
      return res.status(404).json({ message: 'No pending ledgers found' });
    }
    res.json(ledgers);
  } catch (error) {
    console.error('Ledger fetch error:', error);
    res.status(500).json({ message: 'Server error fetching ledgers' });
  }
});
router.post('/', async (req, res) => {
  const { customer, products, total } = req.body;
  try {
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
    const updatedLedger = await Ledger.findByIdAndUpdate(
      req.params.id,
      { paid: true, total: 0 },
      { new: true }
    );
    if (!updatedLedger) {
      return res.status(404).json({ message: 'Ledger not found' });
    }
    res.json({ message: 'Ledger marked as paid', ledger: updatedLedger });
  } catch (error) {
    console.error('Ledger pay error:', error);
    res.json({ success: true, message: 'Ledger marked as paid', ledger: updatedLedger });
  }
});
router.patch('/:id/partial-pay', async (req, res) => {
  try {
    const ledgerId = req.params.id;
    const { amount } = req.body;
    console.log('Received amount:', amount);
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
