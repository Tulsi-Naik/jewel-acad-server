// models/Sale.js
const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      //for top product report page
       priceAtSale: { type: Number },
      discount: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 }
    }
  ],
  totalAmount: { type: Number, required: true }
}, { timestamps: true });

module.exports = { schema: saleSchema }; // 
