import { logger } from '../config/logger.js';

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // 🔥 Better logging (with context)
  logger.error({
    message: err.message,
    statusCode,
    path: req.originalUrl,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Something went wrong',
  });
};