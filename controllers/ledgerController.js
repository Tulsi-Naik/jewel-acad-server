const getDbForUser = require('../utils/getDbForUser');
const ledgerSchema = require('../models/LedgerSchema'); // ✅ now this is freshLedgerSchema
console.log('✅ Ledger schema loaded:', typeof ledgerSchema);
const saleSchema = require('../models/Sale').schema;
const productSchema = require('../models/Product').schema;
const customerSchema = require('../models/Customer').schema;


exports.markAsPaid = async (req, res) => {
  try {
    
    const db = getDbForUser(req.user);
const Ledger = db.models['Ledger'] || db.model('Ledger', ledgerSchema);

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

        console.log(' User payload:', req.user); // 
    const db = getDbForUser(req.user);
const Ledger = db.models['Ledger'] || db.model('Ledger', ledgerSchema);
    const Customer = db.model('Customer', customerSchema);

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
    const Ledger = db.models['Ledger'] || db.model('Ledger', ledgerSchema);

    const { customer, sale, total, products, markAsPaid = false } = req.body;

    if (!customer || !products || total == null) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    let ledger = await Ledger.findOne({ customer, paid: false });

    if (ledger) {
      // Merge product quantities
      products.forEach(newItem => {
        const existing = ledger.products.find(p => p.product.toString() === newItem.product);
        if (existing) {
          existing.quantity += newItem.quantity || 1;
        } else {
          ledger.products.push({
            product: newItem.product,
            quantity: newItem.quantity || 1
          });
        }
      });

      if (sale) {
        ledger.sales = ledger.sales || [];
        if (!ledger.sales.includes(sale)) {
          ledger.sales.push(sale);
        }
      }

      ledger.total += Number(total);

      if (markAsPaid) {
        ledger.paidAmount = ledger.total;
        ledger.total = 0;
        ledger.paid = true;
        ledger.paidAt = new Date();
      }

      await ledger.save();
      return res.json({ success: true, message: 'Ledger updated', ledger });
    }

    // Create new ledger
    const newLedger = new Ledger({
      customer,
      sales: sale ? [sale] : [],
      products: products.map(p => ({
        product: p.product,
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

