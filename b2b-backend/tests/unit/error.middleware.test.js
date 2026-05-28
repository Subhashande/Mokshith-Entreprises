import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { errorHandler } from '../../src/middlewares/error.middleware.js';
import AppError from '../../src/errors/AppError.js';

jest.mock('../../src/config/logger.js', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Error Middleware - Unit Tests', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let originalEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env.NODE_ENV;

    mockReq = {
      originalUrl: '/api/test',
      method: 'POST',
      ip: '127.0.0.1',
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  describe('AppError Handling', () => {
    it('should handle AppError with custom status code and message', () => {
      const error = new AppError('Custom error message', 400);

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Custom error message',
          error: expect.objectContaining({
            statusCode: 400,
            path: '/api/test',
          }),
        })
      );
    });

    it('should handle AppError 404 not found', () => {
      const error = new AppError('Resource not found', 404);

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Resource not found',
        })
      );
    });

    it('should handle AppError 401 unauthorized', () => {
      const error = new AppError('Unauthorized access', 401);

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Unauthorized access',
        })
      );
    });

    it('should handle AppError 403 forbidden', () => {
      const error = new AppError('Access forbidden', 403);

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should include timestamp in error response', () => {
      const error = new AppError('Test error', 400);
      const beforeTime = new Date();

      errorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      const timestamp = new Date(response.error.timestamp);
      const afterTime = new Date();

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Mongoose Errors', () => {
    it('should handle Mongoose CastError (invalid ObjectId)', () => {
      const error = new Error('Cast to ObjectId failed');
      error.name = 'CastError';
      error.path = 'userId';
      error.value = 'invalid-id';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid userId: invalid-id',
          error: expect.objectContaining({
            code: 'INVALID_ID',
          }),
        })
      );
    });

    it('should handle Mongoose duplicate key error (code 11000)', () => {
      const error = new Error('Duplicate key error');
      error.code = 11000;
      error.keyValue = { email: 'test@example.com' };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Duplicate value for field: email',
          error: expect.objectContaining({
            code: 'DUPLICATE_ENTRY',
          }),
        })
      );
    });

    it('should handle Mongoose ValidationError', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        name: { message: 'Name is required' },
        email: { message: 'Email must be valid' },
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Name is required, Email must be valid',
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });
  });

  describe('JWT Errors', () => {
    it('should handle JsonWebTokenError', () => {
      const error = new Error('jwt malformed');
      error.name = 'JsonWebTokenError';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid token. Please log in again.',
          error: expect.objectContaining({
            code: 'AUTH_ERROR',
          }),
        })
      );
    });

    it('should handle TokenExpiredError', () => {
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Your token has expired. Please log in again.',
          error: expect.objectContaining({
            code: 'AUTH_ERROR',
          }),
        })
      );
    });
  });

  describe('Multer File Upload Errors', () => {
    it('should handle LIMIT_FILE_SIZE error', () => {
      const error = new Error('File too large');
      error.name = 'MulterError';
      error.code = 'LIMIT_FILE_SIZE';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'File size too large',
          error: expect.objectContaining({
            code: 'FILE_UPLOAD_ERROR',
          }),
        })
      );
    });

    it('should handle LIMIT_UNEXPECTED_FILE error', () => {
      const error = new Error('Unexpected field');
      error.name = 'MulterError';
      error.code = 'LIMIT_UNEXPECTED_FILE';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Unexpected file field',
        })
      );
    });

    it('should handle generic MulterError', () => {
      const error = new Error('Upload failed');
      error.name = 'MulterError';
      error.code = 'UNKNOWN_ERROR';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'File upload error',
        })
      );
    });
  });

  describe('Production vs Development Mode', () => {
    it('should hide internal error details in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Internal database error');
      error.statusCode = 500;

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Internal server error',
        })
      );
    });

    it('should show error details in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new AppError('Detailed error message', 400);

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Detailed error message',
        })
      );
    });

    it('should include validation details in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        name: { message: 'Name is required', path: 'name' },
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error.details).toBeDefined();
      expect(response.error.details).toEqual(error.errors);
    });

    it('should NOT include validation details in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        name: { message: 'Name is required', path: 'name' },
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error.details).toBeUndefined();
    });
  });

  describe('Default Error Handling', () => {
    it('should default to 500 status code for unknown errors', () => {
      const error = new Error('Unknown error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle errors without statusCode property', () => {
      const error = new Error('Generic error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            statusCode: 500,
          }),
        })
      );
    });

    it('should handle errors without message property', () => {
      const error = {};

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });
  });

  describe('Response Format', () => {
    it('should include success: false in all error responses', () => {
      const error = new AppError('Test error', 400);

      errorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(false);
    });

    it('should include data: null in error responses', () => {
      const error = new AppError('Test error', 400);

      errorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data).toBeNull();
    });

    it('should include request path in error response', () => {
      const error = new AppError('Test error', 400);
      mockReq.originalUrl = '/api/products/123';

      errorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error.path).toBe('/api/products/123');
    });

    it('should include timestamp in error response', () => {
      const error = new AppError('Test error', 400);

      errorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error.timestamp).toBeDefined();
      expect(typeof response.error.timestamp).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null error object', () => {
      errorHandler(null, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle undefined error object', () => {
      errorHandler(undefined, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle error with custom properties', () => {
      const error = new AppError('Custom error', 400);
      error.customProperty = 'custom value';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      // Custom properties should not leak into response
    });

    it('should handle very long error messages', () => {
      const longMessage = 'Error '.repeat(1000);
      const error = new AppError(longMessage, 400);

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: longMessage,
        })
      );
    });
  });
});
