import rateLimit from 'express-rate-limit';

//  SECURITY: Strict rate limiting in production
const isProduction = process.env.NODE_ENV === 'production';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 5000, // 100 req/15min in prod, 5000 in dev
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 payment requests per window
  message: {
    success: false,
    message: 'Too many payment attempts, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});