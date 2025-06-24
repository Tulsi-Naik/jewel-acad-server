const Sale = require('../models/Sale');
exports.recordSale = async (req, res) => {
  const session = await Product.startSession();
  session.startTransaction();
  try {
    const { customer, items } = req.body;
    if (!customer) {
      return res.status(400).json({ message: 'Customer is required.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'item is required.' });
    }
    let totalAmount = 0;
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        return res.status(400).json({ message: ` not found: ${item.product}` });
      }
      if (item.quantity <= 0) {
        return res.status(400).json({ message: `Invalid quantity  ${product?.name}` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({ message: `Not enough stock for ${product?.name}` });
      }
      totalAmount += product.price * item.quantity;
    }
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (product) {
        await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } }).session(session);
      }
    }
    const sale = new Sale({ customer, items, totalAmount });
    const savedSale = await sale.save({ session });
    await session.commitTransaction();
    res.status(201).json(savedSale);
  } catch (err) {
    await session.abortTransaction();
    console.error('Error in recordSale:', err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    // End the session
    session.endSession();
  }
};
