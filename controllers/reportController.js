const Sale = require('../models/Sale');
const Product = require('../models/Product');

exports.getDailyReport = async (req, res) => {
  try {
    const sales = await Sale.find().populate('items.product');
    if (!sales.length) {
      return res.status(404).json({ message: 'No sales data found' });
    }
    const daily = {};
    sales.forEach(sale => {
const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC + 5.5 hrs
const istDate = new Date(new Date(sale.createdAt).getTime() + istOffset)
  .toISOString()
  .split('T')[0];
      const total = sale.items.reduce((sum, item) => {
        if (item.product && item.product.price) {
          return sum + item.product.price * item.quantity;
        }
        return sum;
      }, 0);

daily[istDate] = (daily[istDate] || 0) + total;
    });
    const result = Object.entries(daily).map(([date, total]) => ({
      date,
      total: total.toFixed(2), 
    }));
    res.json(result);
  } catch (err) {
    console.error('Error fetching daily report:', err);
    res.status(500).json({ message: 'Error fetching daily report', error: err.message });
  }
};
exports.getMonthlyReport = async (req, res) => {
  try {
    const sales = await Sale.find().populate('items.product');  
    if (!sales.length) {
      return res.status(404).json({ message: 'Nodata found' });
    }
    const monthly = {};
    sales.forEach(sale => {
const istOffset = 5.5 * 60 * 60 * 1000;
const istMonth = new Date(new Date(sale.createdAt).getTime() + istOffset)
  .toISOString()
  .slice(0, 7);
      const total = sale.items.reduce((sum, item) => {
        if (item.product && item.product.price) {
          return sum + item.product.price * item.quantity;
        }
        return sum;
      }, 0);
monthly[istMonth] = (monthly[istMonth] || 0) + total;
    });
    const result = Object.entries(monthly).map(([month, total]) => ({
      month,
      total: total.toFixed(2), 
    }));
    res.json(result);
  } catch (err) {
    console.error('Error fetching monthly report:', err);
    res.status(500).json({ message: 'Error fetching monthly report', error: err.message });
  }
};
