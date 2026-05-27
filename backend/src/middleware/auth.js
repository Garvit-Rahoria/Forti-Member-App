const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Exiting.');
  process.exit(1);
}

// Verify JWT token and attach user to request
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.slice(7);
  try {
    // Check if token is blacklisted
    const [blRows] = await pool.query('SELECT token FROM token_blacklist WHERE token = ? LIMIT 1', [token]);
    if (blRows.length > 0) {
      return res.status(401).json({ success: false, message: 'Token has been revoked. Please log in again.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query(
      'SELECT id, uuid, full_name, email, role, assigned_state_id, assigned_country_id, is_active FROM portal_admin_users WHERE id = ? AND is_active = 1',
      [decoded.id]
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    console.error('[authMiddleware] ERROR:', err.message, '| name:', err.name, '| code:', err.code)
    const msg = err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError'
      ? 'Invalid or expired token'
      : `Auth error: ${err.message}`
    return res.status(401).json({ success: false, message: msg })
  }
}

// Require a specific role (or super_admin always passes)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthenticated' });
    if (req.user.role === 'super_admin' || roles.includes(req.user.role)) return next();
    return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
  };
}

module.exports = { authMiddleware, requireRole, JWT_SECRET };
