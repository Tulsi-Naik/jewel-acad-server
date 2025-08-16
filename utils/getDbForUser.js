const mongoose = require('mongoose');

const connections = {}; // 

const getDbForUser = async (user) => {
  if (!user || !user.dbName) throw new Error('User DB name not found in token');

  const dbName = user.dbName;

  if (connections[dbName]) return connections[dbName];

  console.log(`🔌 Connecting to DB: ${dbName}`);

  const conn = mongoose.createConnection(process.env.MONGO_URI, {
    dbName,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await new Promise((resolve, reject) => {
    conn.once('open', resolve);
    conn.on('error', reject);
  });

  connections[dbName] = conn;
  return conn;
};


module.exports = getDbForUser;
