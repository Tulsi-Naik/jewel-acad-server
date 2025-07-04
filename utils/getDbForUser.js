const mongoose = require('mongoose');

const connections = {}; // Cache for DB connections

const getDbForUser = (user) => {
  if (!user || !user.dbName) {
    throw new Error('User DB name not found in token');
  }

  const dbName = user.dbName;

  if (connections[dbName]) {
    return connections[dbName];
  }

  const conn = mongoose.createConnection(process.env.MONGO_URI, {
    dbName,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  connections[dbName] = conn;
  return conn;
};

module.exports = getDbForUser;
