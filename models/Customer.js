const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: String, 
  address: String,
  contact: String,
});

module.exports = customerSchema;
