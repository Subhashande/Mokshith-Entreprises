import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../src/modules/user/user.model.js';
import { env } from '../../src/config/env.js';

describe('Auth Service - Unit Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGO_URI || 'mongodb://localhost:27017/b2b-test');
    }
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({ email: { $regex: /test.*@test\.com/ } });
    await mongoose.connection.close();
  });

  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'TestPassword123!';
      const hashed = await bcrypt.hash(password, 10);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(20);
    });

    it('should verify password correctly', async () => {
      const password = 'TestPassword123!';
      const hashed = await bcrypt.hash(password, 10);
      
      const isMatch = await bcrypt.compare(password, hashed);
      expect(isMatch).toBe(true);
      
      const isNotMatch = await bcrypt.compare('WrongPassword', hashed);
      expect(isNotMatch).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate valid JWT token', () => {
      const payload = { userId: '123', email: 'test@test.com' };
      const token = jwt.sign(payload, env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = jwt.verify(token, env.JWT_SECRET || 'testsecret');
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    it('should fail with invalid token', () => {
      expect(() => {
        jwt.verify('invalid-token', env.JWT_SECRET || 'testsecret');
      }).toThrow();
    });
  });

  describe('User Model Validation', () => {
    it('should validate required fields', async () => {
      const user = new User({});
      
      let error;
      try {
        await user.validate();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.email).toBeDefined();
    });

    it('should validate email format', async () => {
      const user = new User({
        name: 'Test User',
        email: 'invalid-email',
        password: 'Test123!',
        role: 'B2C_CUSTOMER'
      });
      
      let error;
      try {
        await user.validate();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
    });
  });
});
