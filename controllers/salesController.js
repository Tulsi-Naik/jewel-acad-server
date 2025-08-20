// controllers/salesController.js
const getDbForUser = require('../utils/getDbForUser');
const saleSchema = require('../models/Sale');
const productSchema = require('../models/Product');

exports.recordSale = async (req, res) => {
  let session;
  try {
    const db = getDbForUser(req.user);

    const Sale = db.models.Sale || db.model('Sale', saleSchema);
    const Product = db.models.Product || db.model('Product', productSchema);

    session = await db.startSession();
    session.startTransaction();

    const { customer, products } = req.body;
    if (!customer) return res.status(400).json({ message: 'Customer is required.' });
    if (!Array.isArray(products) || products.length === 0)
      return res.status(400).json({ message: 'Products are required.' });

    let totalAmount = 0;
    const processedItems = [];

    // Validate products & calculate total
    for (const item of products) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new Error(`Product not found: ${item.product}`);
      if (item.quantity <= 0) throw new Error(`Invalid quantity for ${product.name}`);
      if (product.quantity < item.quantity) throw new Error(`Not enough stock for ${product.name}`);

      const priceAtSale = product.price;
      const discount = item.discount || 0;
      const discountAmount = (discount / 100) * priceAtSale;

      processedItems.push({
        product: item.product,
        quantity: item.quantity,
        priceAtSale,
        discount,
        discountAmount
      });

      totalAmount += (priceAtSale - discountAmount) * item.quantity;
    }

    // Deduct stock
    for (const item of products) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: -item.quantity } },
        { session }
      );
    }

    // Save sale ONLY
    const sale = new Sale({ customer, products: processedItems, totalAmount });
    const savedSale = await sale.save({ session });

    await session.commitTransaction();

    // Return the saved sale. Ledger is NOT touched here.
    res.status(201).json(savedSale);

  } catch (err) {
    if (session) await session.abortTransaction();
    console.error('Error in recordSale:', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  } finally {
    if (session) session.endSession();
  }
};
