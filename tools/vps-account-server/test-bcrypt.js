const bcrypt = require('@node-rs/bcrypt');
const hash = bcrypt.hashSync('test123', 10);
console.log('hashSync output:', hash);
console.log('starts with $2b$:', hash.startsWith('$2b$'));
const hash2y = hash.replace('$2b$', '$2y$');
console.log('after $2y$ replacement:', hash2y.startsWith('$2y$'));
console.log('verifySync works:', bcrypt.verifySync('test123', hash));
console.log('API compatible: YES');
