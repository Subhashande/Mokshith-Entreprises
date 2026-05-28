import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { validate } from '../../src/middlewares/validate.middleware.js';
import Joi from 'joi';

jest.mock('../../src/config/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Validation Middleware - Unit Tests', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      query: {},
      params: {},
      path: '/api/test',
      method: 'POST',
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Successful Validation', () => {
    it('should pass validation with valid data', () => {
      const schema = Joi.object({
        body: Joi.object({
          name: Joi.string().required(),
          age: Joi.number().required(),
        }),
      });

      mockReq.body = { name: 'John', age: 30 };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should transform stringified boolean "true" to true', () => {
      const schema = Joi.object({
        body: Joi.object({
          isActive: Joi.boolean().required(),
        }),
      });

      mockReq.body = { isActive: 'true' };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body.isActive).toBe(true);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should transform stringified boolean "false" to false', () => {
      const schema = Joi.object({
        body: Joi.object({
          isActive: Joi.boolean().required(),
        }),
      });

      mockReq.body = { isActive: 'false' };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body.isActive).toBe(false);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should convert numeric strings to numbers', () => {
      const schema = Joi.object({
        body: Joi.object({
          quantity: Joi.number().required(),
          price: Joi.number().required(),
        }),
      });

      mockReq.body = { quantity: '10', price: '99.99' };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body.quantity).toBe(10);
      expect(mockReq.body.price).toBe(99.99);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should NOT convert ID fields to numbers', () => {
      const schema = Joi.object({
        body: Joi.object({
          userId: Joi.string().required(),
          productId: Joi.string().required(),
        }),
      });

      mockReq.body = { 
        userId: '507f1f77bcf86cd799439011',
        productId: '507f1f77bcf86cd799439012',
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(typeof mockReq.body.userId).toBe('string');
      expect(typeof mockReq.body.productId).toBe('string');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should NOT convert phone numbers to numbers', () => {
      const schema = Joi.object({
        body: Joi.object({
          mobile: Joi.string().required(),
          phone: Joi.string().required(),
        }),
      });

      mockReq.body = { 
        mobile: '9876543210',
        phone: '1234567890',
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(typeof mockReq.body.mobile).toBe('string');
      expect(typeof mockReq.body.phone).toBe('string');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate query parameters', () => {
      const schema = Joi.object({
        query: Joi.object({
          page: Joi.number().min(1),
          limit: Joi.number().min(1).max(100),
        }),
      });

      mockReq.query = { page: '1', limit: '10' };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate route parameters', () => {
      const schema = Joi.object({
        params: Joi.object({
          id: Joi.string().length(24).required(),
        }),
      });

      mockReq.params = { id: '507f1f77bcf86cd799439011' };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle nested object validation', () => {
      const schema = Joi.object({
        body: Joi.object({
          address: Joi.object({
            street: Joi.string().required(),
            city: Joi.string().required(),
            zipCode: Joi.string().required(),
          }).required(),
        }),
      });

      mockReq.body = {
        address: {
          street: '123 Main St',
          city: 'Springfield',
          zipCode: '12345',
        },
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle array validation', () => {
      const schema = Joi.object({
        body: Joi.object({
          items: Joi.array().items(
            Joi.object({
              productId: Joi.string().required(),
              quantity: Joi.number().min(1).required(),
            })
          ).min(1).required(),
        }),
      });

      mockReq.body = {
        items: [
          { productId: '507f1f77bcf86cd799439011', quantity: 5 },
          { productId: '507f1f77bcf86cd799439012', quantity: 3 },
        ],
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Validation Failures', () => {
    it('should reject missing required field', () => {
      const schema = Joi.object({
        body: Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required(),
        }),
      });

      mockReq.body = { name: 'John' }; // Missing email

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('email'),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid data type', () => {
      const schema = Joi.object({
        body: Joi.object({
          age: Joi.number().required(),
        }),
      });

      mockReq.body = { age: 'not-a-number' };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should reject invalid email format', () => {
      const schema = Joi.object({
        body: Joi.object({
          email: Joi.string().email().required(),
        }),
      });

      mockReq.body = { email: 'invalid-email' };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('valid email'),
        })
      );
    });

    it('should reject value below minimum', () => {
      const schema = Joi.object({
        body: Joi.object({
          quantity: Joi.number().min(1).required(),
        }),
      });

      mockReq.body = { quantity: 0 };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should reject value above maximum', () => {
      const schema = Joi.object({
        body: Joi.object({
          limit: Joi.number().max(100).required(),
        }),
      });

      mockReq.body = { limit: 150 };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject invalid enum value', () => {
      const schema = Joi.object({
        body: Joi.object({
          status: Joi.string().valid('ACTIVE', 'INACTIVE', 'PENDING').required(),
        }),
      });

      mockReq.body = { status: 'INVALID_STATUS' };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should aggregate multiple validation errors', () => {
      const schema = Joi.object({
        body: Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required(),
          age: Joi.number().min(18).required(),
        }),
      });

      mockReq.body = { name: '', email: 'invalid', age: 10 };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.any(String),
        })
      );
      
      const errorMessage = mockRes.json.mock.calls[0][0].message;
      expect(errorMessage).toContain('name');
      expect(errorMessage).toContain('email');
      expect(errorMessage).toContain('age');
    });

    it('should reject empty array when minimum items required', () => {
      const schema = Joi.object({
        body: Joi.object({
          items: Joi.array().min(1).required(),
        }),
      });

      mockReq.body = { items: [] };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject nested object validation failures', () => {
      const schema = Joi.object({
        body: Joi.object({
          address: Joi.object({
            street: Joi.string().required(),
            city: Joi.string().required(),
          }).required(),
        }),
      });

      mockReq.body = {
        address: {
          street: '123 Main St',
          // Missing city
        },
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty request body', () => {
      const schema = Joi.object({
        body: Joi.object({
          name: Joi.string().optional(),
        }),
      });

      mockReq.body = {};

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle null body values', () => {
      const schema = Joi.object({
        body: Joi.object({
          name: Joi.string().allow(null),
        }),
      });

      mockReq.body = { name: null };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty string', () => {
      const schema = Joi.object({
        body: Joi.object({
          name: Joi.string().allow(''),
        }),
      });

      mockReq.body = { name: '' };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should NOT convert empty numeric string', () => {
      const schema = Joi.object({
        body: Joi.object({
          value: Joi.number().optional(),
        }),
      });

      mockReq.body = { value: '' };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      // Empty string should not be converted to number
      expect(mockReq.body.value).toBe('');
    });

    it('should handle pincode as string', () => {
      const schema = Joi.object({
        body: Joi.object({
          pincode: Joi.string().required(),
        }),
      });

      mockReq.body = { pincode: '560001' };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(typeof mockReq.body.pincode).toBe('string');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow unknown fields with allowUnknown option', () => {
      const schema = Joi.object({
        body: Joi.object({
          name: Joi.string().required(),
        }),
      });

      mockReq.body = { 
        name: 'John',
        extraField: 'should-be-allowed',
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
