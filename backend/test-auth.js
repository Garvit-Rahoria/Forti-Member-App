const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env' });
const token = jwt.sign({ id: 1, role: 'super_admin' }, process.env.JWT_SECRET);
console.log(token);
