// controllers/ledgerController.js
const getDbForUser = require('../utils/getDbForUser');
const LedgerSchema = require('../models/LedgerSchema');
const mongoose = require('mongoose');

exports.getLedger = async (req, res) => {
  try {
    const db = getDbForUser(req.user);
    const Ledger = db.models['Ledger'] || db.model('Ledger', LedgerSchema);

    const ledgers = await Ledger.find()
      .populate('customer')
      .populate('products.product')
      .sort({ createdAt: -1 });

    res.json({ success: true, ledgers });
  } catch (err) {
    console.error('Error fetching ledgers:', err);
    res.status(500).json({ success: false, message: 'Error fetching ledger', error: err.message });
  }
};

exports.syncLedger = async (req, res) => {
  try {
    const db = getDbForUser(req.user);
    const Ledger = db.models['Ledger'] || db.model('Ledger', LedgerSchema);

    const { customer, sale, total, products, markAsPaid = false } = req.body;
    if (!customer || !products || total == null) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newLedger = new Ledger({
      customer,
      sales: sale ? [sale] : [],
      products: products.map(p => ({
        product: new mongoose.Types.ObjectId(p.product),
        quantity: p.quantity || 1,
        price: p.price || 0,
        discount: p.discount || 0,
        total: p.total || (p.price * p.quantity - p.discount)
      })),
      total: Number(total),
      paidAmount: markAsPaid ? Number(total) : 0,
      status: markAsPaid ? 'Paid' : 'Unpaid',
      payments: markAsPaid ? [{ amount: Number(total), method: 'cash', date: new Date() }] : []
    });

    await newLedger.save();
    res.status(201).json({ success: true, ledger: newLedger });
  } catch (err) {
    console.error('Sync ledger error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.markAsPaid = async (req, res) => {
  try {
    const db = getDbForUser(req.user);
    const Ledger = db.models['Ledger'] || db.model('Ledger', LedgerSchema);

    const ledger = await Ledger.findById(req.params.id);
    if (!ledger) return res.status(404).json({ success: false, message: 'Ledger not found' });

    const remaining = ledger.total - ledger.paidAmount;
    if (remaining <= 0) return res.status(400).json({ success: false, message: 'Ledger already paid' });

    ledger.paidAmount += remaining;
    ledger.payments.push({ amount: remaining, method: req.body.method || 'cash', date: new Date() });

    await ledger.save();
    res.json({ success: true, ledger });
  } catch (err) {
    console.error('Error marking as paid:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.partialPay = async (req, res) => {
  try {
    const db = getDbForUser(req.user);
    const Ledger = db.models['Ledger'] || db.model('Ledger', LedgerSchema);

    const { amount, method } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });

    const ledger = await Ledger.findById(req.params.id);
    if (!ledger) return res.status(404).json({ success: false, message: 'Ledger not found' });

    const remaining = ledger.total - ledger.paidAmount;
    if (remaining <= 0) return res.status(400).json({ success: false, message: 'Ledger already paid' });

    const payAmount = Math.min(amount, remaining);
    ledger.paidAmount += payAmount;
    ledger.payments.push({ amount: payAmount, method: method || 'cash', date: new Date() });

    await ledger.save();
    res.json({ success: true, ledger });
  } catch (err) {
    console.error('Error in partialPay:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
exports.getLedgerGroupedByCustomer = async (req, res) => {
  try {
    const db = getDbForUser(req.user);
    const Ledger = db.models['Ledger'] || db.model('Ledger', LedgerSchema);

    const grouped = await Ledger.aggregate([
      {
        $group: {
          _id: '$customer',
          totalAmount: { $sum: '$total' },
          totalPaid: { $sum: '$paidAmount' },
          ledgers: { $push: '$$ROOT' },
        }
      },
      {
        $lookup: {
          from: 'customers',  // collection name must match in MongoDB
          localField: '_id',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      {
        $unwind: '$customerInfo'
      },
      {
        $project: {
          customer: '$customerInfo',
          totalAmount: 1,
          totalPaid: 1,
          totalUnpaid: { $subtract: ['$totalAmount', '$totalPaid'] },
          ledgers: 1
        }
      },
      { $sort: { 'customer.name': 1 } } // optional sorting by customer name
    ]);

    res.json({ success: true, grouped });
  } catch (err) {
    console.error('Error fetching grouped ledger:', err);
    res.status(500).json({ success: false, message: 'Error fetching grouped ledger', error: err.message });
  }
};
