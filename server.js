const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const app = express();

const cors = require('cors');
const authenticateToken = require('./middleware/authMiddleware');
const requireAuth = require('./middleware/authMiddleware');

app.use(cors({
  origin: 'https://jewellery-hub-two.vercel.app',
  credentials: true
}));


app.use(express.json());
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MongoDB URI is not defined');
  process.exit(1);
}
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,//
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});


app.use('/api/customers', authenticateToken, require('./routes/customerRoutes'));
app.use('/api/sales', authenticateToken, require('./routes/salesRoutes'));
app.use('/api/products', authenticateToken, require('./routes/productRoutes'));
app.use('/api/ledger', authenticateToken, require('./routes/ledgerRoutes'));
app.use('/api/reports', authenticateToken, require('./routes/reportRoutes'));



app.use('/api/auth', require('./routes/authRoutes'));

app.use('/api/admin', requireAuth, require('./routes/adminRoutes'));


app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server running on ${PORT}`);
});


