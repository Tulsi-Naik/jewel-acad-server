const bcrypt = require('bcrypt');

const plainPassword = 'vendor123';

bcrypt.hash(plainPassword, 10).then(hash => {
  console.log('Hashed password:', hash);
});
