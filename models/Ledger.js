const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
  ],
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
  }
}, { timestamps: true });

module.exports = mongoose.model('Ledger', ledgerSchema);

