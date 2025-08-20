// models/LedgerSchema.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  method: { type: String, default: 'cash' },
  date: { type: Date, default: Date.now }
});

const ledgerSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true, default: 1 },
      price: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      total: { type: Number, required: true }
    }
  ],
  sales: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sale' }],
  total: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['Paid', 'Partial', 'Unpaid'], default: 'Unpaid' },
  payments: [paymentSchema]
}, { timestamps: true });

// Pre-save hook
ledgerSchema.pre('save', function(next) {
  this.remainingAmount = this.total - this.paidAmount;
  if (this.paidAmount <= 0) this.status = 'Unpaid';
  else if (this.paidAmount < this.total) this.status = 'Partial';
  else {
    this.status = 'Paid';
    this.remainingAmount = 0;
  }
  next();
});

module.exports = ledgerSchema; // 
