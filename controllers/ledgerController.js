const Sale = require('../models/Sale');

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

