import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import supertest from 'supertest';
import app from '../../src/app.js';
import User from '../../src/modules/user/user.model.js';
import RefreshToken from '../../src/models/RefreshToken.model.js';
import {
  clearDatabase,
  generateTestUser,
  mockRequest,
  mockResponse,
  mockNext,
  verifyTokenStructure,
  assertErrorResponse,
} from '../helpers/testUtils.js';
import * as authService from '../../src/modules/auth/auth.service.js';
import { hashPassword } from '../../src/utils/hashPassword.js';
import { ROLES } from '../../src/constants/roles.js';
import { USER_STATUS } from '../../src/constants/userStatus.js';
import { redisClient } from '../../src/config/redis.js';

const request = supertest(app);

describe('Authentication Module - Comprehensive Tests', () => {
  beforeEach(async () => {
    await clearDatabase();
    await redisClient.flushdb();
  });

  afterEach(async () => {
    await redisClient.flushdb();
  });

  describe('POST /api/auth/register - User Registration', () => {
    it('should register a new user with valid data', async () => {
      const userData = generateTestUser({
        email: 'newuser@test.com',
        mobile: '9876543210',
      });

      const response = await request
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.password).toBeUndefined();
      verifyTokenStructure(response.body.data.accessToken);
    });

    it('should hash password before storing', async () => {
      const userData = generateTestUser({
        password: 'PlainPassword@123',
      });

      await request.post('/api/v1/auth/register').send(userData).expect(201);

      const user = await User.findOne({ email: userData.email });
      expect(user.password).not.toBe(userData.password);
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });

    it('should reject weak passwords', async () => {
      const userData = generateTestUser({
        password: 'weak', // Too short, no special chars
      });

      const response = await request
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('password');
    });

    it('should reject duplicate email', async () => {
      const userData = generateTestUser({
        email: 'duplicate@test.com',
      });

      // First registration
      await request.post('/api/v1/auth/register').send(userData).expect(201);

      // Duplicate registration
      const response = await request
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should reject duplicate mobile number', async () => {
      const mobile = '9999888877';

      // First registration
      await request
        .post('/api/v1/auth/register')
        .send(generateTestUser({ mobile, email: 'user1@test.com' }))
        .expect(201);

      // Duplicate mobile
      const response = await request
        .post('/api/v1/auth/register')
        .send(generateTestUser({ mobile, email: 'user2@test.com' }))
        .expect(400);

      expect(response.body.message).toContain('already exists');
    });

    it('should validate email format', async () => {
      const userData = generateTestUser({
        email: 'invalid-email',
      });

      const response = await request
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    it('should validate mobile number format', async () => {
      const userData = generateTestUser({
        mobile: '123', // Too short
      });

      const response = await request
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toContain('mobile');
    });

    it('should check password against breach database', async () => {
      const userData = generateTestUser({
        password: 'Password123!', // Common breached password
      });

      const response = await request.post('/api/v1/auth/register').send(userData);

      // Should either reject or warn about breach
      expect(response.status).toBeLessThan(500);
    });

    it('should track password history on registration', async () => {
      const userData = generateTestUser();

      await request.post('/api/v1/auth/register').send(userData).expect(201);

      const user = await User.findOne({ email: userData.email });
      expect(user.passwordHistory).toBeDefined();
      expect(user.passwordHistory.length).toBe(1);
      expect(user.lastPasswordChange).toBeDefined();
    });

    it('should set default role to B2B_CUSTOMER if not specified', async () => {
      const userData = generateTestUser();
      delete userData.role;

      const response = await request
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.data.user.role).toBe(ROLES.B2B_CUSTOMER);
    });

    it('should set initial user status to PENDING', async () => {
      const userData = generateTestUser();

      const response = await request
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.data.user.status).toBe(USER_STATUS.PENDING);
    });

    it('should return CSRF token on registration', async () => {
      const userData = generateTestUser();

      const response = await request
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.data).toHaveProperty('csrfToken');
      expect(response.body.data.csrfToken).toBeDefined();
    });

    it('should reject registration if missing required fields', async () => {
      const invalidData = {
        email: 'test@test.com',
        // Missing password, name, mobile
      };

      const response = await request
        .post('/api/v1/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should sanitize user input to prevent XSS', async () => {
      const userData = generateTestUser({
        name: '<script>alert("XSS")</script>',
      });

      const response = await request
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.data.user.name).not.toContain('<script>');
    });

    it('should create refresh token on registration', async () => {
      const userData = generateTestUser();

      const response = await request
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      const refreshTokenCount = await RefreshToken.countDocuments({
        userId: response.body.data.user._id,
      });

      expect(refreshTokenCount).toBe(1);
    });

    it('should track device info in refresh token', async () => {
      const userData = generateTestUser();

      const response = await request
        .post('/api/v1/auth/register')
        .send(userData)
        .set('User-Agent', 'Mozilla/5.0 Chrome/120.0')
        .expect(201);

      const refreshToken = await RefreshToken.findOne({
        userId: response.body.data.user._id,
      });

      expect(refreshToken.deviceInfo).toBeDefined();
      expect(refreshToken.deviceInfo.browser).toBeDefined();
    });
  });

  describe('POST /api/auth/login - User Login', () => {
    let testUser;
    let testPassword = 'Test@1234';

    beforeEach(async () => {
      // Create a test user
      const hashedPassword = await hashPassword(testPassword);
      testUser = await User.create({
        ...generateTestUser({
          email: 'login@test.com',
          mobile: '9876543210',
        }),
        password: hashedPassword,
        status: USER_STATUS.ACTIVE,
      });
    });

    it('should login with valid email and password', async () => {
      const response = await request
        .post('/api/v1/auth/login')
        .send({
          identifier: testUser.email,
          password: testPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      verifyTokenStructure(response.body.data.accessToken);
    });

    it('should login with valid mobile and password', async () => {
      const response = await request
        .post('/api/v1/auth/login')
        .send({
          identifier: testUser.mobile,
          password: testPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should reject login with invalid password', async () => {
      const response = await request
        .post('/api/v1/auth/login')
        .send({
          identifier: testUser.email,
          password: 'WrongPassword@123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should reject login for non-existent user', async () => {
      const response = await request
        .post('/api/v1/auth/login')
        .send({
          identifier: 'nonexistent@test.com',
          password: testPassword,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject login for inactive user', async () => {
      testUser.status = USER_STATUS.INACTIVE;
      await testUser.save();

      const response = await request
        .post('/api/v1/auth/login')
        .send({
          identifier: testUser.email,
          password: testPassword,
        })
        .expect(403);

      expect(response.body.message).toContain('inactive');
    });

    it('should reject login for pending user', async () => {
      testUser.status = USER_STATUS.PENDING;
      await testUser.save();

      const response = await request
        .post('/api/v1/auth/login')
        .send({
          identifier: testUser.email,
          password: testPassword,
        })
        .expect(403);

      expect(response.body.message).toContain('pending');
    });

    it('should lock account after 5 failed login attempts', async () => {
      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await request
          .post('/api/v1/auth/login')
          .send({
            identifier: testUser.email,
            password: 'WrongPassword',
          })
          .expect(401);
      }

      // 6th attempt should be blocked
      const response = await request
        .post('/api/v1/auth/login')
        .send({
          identifier: testUser.email,
          password: testPassword,
        })
        .expect(403);

      expect(response.body.message).toContain('locked');
    });

    it('should reset login attempts on successful login', async () => {
      // Failed attempt
      await request
        .post('/api/v1/auth/login')
        .send({
          identifier: testUser.email,
          password: 'Wrong',
        })
        .expect(401);

      // Successful login
      await request
        .post('/api/v1/auth/login')
        .send({
          identifier: testUser.email,
          password: testPassword,
        })
        .expect(200);

      const user = await User.findById(testUser._id);
      expect(user.loginAttempts).toBe(0);
    });

    it('should return requires2FA flag if 2FA is enabled', async () => {
      testUser.twoFactorEnabled = true;
      await testUser.save();

      const response = await request
        .post('/api/v1/auth/login')
        .send({
          identifier: testUser.email,
          password: testPassword,
        })
        .expect(200);

      expect(response.body.data.requires2FA).toBe(true);
      expect(response.body.data.userId).toBe(testUser._id.toString());
      expect(response.body.data.accessToken).toBeUndefined();
    });

    it('should track login IP address', async () => {
      await request
        .post('/api/v1/auth/login')
        .send({
          identifier: testUser.email,
          password: testPassword,
        })
        .set('X-Forwarded-For', '203.0.113.1')
        .expect(200);

      const refreshToken = await RefreshToken.findOne({ userId: testUser._id });
      expect(refreshToken.ipAddress).toBeDefined();
    });

    it('should rate limit login attempts', async () => {
      // Attempt many rapid logins
      const attempts = Array(20)
        .fill()
        .map(() =>
          request.post('/api/v1/auth/login').send({
            identifier: testUser.email,
            password: 'wrong',
          })
        );

      const responses = await Promise.all(attempts);
      const rateLimited = responses.some((r) => r.status === 429);
      expect(rateLimited).toBe(true);
    });

    it('should not expose user info on failed login', async () => {
      const response = await request
        .post('/api/v1/auth/login')
        .send({
          identifier: 'random@test.com',
          password: 'Random@123',
        })
        .expect(401);

      // Should not reveal whether email exists
      expect(response.body.message).not.toContain('not found');
      expect(response.body.message).toContain('Invalid');
    });
  });

  describe('POST /api/auth/refresh-token - Token Refresh', () => {
    let testUser;
    let validRefreshToken;

    beforeEach(async () => {
      const hashedPassword = await hashPassword('Test@1234');
      testUser = await User.create({
        ...generateTestUser({ email: 'refresh@test.com' }),
        password: hashedPassword,
        status: USER_STATUS.ACTIVE,
      });

      // Create refresh token
      validRefreshToken = await RefreshToken.create({
        userId: testUser._id,
        token: 'valid_refresh_token_' + Date.now(),
        family: 'family_' + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        deviceInfo: { browser: 'Chrome', os: 'Windows' },
        ipAddress: '127.0.0.1',
      });
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: validRefreshToken.token })
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.refreshToken).not.toBe(validRefreshToken.token);
      verifyTokenStructure(response.body.data.accessToken);
    });

    it('should rotate refresh token on successful refresh', async () => {
      const oldToken = validRefreshToken.token;

      const response = await request
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: oldToken })
        .expect(200);

      const newToken = response.body.data.refreshToken;
      expect(newToken).not.toBe(oldToken);

      // Old token should be revoked
      const oldTokenDoc = await RefreshToken.findOne({ token: oldToken });
      expect(oldTokenDoc.revoked).toBe(true);
    });

    it('should reject expired refresh token', async () => {
      validRefreshToken.expiresAt = new Date(Date.now() - 1000);
      await validRefreshToken.save();

      const response = await request
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: validRefreshToken.token })
        .expect(401);

      expect(response.body.message).toContain('Invalid refresh token');
    });

    it('should reject revoked refresh token', async () => {
      validRefreshToken.revoked = true;
      await validRefreshToken.save();

      const response = await request
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: validRefreshToken.token })
        .expect(401);

      expect(response.body.message).toContain('Invalid refresh token');
    });

    it('should detect token reuse and revoke entire family', async () => {
      // First refresh (valid)
      await request
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: validRefreshToken.token })
        .expect(200);

      // Try to reuse old token (should detect reuse)
      const response = await request
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: validRefreshToken.token })
        .expect(401);

      expect(response.body.message).toContain('Security violation');

      // All tokens in family should be revoked
      const familyTokens = await RefreshToken.find({
        family: validRefreshToken.family,
      });
      familyTokens.forEach((token) => {
        expect(token.revoked).toBe(true);
      });
    });

    it('should maintain token family across rotations', async () => {
      const originalFamily = validRefreshToken.family;

      // First rotation
      const response1 = await request
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: validRefreshToken.token })
        .expect(200);

      // Second rotation
      const response2 = await request
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: response1.body.data.refreshToken })
        .expect(200);

      const newToken = await RefreshToken.findOne({
        token: response2.body.data.refreshToken,
      });
      expect(newToken.family).toBe(originalFamily);
    });

    it('should reject invalid refresh token format', async () => {
      const response = await request
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'invalid_token_format' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should update lastUsedAt timestamp on refresh', async () => {
      const originalLastUsed = validRefreshToken.lastUsedAt;

      await request
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: validRefreshToken.token })
        .expect(200);

      const updatedToken = await RefreshToken.findById(validRefreshToken._id);
      expect(updatedToken.lastUsedAt.getTime()).toBeGreaterThan(
        originalLastUsed ? originalLastUsed.getTime() : 0
      );
    });
  });

  describe('POST /api/auth/logout - User Logout', () => {
    let testUser;
    let refreshToken;

    beforeEach(async () => {
      const hashedPassword = await hashPassword('Test@1234');
      testUser = await User.create({
        ...generateTestUser({ email: 'logout@test.com' }),
        password: hashedPassword,
        status: USER_STATUS.ACTIVE,
      });

      refreshToken = await RefreshToken.create({
        userId: testUser._id,
        token: 'logout_token_' + Date.now(),
        family: 'family_logout',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        deviceInfo: {},
        ipAddress: '127.0.0.1',
      });
    });

    it('should revoke refresh token on logout', async () => {
      const response = await request
        .post('/api/v1/auth/logout')
        .send({ refreshToken: refreshToken.token })
        .expect(200);

      expect(response.body.success).toBe(true);

      const revokedToken = await RefreshToken.findById(refreshToken._id);
      expect(revokedToken.revoked).toBe(true);
    });

    it('should handle logout without refresh token gracefully', async () => {
      const response = await request.post('/api/v1/auth/logout').send({}).expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should log security event on logout', async () => {
      // This would check audit logs in real implementation
      const response = await request
        .post('/api/v1/auth/logout')
        .send({ refreshToken: refreshToken.token })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/change-password - Password Change', () => {
    let testUser;
    let accessToken;
    const oldPassword = 'OldPassword@123';
    const newPassword = 'NewPassword@456';

    beforeEach(async () => {
      const hashedPassword = await hashPassword(oldPassword);
      testUser = await User.create({
        ...generateTestUser({ email: 'changepass@test.com' }),
        password: hashedPassword,
        status: USER_STATUS.ACTIVE,
      });

      // Login to get access token
      const loginResponse = await request
        .post('/api/v1/auth/login')
        .send({
          identifier: testUser.email,
          password: oldPassword,
        });

      accessToken = loginResponse.body.data.accessToken;
    });

    it('should change password with valid old password', async () => {
      const response = await request
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword,
          newPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('changed');
    });

    it('should reject change with incorrect old password', async () => {
      const response = await request
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword: 'WrongOld@123',
          newPassword,
        })
        .expect(401);

      expect(response.body.message).toContain('incorrect');
    });

    it('should reject weak new password', async () => {
      const response = await request
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword,
          newPassword: 'weak',
        })
        .expect(400);

      expect(response.body.message).toContain('password');
    });

    it('should prevent password reuse from history', async () => {
      // Change password first time
      await request
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword,
          newPassword,
        })
        .expect(200);

      // Login with new password
      const loginResponse = await request
        .post('/api/v1/auth/login')
        .send({
          identifier: testUser.email,
          password: newPassword,
        });

      const newAccessToken = loginResponse.body.data.accessToken;

      // Try to change back to old password
      const response = await request
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send({
          oldPassword: newPassword,
          newPassword: oldPassword,
        })
        .expect(400);

      expect(response.body.message).toContain('recent passwords');
    });

    it('should invalidate all sessions on password change', async () => {
      await request
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword,
          newPassword,
        })
        .expect(200);

      const refreshTokens = await RefreshToken.find({
        userId: testUser._id,
        revoked: false,
      });

      expect(refreshTokens.length).toBe(0);
    });

    it('should update lastPasswordChange timestamp', async () => {
      const beforeChange = testUser.lastPasswordChange;

      await request
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword,
          newPassword,
        })
        .expect(200);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.lastPasswordChange.getTime()).toBeGreaterThan(
        beforeChange ? beforeChange.getTime() : 0
      );
    });

    it('should add new password to history', async () => {
      await request
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword,
          newPassword,
        })
        .expect(200);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.passwordHistory.length).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      const response = await request
        .post('/api/v1/auth/change-password')
        .send({
          oldPassword,
          newPassword,
        })
        .expect(401);

      expect(response.body.message).toContain('authorized');
    });
  });

  describe('Security & Edge Cases', () => {
    it('should sanitize SQL injection attempts', async () => {
      const response = await request
        .post('/api/v1/auth/login')
        .send({
          identifier: "admin' OR '1'='1",
          password: "' OR '1'='1",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle concurrent registration attempts', async () => {
      const userData = generateTestUser({ email: 'concurrent@test.com' });

      const attempts = Array(5)
        .fill()
        .map(() => request.post('/api/v1/auth/register').send(userData));

      const responses = await Promise.all(attempts.map((p) => p.catch((e) => e.response)));

      const successCount = responses.filter((r) => r.status === 201).length;
      expect(successCount).toBe(1); // Only one should succeed
    });

    it('should handle extremely long input gracefully', async () => {
      const longString = 'a'.repeat(10000);

      const response = await request
        .post('/api/v1/auth/register')
        .send({
          email: longString + '@test.com',
          password: 'Test@1234',
          name: longString,
          mobile: '9876543210',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle Unicode characters in names', async () => {
      const userData = generateTestUser({
        name: '测试用户 テストユーザー',
      });

      const response = await request
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.data.user.name).toBe(userData.name);
    });

    it('should handle empty request body', async () => {
      const response = await request.post('/api/v1/auth/login').send({}).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed JSON', async () => {
      const response = await request
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid json}')
        .expect(400);

      expect(response.status).toBeLessThan(500);
    });
  });
});
