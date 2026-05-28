const { adaptSql } = require('./src/config/sqlCompat');
const sql = 'INSERT INTO cities (state_id, name, is_active) VALUES ?';
console.log(adaptSql(sql, [[ [1, 'CityA', 1], [1, 'CityB', 1] ]]));
