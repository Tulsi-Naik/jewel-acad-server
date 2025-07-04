const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log('🔐 Incoming auth header:', authHeader); // ← Add this

  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.warn('⛔ No token provided');
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('❌ Token verification failed:', err.message);
      return res.status(403).json({ message: 'Invalid token.' });
    }

    console.log('✅ Decoded token:', user); // ← Add this
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
