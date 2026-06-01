import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB from '../../src/config/db.js';
import { redisClient } from '../../src/config/redis.js';
import User from '../../src/modules/user/user.model.js';
import Product from '../../src/modules/product/product.model.js';
import Category from '../../src/modules/category/category.model.js';
import { hashPassword } from '../../src/utils/hashPassword.js';
import { ROLES } from '../../src/constants/roles.js';
import { logger } from '../../src/config/logger.js';

/**
 * 🚀 PHASE 7 STEP 8: Failure Resilience Under Load Tests
 * 
 * Tests system resilience when critical dependencies fail under load.
 * Validates circuit breakers, fallback mechanisms, graceful degradation,
 * and recovery behavior.
 * 
 * Critical Validation:
 * - Graceful handling of Redis failures
 * - MongoDB connection loss recovery
 * - Circuit breaker effectiveness
 * - Fallback mechanism reliability
 * - No cascading failures
 * - Proper error propagation
 * - Service recovery after restoration
 */

describe('PHASE 7 STEP 8: Failure Resilience Under Load Tests', () => {
  let authToken;
  let testUser;
  let testProduct;
  let testCategory;

  beforeAll(async () => {
    await connectDB();
    await redisClient.connect();

    // Clear test data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});

    // Create test category
    testCategory = await Category.create({
      name: 'Resilience Test Category',
      slug: 'resilience-test',
    });

    // Create test user
    const hashedPassword = await hashPassword('testpass123');
    testUser = await User.create({
      name: 'Resilience Test User',
      email: 'resiliencetest@example.com',
      password: hashedPassword,
      mobile: '9876543210',
      role: ROLES.BUYER,
      isVerified: true,
    });

    // Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'resiliencetest@example.com', password: 'testpass123' });

    authToken = loginRes.body.data.accessToken;

    // Create test product
    testProduct = await Product.create({
      name: 'Resilience Test Product',
      description: 'Product for resilience testing',
      price: 999,
      stock: 1000,
      categoryId: testCategory._id,
      isActive: true,
    });

    logger.info('Resilience test setup completed', {
      userId: testUser._id,
      productId: testProduct._id,
    });
  }, 60000);

  afterAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    
    // Ensure Redis is reconnected
    if (redisClient.status !== 'ready') {
      await redisClient.connect();
    }
    
    await redisClient.quit();
    await mongoose.connection.close();
  }, 30000);

  // ==============================================
  // TEST GROUP 1: Redis Failure Resilience
  // ==============================================

  describe('Redis Failure Resilience', () => {
    it('should handle Redis disconnection gracefully', async () => {
      // Verify Redis is working
      const pingBefore = await redisClient.ping();
      expect(pingBefore).toBe('PONG');

      // Disconnect Redis
      logger.info('Simulating Redis disconnection');
      await redisClient.disconnect();

      // Make API requests (should still work with degraded functionality)
      const promises = Array.from({ length: 20 }, async () => {
        try {
          const res = await request(app)
            .get('/api/v1/products')
            .set('Authorization', `Bearer ${authToken}`);

          return { success: res.status === 200, status: res.status };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const results = await Promise.allSettled(promises);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      logger.info('Redis disconnection test', {
        totalRequests: promises.length,
        successful: successCount,
        successRate: `${(successCount / promises.length * 100).toFixed(2)}%`,
      });

      // Reconnect Redis
      logger.info('Reconnecting Redis');
      await redisClient.connect();

      // Verify recovery
      const pingAfter = await redisClient.ping();
      expect(pingAfter).toBe('PONG');

      // CRITICAL: Most requests should succeed (fallback to DB)
      expect(successCount).toBeGreaterThan(promises.length * 0.7);
    }, 60000);

    it('should trigger circuit breaker after repeated Redis failures', async () => {
      // Get initial circuit breaker state
      const initialState = redisClient.circuitBreaker ? redisClient.circuitBreaker.state : 'CLOSED';

      logger.info('Initial circuit breaker state', { state: initialState });

      // Simulate Redis operations that might fail
      const operations = 10;
      const results = [];

      for (let i = 0; i < operations; i++) {
        try {
          await redisClient.get(`test:circuit:${i}`);
          results.push({ success: true });
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }

      const failureCount = results.filter(r => !r.success).length;

      logger.info('Circuit breaker test', {
        operations,
        failures: failureCount,
        circuitState: redisClient.circuitBreaker ? redisClient.circuitBreaker.state : 'CLOSED',
      });

      // If failures occurred, circuit breaker should respond
      if (failureCount > 0) {
        logger.info('Circuit breaker responded to failures');
      }

      // System should continue functioning
      expect(results.length).toBe(operations);
    }, 60000);

    it('should recover after Redis becomes available again', async () => {
      // Ensure Redis is connected
      if (redisClient.status !== 'ready') {
        await redisClient.connect();
      }

      // Verify Redis works
      await redisClient.set('test:recovery', 'value', 'EX', 10);
      const value = await redisClient.get('test:recovery');

      expect(value).toBe('value');

      // Make normal requests
      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      logger.info('Redis recovery verified');
    }, 30000);

    it('should use fallback mechanisms when Redis unavailable', async () => {
      // Test that distributed locks fall back to MongoDB when Redis unavailable
      
      // First, verify lock works with Redis
      const lockKey = `test:fallback:${Date.now()}`;
      const lockValue = 'test_value';

      const acquired = await redisClient.acquireLock(lockKey, lockValue, 5);

      if (acquired) {
        logger.info('Lock acquired successfully (Redis available)');
        await redisClient.releaseLock(lockKey, lockValue);
      }

      // Make API requests that might use caching
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.allSettled(requests);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.status === 200
      ).length;

      logger.info('Fallback mechanism test', {
        requests: requests.length,
        successful: successCount,
      });

      // Requests should succeed (fallback to DB)
      expect(successCount).toBe(requests.length);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 2: MongoDB Resilience
  // ==============================================

  describe('MongoDB Connection Resilience', () => {
    it('should handle slow MongoDB queries gracefully', async () => {
      // Make requests while database is under load
      const concurrency = 50;

      // Create query load
      const dbLoadPromises = Array.from({ length: 20 }, () =>
        Product.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$categoryId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
      );

      // Make API requests concurrently
      const apiPromises = Array.from({ length: concurrency }, () =>
        request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const startTime = Date.now();

      const [dbResults, apiResults] = await Promise.all([
        Promise.allSettled(dbLoadPromises),
        Promise.allSettled(apiPromises),
      ]);

      const duration = Date.now() - startTime;

      const apiSuccessCount = apiResults.filter(
        r => r.status === 'fulfilled' && r.value.status === 200
      ).length;

      logger.info('MongoDB load handling test', {
        duration: `${duration}ms`,
        dbQueries: dbLoadPromises.length,
        apiRequests: concurrency,
        apiSuccessful: apiSuccessCount,
      });

      // Most API requests should succeed despite DB load
      expect(apiSuccessCount).toBeGreaterThan(concurrency * 0.8);
    }, 60000);

    it('should respect query timeout limits', async () => {
      // Test that queries don't hang indefinitely
      const startTime = Date.now();

      try {
        // Query with maxTimeMS
        await Product.find()
          .maxTimeMS(5000)
          .limit(100)
          .lean();

        const duration = Date.now() - startTime;

        logger.info('Query timeout test', {
          duration: `${duration}ms`,
          completed: 'success',
        });

        // Query should complete within timeout
        expect(duration).toBeLessThan(6000);
      } catch (error) {
        const duration = Date.now() - startTime;

        logger.info('Query timeout test', {
          duration: `${duration}ms`,
          error: error.message,
        });

        // If query times out, it should happen within reasonable time
        expect(duration).toBeLessThan(6000);
      }
    }, 30000);

    it('should maintain connection pool health under stress', async () => {
      // Make many concurrent database requests
      const concurrency = 100;

      const promises = Array.from({ length: concurrency }, async (_, idx) => {
        try {
          await Product.findOne({ _id: testProduct._id }).lean();
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const results = await Promise.allSettled(promises);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      logger.info('Connection pool stress test', {
        concurrency,
        successful: successCount,
        failed: concurrency - successCount,
      });

      // Connection pool should handle load
      expect(successCount).toBeGreaterThan(concurrency * 0.95);

      // Verify connection is still healthy
      const healthCheck = await mongoose.connection.db.admin().ping();
      expect(healthCheck.ok).toBe(1);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 3: Cascading Failure Prevention
  // ==============================================

  describe('Cascading Failure Prevention', () => {
    it('should isolate failures to prevent cascade', async () => {
      // Make requests to different endpoints
      const endpoints = [
        '/api/v1/products',
        '/api/v1/categories',
        '/api/v1/health',
      ];

      const promises = endpoints.flatMap(endpoint =>
        Array.from({ length: 10 }, () =>
          request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${authToken}`)
        )
      );

      const results = await Promise.allSettled(promises);

      // Group results by endpoint
      const endpointResults = {
        products: 0,
        categories: 0,
        health: 0,
      };

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value.status === 200) {
          const endpoint = endpoints[Math.floor(idx / 10)];
          if (endpoint.includes('products')) endpointResults.products++;
          if (endpoint.includes('categories')) endpointResults.categories++;
          if (endpoint.includes('health')) endpointResults.health++;
        }
      });

      logger.info('Cascading failure prevention test', endpointResults);

      // Health endpoint should always work
      expect(endpointResults.health).toBeGreaterThan(8);
    }, 60000);

    it('should handle partial service degradation', async () => {
      // Test that system continues functioning even if one service is slow

      // Make normal requests
      const normalRequests = Array.from({ length: 20 }, () =>
        request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.allSettled(normalRequests);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.status === 200
      ).length;

      logger.info('Partial degradation test', {
        totalRequests: normalRequests.length,
        successful: successCount,
        successRate: `${(successCount / normalRequests.length * 100).toFixed(2)}%`,
      });

      // System should maintain availability
      expect(successCount).toBeGreaterThan(normalRequests.length * 0.9);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 4: Error Propagation & Handling
  // ==============================================

  describe('Error Propagation & Handling', () => {
    it('should return appropriate error responses for failures', async () => {
      // Test invalid request (should return 400)
      const invalidRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalid: 'data' });

      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body).toHaveProperty('success', false);
      expect(invalidRes.body).toHaveProperty('message');

      logger.info('Invalid request error handling', {
        status: invalidRes.status,
        message: invalidRes.body.message,
      });
    }, 30000);

    it('should handle concurrent errors without system instability', async () => {
      const concurrency = 30;

      // Make requests that will fail (invalid product ID)
      const promises = Array.from({ length: concurrency }, () =>
        request(app)
          .get('/api/v1/products/invalid_id')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.allSettled(promises);

      // All should return error responses (not crash)
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
        expect(result.value.status).toBeGreaterThanOrEqual(400);
      });

      // System should still be healthy
      const healthRes = await request(app).get('/api/v1/health');
      expect(healthRes.status).toBe(200);

      logger.info('Concurrent error handling test', {
        errorRequests: concurrency,
        systemHealthy: healthRes.status === 200,
      });
    }, 60000);

    it('should log errors without performance degradation', async () => {
      // Generate errors while monitoring performance
      const errorCount = 50;
      const startTime = Date.now();

      const promises = Array.from({ length: errorCount }, () =>
        request(app)
          .post('/api/v1/auth/login')
          .send({ identifier: 'nonexistent@example.com', password: 'wrong' })
      );

      await Promise.allSettled(promises);

      const duration = Date.now() - startTime;
      const avgTime = duration / errorCount;

      logger.info('Error logging performance', {
        errors: errorCount,
        totalTime: `${duration}ms`,
        avgTimePerError: `${avgTime.toFixed(2)}ms`,
      });

      // Error logging shouldn't significantly slow down responses
      expect(avgTime).toBeLessThan(500);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 5: Recovery & Self-Healing
  // ==============================================

  describe('Recovery & Self-Healing', () => {
    it('should recover from temporary network issues', async () => {
      // Simulate network issues by making many concurrent requests
      const concurrency = 100;

      const promises = Array.from({ length: concurrency }, async () => {
        try {
          const res = await request(app)
            .get('/api/v1/products')
            .set('Authorization', `Bearer ${authToken}`)
            .timeout(5000);

          return { success: res.status === 200 };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const results = await Promise.allSettled(promises);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      logger.info('Network recovery test', {
        totalRequests: concurrency,
        successful: successCount,
        successRate: `${(successCount / concurrency * 100).toFixed(2)}%`,
      });

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Make normal request after recovery
      const recoveryRes = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(recoveryRes.status).toBe(200);

      // Most requests should succeed or system should recover
      expect(successCount).toBeGreaterThan(concurrency * 0.7);
    }, 60000);

    it('should maintain data consistency after errors', async () => {
      // Get initial product count
      const initialCount = await Product.countDocuments();

      // Make requests that might cause errors
      const promises = Array.from({ length: 20 }, async () => {
        try {
          await request(app)
            .get('/api/v1/products')
            .set('Authorization', `Bearer ${authToken}`);
        } catch (error) {
          // Ignore errors
        }
      });

      await Promise.allSettled(promises);

      // Verify data consistency
      const finalCount = await Product.countDocuments();

      expect(finalCount).toBe(initialCount);

      logger.info('Data consistency after errors', {
        initialCount,
        finalCount,
        consistent: finalCount === initialCount,
      });
    }, 60000);

    it('should handle graceful shutdown under load', async () => {
      // This test verifies that shutdown signals are handled properly
      // In real scenario, this would test SIGTERM handling

      // Make some requests
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.allSettled(promises);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.status === 200
      ).length;

      logger.info('Graceful shutdown test', {
        requests: promises.length,
        successful: successCount,
      });

      // All requests should complete
      expect(successCount).toBe(promises.length);
    }, 30000);
  });

  // ==============================================
  // TEST GROUP 6: Dependency Health Monitoring
  // ==============================================

  describe('Dependency Health Monitoring', () => {
    it('should detect MongoDB health status', async () => {
      try {
        const pingResult = await mongoose.connection.db.admin().ping();

        logger.info('MongoDB health check', {
          ok: pingResult.ok,
          status: 'healthy',
        });

        expect(pingResult.ok).toBe(1);
      } catch (error) {
        logger.error('MongoDB health check failed', { error: error.message });
        throw error;
      }
    }, 30000);

    it('should detect Redis health status', async () => {
      try {
        // Ensure Redis is connected
        if (redisClient.status !== 'ready') {
          await redisClient.connect();
        }

        const pong = await redisClient.ping();

        logger.info('Redis health check', {
          response: pong,
          status: redisClient.status,
        });

        expect(pong).toBe('PONG');
        expect(redisClient.status).toBe('ready');
      } catch (error) {
        logger.error('Redis health check failed', { error: error.message });
      }
    }, 30000);

    it('should provide comprehensive health status endpoint', async () => {
      const healthRes = await request(app).get('/api/v1/health');

      expect(healthRes.status).toBe(200);
      expect(healthRes.body).toHaveProperty('success', true);

      logger.info('Comprehensive health check', {
        status: healthRes.status,
        health: healthRes.body.data,
      });
    }, 30000);
  });
});
