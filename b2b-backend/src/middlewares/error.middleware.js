import { logger } from '../config/logger.js';
import AppError from '../errors/AppError.js';

export const errorHandler = (err, req, res, next) => {
  // Guard against null/undefined errors reaching the handler
  err = err || {};
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // 🔥 Log for developers (sanitized in production)
  const logData = {
    message: err.message,
    statusCode: error.statusCode,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
  };

  // Only include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    logData.stack = err.stack;
  }

  // Log based on severity
  if (error.statusCode >= 500) {
    logger.error(logData);
  } else if (error.statusCode >= 400) {
    logger.warn(logData);
  }

  // 🔥 Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new AppError(message, 400);
  }

  // 🔥 Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate value for field: ${field}`;
    error = new AppError(message, 400);
  }

  // 🔥 Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message).join(', ');
    error = new AppError(message, 400);
  }

  // 🔥 JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token. Please log in again.', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Your token has expired. Please log in again.', 401);
  }

  // 🔥 Multer file upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = new AppError('File size too large', 400);
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      error = new AppError('Unexpected file field', 400);
    } else {
      error = new AppError('File upload error', 400);
    }
  }

  const statusCode = error.statusCode || 500;

  // Don't expose internal error details in production
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error.message || 'Server Error';

  // 🔥 Enhanced error response for better frontend integration
  const errorResponse = {
    success: false,
    message,
    error: {
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    },
    data: null,
  };

  // Include error code for specific error types (useful for frontend)
  if (err.name === 'ValidationError') {
    errorResponse.error.code = 'VALIDATION_ERROR';
  } else if (err.name === 'CastError') {
    errorResponse.error.code = 'INVALID_ID';
  } else if (err.code === 11000) {
    errorResponse.error.code = 'DUPLICATE_ENTRY';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    errorResponse.error.code = 'AUTH_ERROR';
  } else if (err.name === 'MulterError') {
    errorResponse.error.code = 'FILE_UPLOAD_ERROR';
  }

  // Add validation details for frontend (development only)
  if (process.env.NODE_ENV === 'development' && err.name === 'ValidationError') {
    errorResponse.error.details = err.errors;
  }

  res.status(statusCode).json(errorResponse);
};