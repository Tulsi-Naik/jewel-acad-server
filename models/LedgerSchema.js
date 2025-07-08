const mongoose = require('mongoose');

const freshLedgerSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
 products: [
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      default: 1
    }
  }
]
,
  sales: [{ 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  }],
  total: {
    type: Number,
    required: true
  },
  paid: {
    type: Boolean,
    default: false
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  paidAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = freshLedgerSchema; // ✅ new export name to bust cache
