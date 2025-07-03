const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      discount: {
        type: Number,
        default: 0 // percentage
      },
      discountAmount: {
        type: Number,
        default: 0 // fixed ₹
      }
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);
