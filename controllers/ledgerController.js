const getDbForUser = require('../utils/getDbForUser');
const freshLedgerSchema = require('../models/LedgerSchema');
console.log('✅ Ledger schema loaded:', typeof ledgerSchema);
const saleSchema = require('../models/Sale').schema;
const productSchema = require('../models/Product').schema;
const customerSchema = require('../models/Customer').schema;
const mongoose = require('mongoose'); // ✅ REQUIRED for ObjectId

exports.markAsPaid = async (req, res) => {
  try {
    
    const db = getDbForUser(req.user);
if (db.models['Ledger']) {
  delete db.models['Ledger']; // 🔥 force Mongoose to reload the updated schema
}
const Ledger = db.model('Ledger', freshLedgerSchema);

    const ledger = await Ledger.findById(req.params.id);
    if (!ledger) {
      return res.status(404).json({ success: false, message: 'Ledger not found' });
    }

    ledger.paidAmount = ledger.total;
    ledger.total = 0;
    ledger.paid = true;
    ledger.paidAt = new Date();
    await ledger.save();

    res.json({ success: true });
  } catch (err) {
    console.error('Error marking as paid:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
exports.getLedger = async (req, res) => {
  try {
    console.log('🧪 Ledger model type:', typeof Ledger, Ledger?.find);
    console.log(' User payload:', req.user);

    const db = getDbForUser(req.user);
    if (db.models['Ledger']) {
      delete db.models['Ledger'];
    }
    const Ledger = db.model('Ledger', freshLedgerSchema);

    const ledgers = await Ledger.find()
      .populate('customer')
      .populate('products.product'); // ✅ populate product details

    res.json(ledgers);
  } catch (err) {
    console.error('Error fetching ledgers:', err);
    res.status(500).json({ message: 'Error fetching ledger', error: err.message });
  }
};


exports.syncLedger = async (req, res) => {
  try {
    const db = getDbForUser(req.user);
    if (db.models['Ledger']) {
      delete db.models['Ledger'];
    }
    const Ledger = db.model('Ledger', freshLedgerSchema);

    const { customer, sale, total, products, markAsPaid = false } = req.body;

    if (!customer || !products || total == null) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newLedger = new Ledger({
      customer,
      sales: sale ? [sale] : [],
      products: products.map(p => ({
        product: new mongoose.Types.ObjectId(p.product),
        quantity: p.quantity || 1
      })),
      total: markAsPaid ? 0 : Number(total),
      paid: !!markAsPaid,
      paidAmount: markAsPaid ? Number(total) : 0,
      paidAt: markAsPaid ? new Date() : undefined
    });

    await newLedger.save();
    return res.status(201).json({ success: true, message: 'Ledger created', ledger: newLedger });
  } catch (err) {
    console.error('Sync ledger error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
