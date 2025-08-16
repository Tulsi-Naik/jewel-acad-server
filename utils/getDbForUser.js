const mongoose = require('mongoose');

const connections = {}; // cache connections

const getDbForUser = (user) => {
  if (!user || !user.dbName) throw new Error('User DB name not found in token');

  const dbName = user.dbName;

  // Return cached connection if exists
  if (connections[dbName]) return connections[dbName];

  console.log(`🔌 Connecting to DB: ${dbName}`);

  // Create new connection (synchronous style)
  const conn = mongoose.createConnection(process.env.MONGO_URI, {
    dbName,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  conn.on('error', (err) => console.error(`MongoDB connection error for ${dbName}:`, err));
  conn.once('open', () => console.log(`✅ Connected to DB: ${dbName}`));

  connections[dbName] = conn;
  return conn;
};

module.exports = getDbForUser;
