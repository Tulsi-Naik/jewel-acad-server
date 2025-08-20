// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: "" }, // Ring, Necklace, etc.
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  barcode: { type: String },
  weight: { type: Number, default: 0 }, // weight in grams
  gst: { type: Number, default: 3 }     // GST percentage
}, { timestamps: true });

productSchema.post('save', async function(doc, next) {
  if (!doc.barcode) {
    doc.barcode = doc._id.toString();
    await doc.save();
  }
  next();
});

module.exports = productSchema;

