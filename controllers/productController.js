const getDbForUser = require('../utils/getDbForUser');
const productSchema = require('../models/Product').schema;

exports.getProducts = async (req, res) => {
  try {
    const db = getDbForUser(req.user);
    const Product = db.model('Product', productSchema);
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getProductByBarcode = async (req, res) => {
  try {
    const db = getDbForUser(req.user);
    const Product = db.model('Product', productSchema);
    const product = await Product.findOne({ barcode: req.params.barcode });
    if (!product) return res.status(404).json({ message: 'not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const db = getDbForUser(req.user);
    const Product = db.model('Product', productSchema);
    const product = new Product(req.body);
    const saved = await product.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(400).json({ message: err.message, errors: err.errors });
  }
};

exports.updateStock = async (req, res) => {
  try {
const db = getDbForUser(req.user);
const Product = db.model('Product', productSchema);
const product = await Product.findById(req.params.id);
    product.quantity += Number(req.body.quantity);
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
exports.stockIn = async (req, res) => {
  try {
const db = getDbForUser(req.user);
const Product = db.model('Product', productSchema);
const product = await Product.findById(req.params.id);
    product.quantity += req.body.amount; 
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
exports.stockOut = async (req, res) => {
  try {
const db = getDbForUser(req.user);
const Product = db.model('Product', productSchema);
const product = await Product.findById(req.params.id);
    product.quantity -= req.body.amount; 
    if (product.quantity < 0) {
      return res.status(400).json({ message: 'Not enough stock available' });
    }
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
exports.updateProduct = async (req, res) => {
  try {
const db = getDbForUser(req.user);
const Product = db.model('Product', productSchema);
const product = await Product.findById(req.params.id);
    if (product) {
      product.name = req.body.name ?? product.name;
      product.quantity = req.body.quantity ?? product.quantity;
      product.price = req.body.price ?? product.price;
      await product.save();
      res.json(product);
    } else {
      res.status(404).json({ message: 'not found' });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
const db = getDbForUser(req.user);
const Product = db.model('Product', productSchema);
const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "not found" });
    }
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting product", error: err.message });
  }
};
