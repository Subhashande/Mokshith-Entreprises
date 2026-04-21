import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000, // Increased for development
  message: {
    success: false,
    message: 'Too many requests, try again later',
  },
});