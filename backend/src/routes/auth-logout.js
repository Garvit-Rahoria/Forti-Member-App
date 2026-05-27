const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');
const jwt = require('jsonwebtoken');

const router = express.Router();

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return fail(res, 'No token provided', 400);
  }
  
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return fail(res, 'Invalid token format', 400);
    }
    
    const expiresAt = new Date(decoded.exp * 1000);
    
    // Insert token into blacklist
    await pool.query(
      'INSERT INTO token_blacklist (token, expires_at) VALUES (?, ?) ON CONFLICT DO NOTHING',
      [token, expiresAt]
    );
    
    return ok(res, {}, 'Logged out successfully');
  } catch (err) {
    console.error('[auth/logout] error:', err.message);
    return fail(res, 'Server error during logout', 500);
  }
});

// GET /api/auth/me (from existing code logic if moved here, otherwise omit)
// Wait, looking at frontend AuthContext, it calls /api/auth/me and /api/auth/login.
// Let's assume /api/auth already exists somewhere! Let me check before overriding it!
