// controllers/ledgerController.js
const getDbForUser = require('../utils/getDbForUser');
const ledgerSchema = require('../models/LedgerSchema');
const customerSchema = require('../models/Customer'); // 
const productSchema = require('../models/Product');   // 
const saleSchema = require('../models/Sale');
// Get all ledger entries (flat)
exports.getLedger = async (req, res) => {
  try {
    const db = await getDbForUser(req.user);
const Ledger = db.models.Ledger || db.model('Ledger', ledgerSchema);   
const Customer = db.models.Customer || db.model('Customer', customerSchema);    const Product = db.models['Product'] || db.model('Product', productSchema);
const Sale = db.models.Sale || db.model('Sale', saleSchema);

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
    const Ledger = db.models.Ledger || db.model('Ledger', ledgerSchema);

    const { customer, sale, total, products, markAsPaid = false } = req.body;

    if (!customer || !products || total == null) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Find existing ledger for this customer
    let ledger = await Ledger.findOne({ customer });

    const productEntries = products.map(p => ({
      product: p.product,
      quantity: p.quantity || 1,
      price: p.price || 0,
      discount: p.discount || 0,
      total: p.total || (p.price * (p.quantity || 1) - (p.discount || 0)),
      date: new Date() // track per-entry timestamp
    }));

    const paidAmountToAdd = markAsPaid ? Number(total) : 0;
    const paymentsArray = markAsPaid
      ? [{ amount: paidAmountToAdd, method: 'cash', date: new Date() }]
      : [];

    if (ledger) {
      // Prevent duplicate sale
      if (sale && !ledger.sales.includes(sale)) {
        ledger.sales.push(sale);
      }

      // Append new product entries (full history preserved)
      ledger.products.push(...productEntries);

      // Update totals
      ledger.total += Number(total);
      ledger.paidAmount += paidAmountToAdd;
      if (markAsPaid) {
        ledger.payments.push(...paymentsArray);
      }

      await ledger.save();
    } else {
      // Create new ledger for customer
      ledger = new Ledger({
        customer,
        sales: sale ? [sale] : [],
        products: productEntries,
        total: Number(total),
        paidAmount: paidAmountToAdd,
        payments: paymentsArray
      });

      await ledger.save();
    }

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
const Ledger = db.models.Ledger || db.model('Ledger', ledgerSchema);
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
const Ledger = db.models.Ledger || db.model('Ledger', ledgerSchema);
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

// Ledger grouped by customer with product-level history
exports.getLedgerGroupedByCustomer = async (req, res) => {
  try {
    const db = await getDbForUser(req.user);
    const Ledger = db.models.Ledger || db.model('Ledger', ledgerSchema);
    const Customer = db.models.Customer || db.model('Customer', customerSchema);

    const grouped = await Ledger.aggregate([
      // Join with customer info
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      { $unwind: '$customerInfo' },

      // Sort ledger by creation date (latest first)
      { $sort: { createdAt: -1 } },

      // Group by customer
      {
        $group: {
          _id: '$customer',
          customer: { $first: '$customerInfo' },
          totalPaid: { $sum: '$paidAmount' },
          totalRemaining: { $sum: { $subtract: ['$total', '$paidAmount'] } },
          entries: {
            $push: {
              ledgerId: '$_id',
              date: '$createdAt',
              products: '$products',
              total: '$total',
              paidAmount: '$paidAmount',
              remaining: { $subtract: ['$total', '$paidAmount'] }
            }
          }
        }
      },

      // Sort entries by date descending per customer
      {
        $project: {
          customer: 1,
          totalPaid: 1,
          totalRemaining: 1,
          entries: { $sortArray: { input: '$entries', sortBy: { date: -1 } } }
        }
      }
    ]);

    res.json({ success: true, grouped });
  } catch (err) {
    console.error('Error fetching grouped ledger:', err);
    res.status(500).json({ success: false, message: 'Error fetching grouped ledger', error: err.message });
  }
};


