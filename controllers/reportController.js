const getDbForUser = require('../utils/getDbForUser');
const { schema: saleSchema } = require('../models/Sale');

const IST_OFFSET = 5.5 * 60 * 60 * 1000; // 5.5 hours in ms

exports.getDailyReport = async (req, res) => {
  try {
    const db = getDbForUser(req.user);
    const Sale = db.models.Sale || db.model('Sale', saleSchema); // ✅ only create if not exists

    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ message: 'Start and end date are required.' });

    const startDateIST = new Date(`${start}T00:00:00`);
    const endDateIST = new Date(`${end}T23:59:59`);
    const startUTC = new Date(startDateIST.getTime() - IST_OFFSET);
    const endUTC = new Date(endDateIST.getTime() - IST_OFFSET);

    const sales = await Sale.find({
      createdAt: { $gte: startUTC, $lte: endUTC },
    }).populate('items.product');

    const daily = {};

    sales.forEach(sale => {
      const istTime = new Date(sale.createdAt.getTime() + IST_OFFSET);
      const dateStr = istTime.toISOString().slice(0, 10); // yyyy-MM-dd
      const total = sale.items.reduce((sum, item) => sum + ((item.product?.price || 0) * item.quantity), 0);
      daily[dateStr] = (daily[dateStr] || 0) + total;
    });

    res.json(Object.entries(daily).map(([date, total]) => ({ date, total: total.toFixed(2) })));
  } catch (err) {
    console.error('Daily report error:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

exports.getMonthlyReport = async (req, res) => {
  try {
    const db = getDbForUser(req.user);
    const Sale = db.models.Sale || db.model('Sale', saleSchema);

    const { month } = req.query; // yyyy-MM
    const sales = await Sale.find().populate('items.product');

    const monthly = {};
    sales.forEach(sale => {
      const istMonth = new Date(sale.createdAt.getTime() + IST_OFFSET)
        .toISOString()
        .slice(0, 7); // yyyy-MM
      const total = sale.items.reduce((sum, item) => sum + ((item.product?.price || 0) * item.quantity), 0);
      monthly[istMonth] = (monthly[istMonth] || 0) + total;
    });

    let result = Object.entries(monthly).map(([m, total]) => ({ month: m, total: total.toFixed(2) }));
    if (month) result = result.filter(r => r.month === month);

    res.json(result);
  } catch (err) {
    console.error('Monthly report error:', err);
    res.status(500).json({ message: 'Error fetching monthly report', error: err.message });
  }
};
