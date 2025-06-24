const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true
   },
  quantity: { 
    type: Number, 
    required: true
   },
  price: {
     type: Number,
      required: true
     },
  barcode: { 
    type: String
  },
  weight: { type: String }, // ✅ added this line
  expiryDate: { 
    type: Date 
  },
  manufacturingDate: { 
    type: Date
   }
}, { timestamps: true });

// Auto-generate barcode based on _id after save
productSchema.post('save', async function(doc, next) {
  if (!doc.barcode) {
    doc.barcode = doc._id.toString();
    await doc.save();
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
