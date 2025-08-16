// controllers/salesController.js
const getDbForUser = require('../utils/getDbForUser');
const { schema: saleSchema } = require('../models/Sale');
const { schema: productSchema } = require('../models/Product');
const { schema: ledgerSchema } = require('../models/LedgerSchema');

exports.recordSale = async (req, res) => {
  let session;
  try {
    const db = await getDbForUser(req.user);

    // Multi-tenant model registration
    const Sale = db.models['Sale'] || db.model('Sale', saleSchema);
    const Product = db.models['Product'] || db.model('Product', productSchema);
    const Ledger = db.models['Ledger'] || db.model('Ledger', ledgerSchema);

    session = await db.startSession();
    session.startTransaction();

    const { customer, items } = req.body;

    if (!customer) return res.status(400).json({ message: 'Customer is required.' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Items are required.' });

    // Validate products & calculate total
    let totalAmount = 0;
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new Error(`Product not found: ${item.product}`);
      if (item.quantity <= 0) throw new Error(`Invalid quantity for ${product.name}`);
      if (product.quantity < item.quantity) throw new Error(`Not enough stock for ${product.name}`);
      totalAmount += product.price * item.quantity;
    }

    // Deduct stock
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: -item.quantity } },
        { session }
      );
    }

    // Save sale
    const sale = new Sale({ customer, items, totalAmount });
    const savedSale = await sale.save({ session });

    // Sync ledger
    let ledger = await Ledger.findOne({ customer }).session(session);
    const ledgerProducts = items.map(i => ({
      product: i.product,
      quantity: i.quantity,
      price: i.price || 0,
      discount: i.discount || 0,
      total: i.quantity * (i.price || 0) - (i.discount || 0)
    }));

    if (ledger) {
      ledger.sales.push(savedSale._id);
      ledger.products.push(...ledgerProducts);
      ledger.total += totalAmount;
    } else {
      ledger = new Ledger({
        customer,
        sales: [savedSale._id],
        products: ledgerProducts,
        total: totalAmount,
        paidAmount: 0,
        payments: []
      });
    }

    await ledger.save({ session });
    await session.commitTransaction();

    res.status(201).json(savedSale);

  } catch (err) {
    if (session) await session.abortTransaction();
    console.error('Error in recordSale:', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  } finally {
    if (session) session.endSession();
  }
};
