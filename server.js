const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();

//  Trust proxy for secure cookies if used (important on Render)
app.set('trust proxy', 1);

//  Allowed Frontend Origins
const allowedOrigins = ['https://jewelbook.vercel.app'];

//  CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

//  Apply CORS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // For preflight requests

//  JSON Body Parser
app.use(express.json());

//  MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MongoDB URI is not defined in .env');
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB connected');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

//  Middlewares
const authenticateToken = require('./middleware/authMiddleware');
const requireAuth = authenticateToken; // same file reused

//  Protected Routes
app.use('/api/customers', authenticateToken, require('./routes/customerRoutes'));
app.use('/api/sales', authenticateToken, require('./routes/salesRoutes'));
app.use('/api/products', authenticateToken, require('./routes/productRoutes'));
app.use('/api/ledger', authenticateToken, require('./routes/ledgerRoutes'));
app.use('/api/reports', authenticateToken, require('./routes/reportRoutes'));
app.use('/api/admin', requireAuth, require('./routes/adminRoutes'));

//  Public Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));


//  Catch-All for Undefined Routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

//  Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
