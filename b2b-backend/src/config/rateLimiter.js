import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000, // Increased for development
  message: {
    success: false,
    message: 'Too many requests, try again later',
  },
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