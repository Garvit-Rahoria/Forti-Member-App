const rateLimit = require('express-rate-limit');

const isDevelopment = process.env.NODE_ENV === 'development';

function isPublicThrottledRoute(req) {
  const url = req.originalUrl || req.url || '';
  return url.startsWith('/api/auth')
    || url.startsWith('/api/otp')
    || url.startsWith('/api/locations')
    || url.startsWith('/api/membership')
    || url.startsWith('/api/status');
}

// General API rate limiter: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isPublicThrottledRoute(req),
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

// Strict limiter for admin login: counts only failed attempts.
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isDevelopment ? 100 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

// Forgot password should be protected, but separate from login attempts.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 20 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many reset requests. Please try again later.' },
});

// OTP limiter: 20 OTP requests per 10 minutes per IP
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isDevelopment ? 100 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests. Please try again later.' },
});

// Upload limiter: 20 uploads per 15 minutes
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many uploads. Please try again later.' },
});

module.exports = { apiLimiter, loginLimiter, forgotPasswordLimiter, otpLimiter, uploadLimiter };
