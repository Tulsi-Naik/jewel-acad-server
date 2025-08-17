// server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();

// Trust proxy for secure cookies (Render)
app.set('trust proxy', 1);

// Allowed frontend origins
const allowedOrigins = ['https://jewelbook.vercel.app', 'http://localhost:3000'];

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Apply CORS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight

// JSON parser
app.use(express.json());

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MongoDB URI is not defined in .env');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Middlewares
const authenticateToken = require('./middleware/authMiddleware');

// Protected Routes
app.use('/api/customers', authenticateToken, require('./routes/customerRoutes'));
app.use('/api/sales', authenticateToken, require('./routes/salesRoutes'));
app.use('/api/products', authenticateToken, require('./routes/productRoutes'));
app.use('/api/ledger', authenticateToken, require('./routes/ledgerRoutes'));
app.use('/api/reports', authenticateToken, require('./routes/reportRoutes'));
app.use('/api/admin', authenticateToken, require('./routes/adminRoutes'));


// Public Routes (auth) with explicit CORS
const authRoutes = require('./routes/authRoutes');
app.options('/api/auth/*', cors(corsOptions)); // handle preflight
app.use('/api/auth', cors(corsOptions), authRoutes);
app.use('/api/applications', require('./routes/applicationRoutes'));

// Catch-all
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
