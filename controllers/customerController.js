const getDbForUser = require('../utils/getDbForUser');
const customerSchema = require('../models/Customer'); // 

exports.getCustomers = async (req, res) => {
  try {
    const db = getDbForUser(req.user);
const Customer = db.models.Customer || db.model('Customer', customerSchema);
    const customers = await Customer.find();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.addCustomer = async (req, res) => {
  try {
    const db = getDbForUser(req.user);
const Customer = db.models.Customer || db.model('Customer', customerSchema);
    const customer = new Customer(req.body);
    const saved = await customer.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const db = getDbForUser(req.user);
const Customer = db.models.Customer || db.model('Customer', customerSchema);
    const updated = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


exports.deleteCustomer = async (req, res) => {
  try {
    const db = getDbForUser(req.user);
const Customer = db.models.Customer || db.model('Customer', customerSchema);
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

