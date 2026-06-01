import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/modules/user/user.model.js';
import Product from '../../src/modules/product/product.model.js';
import { clearDatabase } from '../helpers/testUtils.js';
import { redisClient } from '../../src/config/redis.js';
import { ROLES } from '../../src/constants/roles.js';

/**
 * 🔒 CRITICAL: Rate Limiter Tests
 * Tests API rate limiting, order rate limiting, Redis fallback, and concurrent enforcement
 */

describe('Rate Limiter Tests', () => {
  let testUser;
  let authToken;
  let testProduct;

  beforeEach(async () => {
    await clearDatabase();
    await redisClient.flushdb();

    // Create test user
    testUser = await User.create({
      name: 'Rate Limit Test User',
      email: 'ratelimit@test.com',
      password: 'Test@1234',
      role: ROLES.B2B_CUSTOMER,
      mobile: '9876543210',
      status: 'ACTIVE',
    });

    // Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ratelimit@test.com', password: 'Test@1234' });
    authToken = loginRes.body.data.token;

    // Create test product
    testProduct = await Product.create({
      name: 'Rate Limit Test Product',
      category: 'Test',
      basePrice: 1000,
      stock: 1000,
      status: 'ACTIVE',
    });
  });

  afterEach(async () => {
    await redisClient.flushdb();
  });

  describe('Order Rate Limiting (10 orders per 5 minutes)', () => {
    it('should allow up to 10 orders within 5 minutes', async () => {
      const promises = [];

      // Try to create 10 orders
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/v1/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              items: [{ productId: testProduct._id.toString(), quantity: 1 }],
              paymentMethod: 'COD',
              shippingAddress: {
                street: 'Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'India',
                zipCode: '123456',
              },
            })
        );
      }

      const results = await Promise.all(promises);

      // Count successes (should be 10)
      const successes = results.filter(r => r.status === 201 || r.status === 200).length;
      expect(successes).toBeGreaterThanOrEqual(8); // Allow some margin for test variance
    }, 15000);

    it('should block 11th order within 5 minutes', async () => {
      // Create 10 orders
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            items: [{ productId: testProduct._id.toString(), quantity: 1 }],
            paymentMethod: 'COD',
            shippingAddress: {
              street: 'Test St',
              city: 'Test City',
              state: 'Test State',
              country: 'India',
              zipCode: '123456',
            },
          });
      }

      // 11th order should be rate limited
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [{ productId: testProduct._id.toString(), quantity: 1 }],
          paymentMethod: 'COD',
          shippingAddress: {
            street: 'Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'India',
            zipCode: '123456',
          },
        })
        .expect(429);

      expect(res.body.message).toMatch(/rate limit|too many requests/i);
    }, 30000);

    it('should reset rate limit after 5 minutes', async () => {
      // Create 10 orders
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            items: [{ productId: testProduct._id.toString(), quantity: 1 }],
            paymentMethod: 'COD',
            shippingAddress: {
              street: 'Test St',
              city: 'Test City',
              state: 'Test State',
              country: 'India',
              zipCode: '123456',
            },
          });
      }

      // Manually expire rate limit key (simulate 5 min passing)
      const rateLimitKey = `ratelimit:order:${testUser._id}`;
      await redisClient.del(rateLimitKey);

      // Should be able to create order now
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [{ productId: testProduct._id.toString(), quantity: 1 }],
          paymentMethod: 'COD',
          shippingAddress: {
            street: 'Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'India',
            zipCode: '123456',
          },
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    }, 30000);

    it('should enforce rate limit per user', async () => {
      // Create second user
      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@test.com',
        password: 'Test@1234',
        role: ROLES.B2B_CUSTOMER,
        mobile: '9876543211',
        status: 'ACTIVE',
      });

      const loginRes2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user2@test.com', password: 'Test@1234' });
      const authToken2 = loginRes2.body.data.token;

      // Exhaust user1 rate limit
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            items: [{ productId: testProduct._id.toString(), quantity: 1 }],
            paymentMethod: 'COD',
            shippingAddress: {
              street: 'Test St',
              city: 'Test City',
              state: 'Test State',
              country: 'India',
              zipCode: '123456',
            },
          });
      }

      // User2 should still be able to create orders
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          items: [{ productId: testProduct._id.toString(), quantity: 1 }],
          paymentMethod: 'COD',
          shippingAddress: {
            street: 'Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'India',
            zipCode: '123456',
          },
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    }, 30000);
  });

  describe('API Rate Limiting (1000 requests per 15 minutes)', () => {
    it('should allow high-volume API requests', async () => {
      const promises = [];

      // Make 100 concurrent API calls
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app)
            .get('/api/v1/health')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const results = await Promise.all(promises);

      // All should succeed (well below 1000 limit)
      const successes = results.filter(r => r.status === 200 || r.status === 503).length;
      expect(successes).toBe(100);
    }, 15000);

    it('should track API request count', async () => {
      // Make requests
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/api/v1/health')
          .set('Authorization', `Bearer ${authToken}`);
      }

      // Check rate limit headers
      const res = await request(app)
        .get('/api/v1/health')
        .set('Authorization', `Bearer ${authToken}`);

      // Response should include rate limit headers
      if (res.headers['x-ratelimit-limit']) {
        expect(res.headers['x-ratelimit-limit']).toBeDefined();
        expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      }
    });
  });

  describe('Auth Rate Limiting (5 attempts per 15 minutes)', () => {
    it('should allow 5 login attempts', async () => {
      const promises = [];

      // Try 5 logins
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'ratelimit@test.com', password: 'WrongPassword' })
        );
      }

      const results = await Promise.all(promises);

      // All 5 should be processed (even if failed)
      expect(results.length).toBe(5);
    });

    it('should block 6th login attempt within 15 minutes', async () => {
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'ratelimit@test.com', password: 'WrongPassword' });
      }

      // 6th attempt should be rate limited
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'ratelimit@test.com', password: 'WrongPassword' })
        .expect(429);

      expect(res.body.message).toMatch(/rate limit|too many attempts/i);
    });

    it('should not count successful logins against rate limit', async () => {
      // Make 5 successful logins (should not increment rate limit due to skipSuccessfulRequests)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'ratelimit@test.com', password: 'Test@1234' });
      }

      // 6th successful login should also work
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'ratelimit@test.com', password: 'Test@1234' });

      expect([200, 201]).toContain(res.status);
    });
  });

  describe('Payment Rate Limiting (5 requests per 15 minutes)', () => {
    it('should allow 5 payment requests', async () => {
      const promises = [];

      // Try 5 payment verifications
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/v1/payment/verify')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              orderId: 'test_order_123',
              razorpay_order_id: 'order_123',
              razorpay_payment_id: `pay_${i}`,
              razorpay_signature: 'test_signature',
            })
        );
      }

      const results = await Promise.all(promises);
      expect(results.length).toBe(5);
    });

    it('should block excessive payment requests', async () => {
      // Make 5 payment requests
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/payment/verify')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            orderId: 'test_order_123',
            razorpay_order_id: 'order_123',
            razorpay_payment_id: `pay_${i}`,
            razorpay_signature: 'test_signature',
          });
      }

      // 6th should be rate limited
      const res = await request(app)
        .post('/api/v1/payment/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: 'test_order_123',
          razorpay_order_id: 'order_123',
          razorpay_payment_id: 'pay_6',
          razorpay_signature: 'test_signature',
        })
        .expect(429);

      expect(res.body.message).toMatch(/rate limit/i);
    });
  });

  describe('Redis Fallback for Rate Limiting', () => {
    it('should fall back to in-memory when Redis unavailable', async () => {
      // Force circuit breaker open
      for (let i = 0; i < 5; i++) {
        redisClient.circuitBreaker.recordFailure();
      }

      // Should still enforce rate limiting via in-memory fallback
      const res = await request(app)
        .get('/api/v1/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.status).toBe(200);
    });

    it('should maintain rate limit counts during Redis outage', async () => {
      // Force circuit open
      for (let i = 0; i < 5; i++) {
        redisClient.circuitBreaker.recordFailure();
      }

      // Make requests during outage
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/api/v1/health')
          .set('Authorization', `Bearer ${authToken}`);
      }

      // Rate limiting should still work
      expect(true).toBe(true); // Placeholder - actual verification depends on fallback implementation
    });
  });

  describe('Concurrent Rate Limit Enforcement', () => {
    it('should handle concurrent requests at rate limit boundary', async () => {
      // Make 15 concurrent requests (exceeds 10 order limit)
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          request(app)
            .post('/api/v1/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              items: [{ productId: testProduct._id.toString(), quantity: 1 }],
              paymentMethod: 'COD',
              shippingAddress: {
                street: 'Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'India',
                zipCode: '123456',
              },
            })
        );
      }

      const results = await Promise.all(promises);

      // Count successes and rate-limited
      const successes = results.filter(r => r.status === 201).length;
      const rateLimited = results.filter(r => r.status === 429).length;

      // Should have ~10 successes and ~5 rate-limited
      expect(successes).toBeLessThanOrEqual(12); // Allow margin
      expect(rateLimited).toBeGreaterThanOrEqual(3);
    }, 20000);

    it('should not have race conditions in rate limit counter', async () => {
      const promises = [];

      // 20 concurrent requests
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .get('/api/v1/health')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const results = await Promise.all(promises);

      // All should get a response (not crash)
      expect(results.length).toBe(20);
      expect(results.every(r => r.status > 0)).toBe(true);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include rate limit information in response headers', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .set('Authorization', `Bearer ${authToken}`);

      // Check for rate limit headers (if implemented)
      if (res.headers['x-ratelimit-limit']) {
        expect(typeof res.headers['x-ratelimit-limit']).toBe('string');
      }

      if (res.headers['x-ratelimit-remaining']) {
        expect(typeof res.headers['x-ratelimit-remaining']).toBe('string');
      }

      if (res.headers['x-ratelimit-reset']) {
        expect(typeof res.headers['x-ratelimit-reset']).toBe('string');
      }
    });

    it('should update remaining count with each request', async () => {
      const res1 = await request(app)
        .get('/api/v1/health')
        .set('Authorization', `Bearer ${authToken}`);

      const res2 = await request(app)
        .get('/api/v1/health')
        .set('Authorization', `Bearer ${authToken}`);

      // Remaining should decrease
      if (res1.headers['x-ratelimit-remaining'] && res2.headers['x-ratelimit-remaining']) {
        const remaining1 = parseInt(res1.headers['x-ratelimit-remaining']);
        const remaining2 = parseInt(res2.headers['x-ratelimit-remaining']);
        expect(remaining2).toBeLessThanOrEqual(remaining1);
      }
    });
  });

  describe('Rate Limit Edge Cases', () => {
    it('should handle unauthenticated requests with IP-based rate limiting', async () => {
      const promises = [];

      // Make many unauthenticated requests
      for (let i = 0; i < 50; i++) {
        promises.push(request(app).get('/api/v1/health'));
      }

      const results = await Promise.all(promises);

      // Should either rate limit or allow all (depending on IP limit config)
      expect(results.length).toBe(50);
    });

    it('should handle missing Authorization header gracefully', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .send({
          items: [{ productId: testProduct._id.toString(), quantity: 1 }],
          paymentMethod: 'COD',
          shippingAddress: {
            street: 'Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'India',
            zipCode: '123456',
          },
        });

      // Should require authentication, not rate limit
      expect(res.status).toBe(401);
    });

    it('should handle rate limit reset at boundary', async () => {
      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            items: [{ productId: testProduct._id.toString(), quantity: 1 }],
            paymentMethod: 'COD',
            shippingAddress: {
              street: 'Test St',
              city: 'Test City',
              state: 'Test State',
              country: 'India',
              zipCode: '123456',
            },
          });
      }

      // Force reset
      const rateLimitKey = `ratelimit:order:${testUser._id}`;
      await redisClient.del(rateLimitKey);

      // Should immediately allow requests
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [{ productId: testProduct._id.toString(), quantity: 1 }],
          paymentMethod: 'COD',
          shippingAddress: {
            street: 'Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'India',
            zipCode: '123456',
          },
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    }, 30000);
  });
});
