//controllers/salesController.js
const getDbForUser = require('../utils/getDbForUser');
const saleSchema = require('../models/Sale');
const productSchema = require('../models/Product');
const ledgerSchema = require('../models/LedgerSchema');

exports.recordSale = async (req, res) => {
  let session;
  try {
    const db = getDbForUser(req.user);

    const Sale = db.models.Sale || db.model('Sale', saleSchema);
    const Product = db.models.Product || db.model('Product', productSchema);
    const Ledger = db.models.Ledger || db.model('Ledger', ledgerSchema);

    session = await db.startSession();
    session.startTransaction();

const { customer, products } = req.body;

    if (!customer) return res.status(400).json({ message: 'Customer is required.' });
if (!Array.isArray(products) || products.length === 0)
  return res.status(400).json({ message: 'Products are required.' });

    let totalAmount = 0;
    const processedItems = [];

    // Validate products & calculate total with priceAtSale
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

    // Save sale with enriched items
const sale = new Sale({ customer, products: processedItems, totalAmount });
    const savedSale = await sale.save({ session });

    // Sync ledger
    let ledger = await Ledger.findOne({ customer }).session(session);
   const ledgerProducts = processedItems
  .filter(i => i.product && i.quantity > 0)         // remove invalid items
  .map(i => {
    const price = Number(i.priceAtSale || 0);      // ensure number
    const discountAmount = Number(i.discountAmount || 0);
    const total = (price - discountAmount) * i.quantity;

    return {
      product: i.product,
      quantity: i.quantity,
      price,
      discount: Number(i.discount || 0),
      total
    };
  });



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
