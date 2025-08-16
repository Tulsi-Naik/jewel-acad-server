// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  barcode: { type: String },
  weight: { type: String },
  expiryDate: { type: Date },
  manufacturingDate: { type: Date }
}, { timestamps: true });

productSchema.post('save', async function(doc, next) {
  if (!doc.barcode) {
    doc.barcode = doc._id.toString();
    await doc.save();
  }
  next();
});

module.exports = productSchema;  // ⚠️ Export schema only, not the model
