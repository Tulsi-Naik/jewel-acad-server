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
    const sales = await Sale.find()
      .populate('customer')
      .populate('items.product'); 

    const ledger = sales.map(sale => {
      const products = sale.items.map(item => item.product?.name || 'Unknown');
      const total = sale.items.reduce((sum, item) => {
        const price = item.product?.price || 0;
        return sum + (price * item.quantity);
      }, 0);

      return {
        customer: sale.customer,
        products,
        total,
      };
    });

    res.json(ledger);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Error fetching ledger", error: err.message });
  }

};

