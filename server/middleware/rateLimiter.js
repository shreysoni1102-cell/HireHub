import rateLimit from 'express-rate-limit';

/**
 * Strict limiter for authentication routes — prevents brute-force attacks.
 * Allows 10 attempts per IP every 15 minutes.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,   // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
  },
});

/**
 * General API limiter — prevents spam/abuse on public endpoints.
 * Allows 100 requests per IP every 15 minutes.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
});
