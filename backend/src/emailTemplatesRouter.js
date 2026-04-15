const express = require('express');
const { pool } = require('./config/database');
const router = express.Router();
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM email_templates ORDER BY event_key');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});
module.exports = router;
