import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { requirePermission, requireAnyPermission, requireAllPermissions, requireOwnershipOr } from '../../src/middlewares/permission.middleware.js';
import { ROLES } from '../../src/constants/roles.js';
import AppError from '../../src/errors/AppError.js';
import PermissionError from '../../src/errors/PermissionError.js';
import * as permissions from '../../src/constants/permissions.js';
import * as securityAudit from '../../src/middlewares/securityAudit.middleware.js';

// Mock dependencies
jest.mock('../../src/constants/permissions.js', () => ({
  hasPermission: jest.fn(),
  hasAnyPermission: jest.fn(),
  hasAllPermissions: jest.fn(),
}));
jest.mock('../../src/middlewares/securityAudit.middleware.js', () => ({
  logSecurityEvent: jest.fn(),
  SECURITY_EVENTS: {
    PERMISSION_DENIED: 'PERMISSION_DENIED',
  },
}));

describe('Permission Middleware - Unit Tests', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: null,
      path: '/api/products',
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
    jest.restoreAllMocks();
  });

  describe('requirePermission()', () => {
    it('should allow access when user has required permission', () => {
      mockReq.user = {
        _id: 'user123',
        role: ROLES.ADMIN,
      };

      permissions.hasPermission.mockReturnValue(true);

      const middleware = requirePermission('products.create');
      middleware(mockReq, mockRes, mockNext);

      expect(hasPermission).toHaveBeenCalledWith(ROLES.ADMIN, 'products.create');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow super admin without permission check', () => {
      mockReq.user = {
        _id: 'superadmin123',
        role: ROLES.SUPER_ADMIN,
      };

      const middleware = requirePermission('products.create');
      middleware(mockReq, mockRes, mockNext);

      expect(hasPermission).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should block access when user lacks permission', () => {
      mockReq.user = {
        _id: 'user123',
        role: ROLES.CUSTOMER,
      };

      permissions.hasPermission.mockReturnValue(false);

      const middleware = requirePermission('products.create');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Permission denied: products.create',
        })
      );
    });

    it('should reject unauthenticated request', () => {
      mockReq.user = null;

      const middleware = requirePermission('products.create');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
          statusCode: 401,
        })
      );
    });

    it('should handle undefined user', () => {
      mockReq.user = undefined;

      const middleware = requirePermission('products.create');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
          statusCode: 401,
        })
      );
    });
  });

  describe('requireAnyPermission()', () => {
    it('should allow access when user has one of multiple permissions', () => {
      mockReq.user = {
        _id: 'user123',
        role: ROLES.MANAGER,
      };

      permissions.hasAnyPermission.mockReturnValue(true);

      const middleware = requireAnyPermission('products.create', 'products.update');
      middleware(mockReq, mockRes, mockNext);

      expect(hasAnyPermission).toHaveBeenCalledWith(
        ROLES.MANAGER,
        ['products.create', 'products.update']
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow super admin without permission check', () => {
      mockReq.user = {
        _id: 'superadmin123',
        role: ROLES.SUPER_ADMIN,
      };

      const middleware = requireAnyPermission('products.create', 'products.update');
      middleware(mockReq, mockRes, mockNext);

      expect(hasAnyPermission).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should block access when user lacks all permissions', () => {
      mockReq.user = {
        _id: 'user123',
        role: ROLES.CUSTOMER,
      };

      permissions.hasAnyPermission.mockReturnValue(false);

      const middleware = requireAnyPermission('products.create', 'products.update');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Permission denied. Required any of: products.create, products.update',
        })
      );
    });

    it('should reject unauthenticated request', () => {
      mockReq.user = null;

      const middleware = requireAnyPermission('products.create', 'products.update');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
          statusCode: 401,
        })
      );
    });

    it('should handle single permission', () => {
      mockReq.user = {
        _id: 'user123',
        role: ROLES.ADMIN,
      };

      permissions.hasAnyPermission.mockReturnValue(true);

      const middleware = requireAnyPermission('products.create');
      middleware(mockReq, mockRes, mockNext);

      expect(hasAnyPermission).toHaveBeenCalledWith(ROLES.ADMIN, ['products.create']);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle three or more permissions', () => {
      mockReq.user = {
        _id: 'user123',
        role: ROLES.ADMIN,
      };

      permissions.hasAnyPermission.mockReturnValue(true);

      const middleware = requireAnyPermission('products.create', 'products.update', 'products.delete');
      middleware(mockReq, mockRes, mockNext);

      expect(hasAnyPermission).toHaveBeenCalledWith(
        ROLES.ADMIN,
        ['products.create', 'products.update', 'products.delete']
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireAllPermissions()', () => {
    it('should allow access when user has all required permissions', () => {
      mockReq.user = {
        _id: 'user123',
        role: ROLES.ADMIN,
      };

      permissions.hasAllPermissions.mockReturnValue(true);

      const middleware = requireAllPermissions('products.create', 'products.publish');
      middleware(mockReq, mockRes, mockNext);

      expect(hasAllPermissions).toHaveBeenCalledWith(
        ROLES.ADMIN,
        ['products.create', 'products.publish']
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow super admin without permission check', () => {
      mockReq.user = {
        _id: 'superadmin123',
        role: ROLES.SUPER_ADMIN,
      };

      const middleware = requireAllPermissions('products.create', 'products.publish');
      middleware(mockReq, mockRes, mockNext);

      expect(hasAllPermissions).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should block access when user lacks some permissions', () => {
      mockReq.user = {
        _id: 'user123',
        role: ROLES.MANAGER,
      };

      permissions.hasAllPermissions.mockReturnValue(false);

      const middleware = requireAllPermissions('products.create', 'products.publish');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Permission denied. Required all of: products.create, products.publish',
        })
      );
    });

    it('should reject unauthenticated request', () => {
      mockReq.user = null;

      const middleware = requireAllPermissions('products.create', 'products.publish');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
          statusCode: 401,
        })
      );
    });

    it('should handle single permission', () => {
      mockReq.user = {
        _id: 'user123',
        role: ROLES.ADMIN,
      };

      permissions.hasAllPermissions.mockReturnValue(true);

      const middleware = requireAllPermissions('products.create');
      middleware(mockReq, mockRes, mockNext);

      expect(hasAllPermissions).toHaveBeenCalledWith(ROLES.ADMIN, ['products.create']);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireOwnershipOr()', () => {
    it('should allow access when user owns the resource', async () => {
      mockReq.user = {
        _id: 'user123',
        role: ROLES.CUSTOMER,
      };

      mockReq.order = {
        _id: 'order123',
        userId: 'user123',
      };

      const middleware = requireOwnershipOr('order', 'userId', 'orders.manage');
      await middleware(mockReq, mockRes, mockNext);

      expect(hasPermission).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access when user has fallback permission', async () => {
      mockReq.user = {
        _id: 'admin123',
        role: ROLES.ADMIN,
      };

      mockReq.order = {
        _id: 'order123',
        userId: 'customer123', // Different user
      };

      permissions.hasPermission.mockReturnValue(true);

      const middleware = requireOwnershipOr('order', 'userId', 'orders.manage');
      await middleware(mockReq, mockRes, mockNext);

      expect(hasPermission).toHaveBeenCalledWith(ROLES.ADMIN, 'orders.manage');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow super admin without checks', async () => {
      mockReq.user = {
        _id: 'superadmin123',
        role: ROLES.SUPER_ADMIN,
      };

      mockReq.order = {
        _id: 'order123',
        userId: 'customer123',
      };

      const middleware = requireOwnershipOr('order', 'userId', 'orders.manage');
      await middleware(mockReq, mockRes, mockNext);

      expect(hasPermission).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should block access when user is not owner and lacks permission', async () => {
      mockReq.user = {
        _id: 'user123',
        role: ROLES.CUSTOMER,
      };

      mockReq.order = {
        _id: 'order123',
        userId: 'differentUser123',
      };

      permissions.hasPermission.mockReturnValue(false);

      const middleware = requireOwnershipOr('order', 'userId', 'orders.manage');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Access denied. You do not own this resource.',
        })
      );
    });

    it('should reject unauthenticated request', async () => {
      mockReq.user = null;

      const middleware = requireOwnershipOr('order', 'userId', 'orders.manage');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
          statusCode: 401,
        })
      );
    });

    it('should handle missing resource', async () => {
      mockReq.user = {
        _id: 'user123',
        role: ROLES.CUSTOMER,
      };

      mockReq.order = null;

      const middleware = requireOwnershipOr('order', 'userId', 'orders.manage');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Resource not found: order',
          statusCode: 404,
        })
      );
    });

    it('should handle ownership with ObjectId objects', async () => {
      mockReq.user = {
        _id: { toString: () => 'user123' },
        role: ROLES.CUSTOMER,
      };

      mockReq.product = {
        _id: 'product123',
        vendorId: { toString: () => 'user123' },
      };

      const middleware = requireOwnershipOr('product', 'vendorId', 'products.manage');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should work without fallback permission', async () => {
      mockReq.user = {
        _id: 'user123',
        role: ROLES.CUSTOMER,
      };

      mockReq.order = {
        _id: 'order123',
        userId: 'differentUser123',
      };

      const middleware = requireOwnershipOr('order', 'userId', null);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Access denied. You do not own this resource.',
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with undefined role', () => {
      mockReq.user = {
        _id: 'user123',
        // No role property
      };

      permissions.hasPermission.mockReturnValue(false);

      const middleware = requirePermission('products.create');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(PermissionError)
      );
    });

    it('should handle null permission', () => {
      mockReq.user = {
        _id: 'user123',
        role: ROLES.ADMIN,
      };

      permissions.hasPermission.mockReturnValue(false);

      const middleware = requirePermission(null);
      middleware(mockReq, mockRes, mockNext);

      expect(hasPermission).toHaveBeenCalledWith(ROLES.ADMIN, null);
    });

    it('should handle empty permission array', () => {
      mockReq.user = {
        _id: 'user123',
        role: ROLES.ADMIN,
      };

      permissions.hasAnyPermission.mockReturnValue(false);

      const middleware = requireAnyPermission();
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(PermissionError)
      );
    });
  });
});
