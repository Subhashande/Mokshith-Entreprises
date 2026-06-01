import { describe, it, expect, jest, beforeAll, beforeEach, afterEach } from '@jest/globals';
import AppError from '../../src/errors/AppError.js';
import { ROLES } from '../../src/constants/roles.js';
import { USER_STATUS } from '../../src/constants/userStatus.js';

// ESM-compatible module mocking: register mocks before dynamically importing the SUT
const mockVerify = jest.fn();
const mockFindUserById = jest.fn();
const mockFetchSetting = jest.fn();

jest.unstable_mockModule('jsonwebtoken', () => ({
  __esModule: true,
  default: { verify: mockVerify },
}));
jest.unstable_mockModule('../../src/modules/auth/auth.repository.js', () => ({
  __esModule: true,
  findUserById: mockFindUserById,
}));
jest.unstable_mockModule('../../src/modules/settings/settings.service.js', () => ({
  __esModule: true,
  fetchSetting: mockFetchSetting,
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  __esModule: true,
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

// Aliases so existing test bodies referencing these names continue to work
const jwt = { default: { verify: mockVerify } };
const authRepo = { findUserById: mockFindUserById };
const settingsService = { fetchSetting: mockFetchSetting };

let protect;
let authenticate;

beforeAll(async () => {
  ({ protect, authenticate } = await import('../../src/middlewares/auth.middleware.js'));
});

describe('Authentication Middleware - Unit Tests', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let originalEnv;

  beforeEach(() => {
    jest.clearAllMocks();

    originalEnv = process.env.JWT_SECRET;

    // Setup mock request/response
    mockReq = {
      headers: {},
      ip: '127.0.0.1',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();

    // Default environment
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalEnv;
    jest.restoreAllMocks();
  });

  describe('protect() - Valid Authentication', () => {
    it('should authenticate valid JWT token and attach user to request', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        role: ROLES.CUSTOMER,
        status: USER_STATUS.ACTIVE,
      };

      mockReq.headers.authorization = 'Bearer valid-token';
      
      jwt.default.verify.mockReturnValue({ id: 'user123' });
      authRepo.findUserById.mockResolvedValue(mockUser);
      settingsService.fetchSetting.mockResolvedValue(null);

      await protect(mockReq, mockRes, mockNext);

      expect(jwt.default.verify).toHaveBeenCalledWith('valid-token', 'test-secret-key');
      expect(authRepo.findUserById).toHaveBeenCalledWith('user123');
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow super admin during maintenance mode', async () => {
      const mockUser = {
        _id: 'admin123',
        email: 'admin@example.com',
        role: ROLES.SUPER_ADMIN,
        status: USER_STATUS.ACTIVE,
      };

      mockReq.headers.authorization = 'Bearer admin-token';
      
      jwt.default.verify.mockReturnValue({ id: 'admin123' });
      authRepo.findUserById.mockResolvedValue(mockUser);
      settingsService.fetchSetting.mockResolvedValue({ value: true }); // Maintenance mode on

      await protect(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle inactive super admin users', async () => {
      const mockUser = {
        _id: 'admin123',
        email: 'admin@example.com',
        role: ROLES.SUPER_ADMIN,
        status: USER_STATUS.SUSPENDED,
      };

      mockReq.headers.authorization = 'Bearer admin-token';
      
      jwt.default.verify.mockReturnValue({ id: 'admin123' });
      authRepo.findUserById.mockResolvedValue(mockUser);
      settingsService.fetchSetting.mockResolvedValue(null);

      await protect(mockReq, mockRes, mockNext);

      // Super admin bypasses status checks
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('protect() - Missing or Invalid Tokens', () => {
    it('should reject request with no authorization header', async () => {
      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not authorized - No token provided',
          statusCode: 401,
        })
      );
    });

    it('should reject request with malformed authorization header', async () => {
      mockReq.headers.authorization = 'InvalidFormat token123';

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not authorized - No token provided',
          statusCode: 401,
        })
      );
    });

    it('should reject request with missing Bearer prefix', async () => {
      mockReq.headers.authorization = 'token123';

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not authorized - No token provided',
          statusCode: 401,
        })
      );
    });

    it('should reject request with null token', async () => {
      mockReq.headers.authorization = 'Bearer null';

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not authorized - Invalid token',
          statusCode: 401,
        })
      );
    });

    it('should reject request with undefined token', async () => {
      mockReq.headers.authorization = 'Bearer undefined';

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not authorized - Invalid token',
          statusCode: 401,
        })
      );
    });

    it('should reject request with empty token', async () => {
      mockReq.headers.authorization = 'Bearer ';

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not authorized - Invalid token',
          statusCode: 401,
        })
      );
    });

    it('should reject request with whitespace token', async () => {
      mockReq.headers.authorization = 'Bearer    ';

      await protect(mockReq, mockRes, mockNext);

      // 'Bearer    ' yields an empty token, which is rejected before verification
      expect(jwt.default.verify).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not authorized - Invalid token',
          statusCode: 401,
        })
      );
    });
  });

  describe('protect() - Token Verification Errors', () => {
    it('should reject expired JWT token', async () => {
      mockReq.headers.authorization = 'Bearer expired-token';
      
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';
      jwt.default.verify.mockImplementation(() => {
        throw error;
      });

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token expired - Please log in again',
          statusCode: 401,
        })
      );
    });

    it('should reject JWT with invalid signature', async () => {
      mockReq.headers.authorization = 'Bearer tampered-token';
      
      const error = new Error('invalid signature');
      error.name = 'JsonWebTokenError';
      jwt.default.verify.mockImplementation(() => {
        throw error;
      });

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token - Please log in again',
          statusCode: 401,
        })
      );
    });

    it('should handle generic token verification errors', async () => {
      mockReq.headers.authorization = 'Bearer malformed-token';
      
      jwt.default.verify.mockImplementation(() => {
        throw new Error('Token verification failed');
      });

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token verification failed',
          statusCode: 401,
        })
      );
    });

    it('should reject token with corrupted payload', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      
      jwt.default.verify.mockReturnValue({}); // No id in payload

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token payload',
          statusCode: 401,
        })
      );
    });

    it('should reject token with null payload', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      
      jwt.default.verify.mockReturnValue(null);

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token payload',
          statusCode: 401,
        })
      );
    });
  });

  describe('protect() - User Validation', () => {
    it('should reject when user no longer exists', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      
      jwt.default.verify.mockReturnValue({ id: 'deleted-user' });
      authRepo.findUserById.mockResolvedValue(null);

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User no longer exists',
          statusCode: 401,
        })
      );
    });

    it('should reject inactive user account', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        role: ROLES.CUSTOMER,
        status: USER_STATUS.SUSPENDED,
      };

      mockReq.headers.authorization = 'Bearer valid-token';
      
      jwt.default.verify.mockReturnValue({ id: 'user123' });
      authRepo.findUserById.mockResolvedValue(mockUser);
      settingsService.fetchSetting.mockResolvedValue(null);

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Your account is inactive or suspended. Please contact support.',
          statusCode: 403,
        })
      );
    });

    it('should reject pending user account', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        role: ROLES.CUSTOMER,
        status: USER_STATUS.PENDING,
      };

      mockReq.headers.authorization = 'Bearer valid-token';
      
      jwt.default.verify.mockReturnValue({ id: 'user123' });
      authRepo.findUserById.mockResolvedValue(mockUser);
      settingsService.fetchSetting.mockResolvedValue(null);

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Your account is pending admin approval. Please wait for activation.',
          statusCode: 403,
        })
      );
    });

    it('should block non-admin users during maintenance mode', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        role: ROLES.CUSTOMER,
        status: USER_STATUS.ACTIVE,
      };

      mockReq.headers.authorization = 'Bearer valid-token';
      
      jwt.default.verify.mockReturnValue({ id: 'user123' });
      authRepo.findUserById.mockResolvedValue(mockUser);
      settingsService.fetchSetting.mockResolvedValueOnce({ value: true }); // maintenanceMode
      settingsService.fetchSetting.mockResolvedValueOnce(null); // MAINTENANCE_MODE

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'System under maintenance',
          statusCode: 503,
        })
      );
    });

    it('should block non-admin users during legacy maintenance mode', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        role: ROLES.CUSTOMER,
        status: USER_STATUS.ACTIVE,
      };

      mockReq.headers.authorization = 'Bearer valid-token';
      
      jwt.default.verify.mockReturnValue({ id: 'user123' });
      authRepo.findUserById.mockResolvedValue(mockUser);
      settingsService.fetchSetting.mockResolvedValueOnce(null); // maintenanceMode
      settingsService.fetchSetting.mockResolvedValueOnce({ value: true }); // MAINTENANCE_MODE

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'System under maintenance',
          statusCode: 503,
        })
      );
    });
  });

  describe('protect() - Configuration Errors', () => {
    it('should handle missing JWT_SECRET', async () => {
      delete process.env.JWT_SECRET;
      mockReq.headers.authorization = 'Bearer valid-token';

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Server configuration error',
          statusCode: 500,
        })
      );
    });
  });

  describe('protect() - Exception Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      
      jwt.default.verify.mockReturnValue({ id: 'user123' });
      authRepo.findUserById.mockRejectedValue(new Error('Database connection failed'));

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication failed',
          statusCode: 401,
        })
      );
    });
  });

  describe('authenticate() - Alias', () => {
    it('should be an alias for protect()', () => {
      expect(authenticate).toBe(protect);
    });
  });
});
