//controllers/reportController.js
const getDbForUser = require('../utils/getDbForUser');
const saleSchema = require('../models/Sale');

// Daily report: [{ date: "yyyy-MM-dd", total: "123.45" }]
exports.getDailyReport = async (req, res) => {
  try {
    const db = await getDbForUser(req.user);
    const Sale = db.models.Sale || db.model('Sale', saleSchema);

    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ message: 'Start and end date are required.' });
    }

    // Build IST-aligned UTC boundaries
    const startIST = new Date(`${start}T00:00:00+05:30`);
    const endIST = new Date(`${end}T23:59:59.999+05:30`);
    const startUTC = new Date(startIST.toISOString());
    const endUTC = new Date(endIST.toISOString());

    const rows = await Sale.aggregate([
      { $match: { createdAt: { $gte: startUTC, $lte: endUTC } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "Asia/Kolkata"
            }
          },
          total: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", total: { $round: ["$total", 2] } } }
    ]);

    // keep output identical to your UI (string totals)
    const data = rows.map(r => ({ date: r.date, total: r.total.toFixed(2) }));
    res.json(data);
  } catch (err) {
    console.error('Daily report error:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Monthly report: [{ month: "yyyy-MM", total: "123.45" }]
exports.getMonthlyReport = async (req, res) => {
  try {
    const db = await getDbForUser(req.user);
    const Sale = db.models.Sale || db.model('Sale', saleSchema);

    const { month } = req.query; // optional "yyyy-MM"
    let matchStage = {};

    if (month) {
      // Boundaries for the specific IST month
      const [yStr, mStr] = month.split('-');
      const year = Number(yStr);
      const monthIdx = Number(mStr) - 1; // JS months 0–11
      const startIST = new Date(Date.UTC(year, monthIdx, 1, -5, -30)); // 00:00 IST
      const nextMonth = monthIdx === 11 ? { y: year + 1, m: 0 } : { y: year, m: monthIdx + 1 };
      const nextStartIST = new Date(Date.UTC(nextMonth.y, nextMonth.m, 1, -5, -30)); // next month 00:00 IST
      const startUTC = new Date(startIST.toISOString());
      const endUTC = new Date(nextStartIST.toISOString());
      matchStage = { createdAt: { $gte: startUTC, $lt: endUTC } };
    }

    const rows = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m",
              date: "$createdAt",
              timezone: "Asia/Kolkata"
            }
          },
          total: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, month: "$_id", total: { $round: ["$total", 2] } } }
    ]);

    const data = rows.map(r => ({ month: r.month, total: r.total.toFixed(2) }));
    res.json(data);
  } catch (err) {
    console.error('Monthly report error:', err);
    res.status(500).json({ message: 'Error fetching monthly report', error: err.message });
  }
};//
// get top products
exports.getTopProducts = async (req, res) => {
  try {
    const db = await getDbForUser(req.user); 
    const Sale = db.models.Sale;

    const topProducts = await Sale.aggregate([
      { $unwind: "$items" },
      {
  $group: {
    _id: "$items.product",
    quantity: { $sum: "$items.quantity" },
    revenue: {
      $sum: {
        $subtract: [
          { $multiply: ["$items.quantity", "$items.priceAtSale"] },
          "$items.discountAmount"
        ]
      }
    }
  }
}
,
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: 0,
          productName: "$product.name",
          quantity: 1,
          revenue: { $round: ["$revenue", 2] }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    res.json(topProducts);
  } catch (err) {
    console.error("Top products error:", err);
    res.status(500).json({ error: "Failed to fetch top products" });
  }
};
