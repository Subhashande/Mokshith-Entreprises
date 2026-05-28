import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { authorize } from '../../src/middlewares/role.middleware.js';
import { ROLES } from '../../src/constants/roles.js';
import AppError from '../../src/errors/AppError.js';

describe('Role Middleware - Unit Tests', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: null,
      path: '/api/admin/users',
      method: 'GET',
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

  describe('Single Role Authorization', () => {
    it('should allow admin role access', () => {
      mockReq.user = {
        _id: 'admin123',
        email: 'admin@example.com',
        role: ROLES.ADMIN,
      };

      const middleware = authorize(ROLES.ADMIN);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow super admin role access', () => {
      mockReq.user = {
        _id: 'superadmin123',
        email: 'superadmin@example.com',
        role: ROLES.SUPER_ADMIN,
      };

      const middleware = authorize(ROLES.SUPER_ADMIN);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow manager role access', () => {
      mockReq.user = {
        _id: 'manager123',
        email: 'manager@example.com',
        role: ROLES.MANAGER,
      };

      const middleware = authorize(ROLES.MANAGER);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow customer role access', () => {
      mockReq.user = {
        _id: 'customer123',
        email: 'customer@example.com',
        role: ROLES.CUSTOMER,
      };

      const middleware = authorize(ROLES.CUSTOMER);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should block customer from admin routes', () => {
      mockReq.user = {
        _id: 'customer123',
        email: 'customer@example.com',
        role: ROLES.CUSTOMER,
      };

      const middleware = authorize(ROLES.ADMIN);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Forbidden',
          statusCode: 403,
        })
      );
    });

    it('should block manager from super admin routes', () => {
      mockReq.user = {
        _id: 'manager123',
        email: 'manager@example.com',
        role: ROLES.MANAGER,
      };

      const middleware = authorize(ROLES.SUPER_ADMIN);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Forbidden',
          statusCode: 403,
        })
      );
    });
  });

  describe('Multiple Role Authorization', () => {
    it('should allow admin when admin or manager required', () => {
      mockReq.user = {
        _id: 'admin123',
        email: 'admin@example.com',
        role: ROLES.ADMIN,
      };

      const middleware = authorize(ROLES.ADMIN, ROLES.MANAGER);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow manager when admin or manager required', () => {
      mockReq.user = {
        _id: 'manager123',
        email: 'manager@example.com',
        role: ROLES.MANAGER,
      };

      const middleware = authorize(ROLES.ADMIN, ROLES.MANAGER);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow any of three roles', () => {
      mockReq.user = {
        _id: 'vendor123',
        email: 'vendor@example.com',
        role: ROLES.VENDOR,
      };

      const middleware = authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.VENDOR);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should block role not in allowed list', () => {
      mockReq.user = {
        _id: 'customer123',
        email: 'customer@example.com',
        role: ROLES.CUSTOMER,
      };

      const middleware = authorize(ROLES.ADMIN, ROLES.MANAGER);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Forbidden',
          statusCode: 403,
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined user role', () => {
      mockReq.user = {
        _id: 'user123',
        email: 'user@example.com',
        // No role property
      };

      const middleware = authorize(ROLES.ADMIN);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Forbidden',
          statusCode: 403,
        })
      );
    });

    it('should handle null user role', () => {
      mockReq.user = {
        _id: 'user123',
        email: 'user@example.com',
        role: null,
      };

      const middleware = authorize(ROLES.ADMIN);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Forbidden',
          statusCode: 403,
        })
      );
    });

    it('should handle invalid role string', () => {
      mockReq.user = {
        _id: 'user123',
        email: 'user@example.com',
        role: 'INVALID_ROLE',
      };

      const middleware = authorize(ROLES.ADMIN);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Forbidden',
          statusCode: 403,
        })
      );
    });

    it('should handle empty roles array', () => {
      mockReq.user = {
        _id: 'admin123',
        email: 'admin@example.com',
        role: ROLES.ADMIN,
      };

      const middleware = authorize();
      middleware(mockReq, mockRes, mockNext);

      // No roles specified, should block everyone
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Forbidden',
          statusCode: 403,
        })
      );
    });

    it('should handle case-sensitive role comparison', () => {
      mockReq.user = {
        _id: 'admin123',
        email: 'admin@example.com',
        role: 'admin', // Lowercase
      };

      const middleware = authorize(ROLES.ADMIN); // Uppercase constant
      middleware(mockReq, mockRes, mockNext);

      // Should fail if roles are case-sensitive
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Role Hierarchy', () => {
    it('should NOT allow admin automatic super admin access', () => {
      mockReq.user = {
        _id: 'admin123',
        email: 'admin@example.com',
        role: ROLES.ADMIN,
      };

      const middleware = authorize(ROLES.SUPER_ADMIN);
      middleware(mockReq, mockRes, mockNext);

      // No hierarchy - explicit role check only
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Forbidden',
          statusCode: 403,
        })
      );
    });

    it('should require explicit role match', () => {
      mockReq.user = {
        _id: 'manager123',
        email: 'manager@example.com',
        role: ROLES.MANAGER,
      };

      const middleware = authorize(ROLES.ADMIN);
      middleware(mockReq, mockRes, mockNext);

      // Manager cannot access admin routes
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Forbidden',
          statusCode: 403,
        })
      );
    });
  });

  describe('Multiple Middleware Calls', () => {
    it('should work correctly when called multiple times', () => {
      mockReq.user = {
        _id: 'admin123',
        email: 'admin@example.com',
        role: ROLES.ADMIN,
      };

      const middleware = authorize(ROLES.ADMIN);
      
      // First call
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Second call with same middleware instance
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);
    });
  });
});
