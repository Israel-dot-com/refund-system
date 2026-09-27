import rateLimit from 'express-rate-limit';

// General API rate limit — 100 req / 15 min per IP
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-IP refund submission rate limit — 5 req / hour
// (Using default IP key avoids the express-rate-limit IPv6 validation warning)
export const refundRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many refund requests. Please wait before submitting again.' },
  standardHeaders: true,
  legacyHeaders: false,
});
