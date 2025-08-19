//controllers/reportController.js
const getDbForUser = require('../utils/getDbForUser');
const saleSchema = require('../models/Sale');
const Product = require('../models/Product');
const Ledger = require('../models/LedgerSchema');
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
   const Sale = db.models.Sale || db.model('Sale', saleSchema);


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
// get slow products
exports.getSlowProducts = async (req, res) => {
  try {
    const db = await getDbForUser(req.user);
    const Sale = db.models.Sale || db.model('Sale', saleSchema);
    const Product = db.models.Product || db.model('Product', require('../models/Product'));

    const { start, end, limit = 10 } = req.query;
    if (!start || !end) {
      return res.status(400).json({ message: 'Start and end date are required.' });
    }

    const startDate = new Date(`${start}T00:00:00+05:30`);
    const endDate = new Date(`${end}T23:59:59.999+05:30`);

    // Aggregate sold quantity per product
    const salesAgg = await Sale.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          soldQty: { $sum: "$items.quantity" }
        }
      }
    ]);

    const soldMap = new Map();
    salesAgg.forEach(p => soldMap.set(p._id.toString(), p.soldQty));

    // Fetch all products
    const allProducts = await Product.find();

    // Filter slow products
    const slowProducts = allProducts
      .filter(p => !soldMap.has(p._id.toString()) || soldMap.get(p._id.toString()) < 2)
      .slice(0, limit)
      .map(p => ({ productName: p.name }));

    res.json(slowProducts);

  } catch (err) {
    console.error("Slow products error:", err);
    res.status(500).json({ error: "Failed to fetch slow products" });
  }
};
exports.getCustomerReport = async (req, res) => {
  try {
    const db = await getDbForUser(req.user);
    const Sale = db.models.Sale || db.model('Sale', require('../models/Sale'));
    const Customer = db.models.Customer || db.model('Customer', require('../models/Customer'));

    const report = await Sale.aggregate([
      { $group: {
          _id: "$customer",
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
          lastPurchase: { $max: "$createdAt" }
      }},
      { $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customer"
      }},
      { $unwind: "$customer" },
      { $project: {
          _id: 1,
          name: "$customer.name",
          contact: "$customer.contact",
          totalOrders: 1,
          totalAmount: 1,
          lastPurchase: 1
      }}
    ]);

    res.json(report);
  } catch (err) {
    console.error("Customer report error:", err);
    res.status(500).json({ error: "Failed to fetch customer report" });
  }
};


exports.getStockReport = async (req, res) => {
  try {
    const db = await getDbForUser(req.user); // ensures vendor-specific DB
    const ProductModel = db.models.Product || db.model('Product', Product);

    const products = await ProductModel.find();

    const data = products.map(p => ({
      name: p.name,
      quantity: p.quantity,
      price: p.price,
      totalValue: p.quantity * p.price
    }));

    res.json(data);

  } catch (err) {
    console.error('Stock report error:', err);
    res.status(500).json({ error: 'Failed to fetch stock report' });
  }
};

exports.getOutstandingLedger = async (req, res) => {
  try {
    const db = await getDbForUser(req.user); // vendor-specific DB
    const LedgerModel = db.models.Ledger || db.model('Ledger', Ledger);

    // Only include Partial or Unpaid ledgers
    const ledgers = await LedgerModel.find({ status: { $in: ['Partial', 'Unpaid'] } })
      .populate('customer', 'name contact') // get customer info
      .populate('products.product', 'name'); // optional, product names

    const data = ledgers.map(l => ({
      invoiceId: l._id,
      customerName: l.customer.name,
      contact: l.customer.contact,
      totalAmount: l.total,
      paidAmount: l.paidAmount,
      remainingAmount: l.remainingAmount,
      status: l.status,
      date: l.createdAt.toISOString().split('T')[0]
    }));

    res.json(data);

  } catch (err) {
    console.error('Outstanding ledger error:', err);
    res.status(500).json({ error: 'Failed to fetch outstanding ledger' });
  }
};
