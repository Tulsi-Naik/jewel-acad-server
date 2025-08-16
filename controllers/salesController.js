const getDbForUser = require('../utils/getDbForUser');
const saleSchema = require('../models/Sale').schema;
const productSchema = require('../models/Product').schema;
const LedgerSchema = require('../models/LedgerSchema'); // ✅ import ledger schema

exports.recordSale = async (req, res) => {
  const db = getDbForUser(req.user);
  const Sale = db.model('Sale', saleSchema);
  const Product = db.model('Product', productSchema);
  const Ledger = db.models['Ledger'] || db.model('Ledger', LedgerSchema); // multi-tenant safe

  const session = await Product.startSession();
  session.startTransaction();

  try {
    const { customer, items } = req.body;

    if (!customer) return res.status(400).json({ message: 'Customer is required.' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Items are required.' });

    let totalAmount = 0;
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) return res.status(400).json({ message: `Product not found: ${item.product}` });
      if (item.quantity <= 0) return res.status(400).json({ message: `Invalid quantity for ${product?.name}` });
      if (product.quantity < item.quantity) return res.status(400).json({ message: `Not enough stock for ${product?.name}` });
      totalAmount += product.price * item.quantity;
    }

    // Deduct stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } }, { session });
    }

    // Save sale
    const sale = new Sale({ customer, items, totalAmount });
    const savedSale = await sale.save({ session });

    // ✅ Sync ledger
    let ledger = await Ledger.findOne({ customer });
    if (ledger) {
      // Update existing ledger
      ledger.sales.push(savedSale._id);
      ledger.products.push(...items.map(i => ({
        product: i.product,
        quantity: i.quantity,
        price: i.price || 0,
        discount: i.discount || 0,
        total: i.quantity * (i.price || 0) - (i.discount || 0)
      })));
      ledger.total += totalAmount;
    } else {
      // Create new ledger
      ledger = new Ledger({
        customer,
        sales: [savedSale._id],
        products: items.map(i => ({
          product: i.product,
          quantity: i.quantity,
          price: i.price || 0,
          discount: i.discount || 0,
          total: i.quantity * (i.price || 0) - (i.discount || 0)
        })),
        total: totalAmount,
        paidAmount: 0,
        payments: []
      });
    }
    await ledger.save({ session });

    await session.commitTransaction();
    res.status(201).json(savedSale);

  } catch (err) {
    await session.abortTransaction();
    console.error('Error in recordSale:', err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    session.endSession();
  }
};//
