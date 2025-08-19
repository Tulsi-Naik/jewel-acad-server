const mongoose = require('mongoose');
const { schema: saleSchema } = require('./models/Sale');
const { schema: productSchema } = require('./models/Product');
const getDbForUser = require('./utils/getDbForUser');

async function migrate() {
  try {
    // 1. Connect to your vendor's DB (adjust user if needed)
    const user = { role: 'maniratna', vendorId: 'vendor123' }; // use any valid vendor/admin user
    const db = await getDbForUser(user);

    const Sale = db.models.Sale || db.model('Sale', saleSchema);
    const Product = db.models.Product || db.model('Product', productSchema);

    // 2. Get all sales and populate product info
    const sales = await Sale.find().populate('items.product');

    for (let sale of sales) {
      let changed = false;

      for (let item of sale.items) {
        if (!item.priceAtSale && item.product && item.product.price) {
          item.priceAtSale = item.product.price; // fill priceAtSale
          changed = true;
        }
      }

      if (changed) {
        await sale.save();
        console.log(`Updated sale ${sale._id}`);
      }
    }

    console.log('✅ Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
