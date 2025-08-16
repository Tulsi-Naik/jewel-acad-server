// controllers/ledgerController.js
const getDbForUser = require('../utils/getDbForUser');
const ledgerSchema = require('../models/LedgerSchema');
const customerSchema = require('../models/Customer'); // schema only
const productSchema = require('../models/Product');   // schema only
const saleSchema = require('../models/Sale');         // schema only

// Get all ledger entries (flat)
exports.getLedger = async (req, res) => {
  try {
    const db = await getDbForUser(req.user);
    const Ledger = db.models['Ledger'] || db.model('Ledger', ledgerSchema);
    const Customer = db.models['Customer'] || db.model('Customer', customerSchema);
    const Product = db.models['Product'] || db.model('Product', productSchema);
    const Sale = db.models['Sale'] || db.model('Sale', saleSchema);

    const data = await Ledger.find()
      .populate('customer')
      .populate('products.product')
      .populate('sales')
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (err) {
    console.error('Get ledger error:', err);
    res.status(500).json({ message: 'Failed to fetch ledger', error: err.message });
  }
};

// Sync ledger (create or update)
exports.syncLedger = async (req, res) => {
  try {
    const db = await getDbForUser(req.user);
    const Ledger = db.models['Ledger'] || db.model('Ledger', ledgerSchema);

    const { customer, sale, total, products, markAsPaid = false } = req.body;
    if (!customer || !products || total == null) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    let ledger = await Ledger.findOne({ customer });
    const paidAmountToAdd = markAsPaid ? Number(total) : 0;

    if (ledger) {
      if (sale) ledger.sales.push(sale);
      ledger.products.push(...products.map(p => ({
        product: p.product,
        quantity: p.quantity || 1,
        price: p.price || 0,
        discount: p.discount || 0,
        total: p.total || (p.price * p.quantity - p.discount)
      })));
      ledger.total += Number(total);
      ledger.paidAmount += paidAmountToAdd;
    } else {
      ledger = new Ledger({
        customer,
        sales: sale ? [sale] : [],
        products: products.map(p => ({
          product: p.product,
          quantity: p.quantity || 1,
          price: p.price || 0,
          discount: p.discount || 0,
          total: p.total || (p.price * p.quantity - p.discount)
        })),
        total: Number(total),
        paidAmount: paidAmountToAdd,
        payments: markAsPaid ? [{ amount: paidAmountToAdd, method: 'cash', date: new Date() }] : []
      });
    }

    await ledger.save();
    res.status(201).json({ success: true, ledger });
  } catch (err) {
    console.error('Sync ledger error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Mark full ledger as paid
exports.markAsPaid = async (req, res) => {
  try {
    const db = await getDbForUser(req.user);
    const Ledger = db.models['Ledger'] || db.model('Ledger', ledgerSchema);

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

// Partial payment
exports.partialPay = async (req, res) => {
  try {
    const db = await getDbForUser(req.user);
    const Ledger = db.models['Ledger'] || db.model('Ledger', ledgerSchema);

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

// Ledger grouped by customer
exports.getLedgerGroupedByCustomer = async (req, res) => {
  try {
    const db = await getDbForUser(req.user);
    const Ledger = db.models['Ledger'] || db.model('Ledger', ledgerSchema);
    const Customer = db.models['Customer'] || db.model('Customer', customerSchema);

    const grouped = await Ledger.aggregate([
      {
        $group: {
          _id: '$customer',
          totalAmount: { $sum: '$total' },
          totalPaid: { $sum: '$paidAmount' },
          ledgers: { $push: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      { $unwind: '$customerInfo' },
      {
        $project: {
          customer: '$customerInfo',
          totalAmount: 1,
          totalPaid: 1,
          totalUnpaid: { $subtract: ['$totalAmount', '$totalPaid'] },
          ledgers: 1
        }
      },
      { $sort: { 'customer.name': 1 } }
    ]);

    res.json({ success: true, grouped });
  } catch (err) {
    console.error('Error fetching grouped ledger:', err);
    res.status(500).json({ success: false, message: 'Error fetching grouped ledger', error: err.message });
  }
};
