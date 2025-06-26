const Sale = require('../models/Sale');

const Ledger = require('../models/Ledger');

exports.markAsPaid = async (req, res) => {
  try {
    const ledger = await Ledger.findById(req.params.id);
    if (!ledger) {
      return res.status(404).json({ success: false, message: 'Ledger not found' });
    }

    ledger.paid = true;
    ledger.paidAt = new Date(); // Optional, useful if you want to show payment history
    await ledger.save();

    res.json({ success: true });
  } catch (err) {
    console.error('Error marking as paid:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


exports.getLedger = async (req, res) => {
  try {
    const ledgers = await Ledger.find().populate('customer');
    res.json(ledgers);
  } catch (err) {
    console.error('Error fetching ledgers:', err);
    res.status(500).json({ message: 'Error fetching ledger', error: err.message });
  }
};



exports.syncLedger = async (req, res) => {
  try {
    const { customer, sale, total, products, markAsPaid = false } = req.body;

    if (!customer || !products || total == null) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Try to find an existing unpaid ledger
    let ledger = await Ledger.findOne({ customer, paid: false });

    if (ledger) {
      // Merge products (avoid duplicates)
     const existingIds = ledger.products.map(p => p.toString());
const combined = [...new Set([...existingIds, ...products.map(String)])];
ledger.products = combined;

      if (sale) {
  ledger.sales = ledger.sales || [];
  if (!ledger.sales.includes(sale)) {
    ledger.sales.push(sale);
  }
}


      ledger.total += Number(total); 

      if (markAsPaid) {
        ledger.paid = true;
        ledger.total = 0;
        ledger.paidAt = new Date();
      }

      await ledger.save();
      return res.json({ success: true, message: 'Ledger updated', ledger });
    }

    // No existing unpaid ledger: create new
    const newLedger = new Ledger({
      customer,
       sales: sale ? [sale] : [],
      products: products,
      total: markAsPaid ? 0 : Number(total),
        paid: !!markAsPaid,
      paidAt: markAsPaid ? new Date() : undefined
    });

    await newLedger.save();
    return res.status(201).json({ success: true, message: 'Ledger created', ledger: newLedger });
  } catch (err) {
    console.error('Sync ledger error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
