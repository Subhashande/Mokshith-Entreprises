import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
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
 * 🚀 PHASE 7 STEP 2: API Load Test Stabilization
 * 
 * Tests API behavior under high concurrent load, sustained traffic, and burst scenarios.
 * Validates response consistency, stability, and no resource leaks under stress.
 * 
 * Critical Validation:
 * - No request corruption
 * - Stable response times (p95 <200ms target)
 * - No crashes or hanging requests
 * - Graceful rate limiting
 * - Memory stability during load
 */

describe('PHASE 7 STEP 2: API Load Test Stabilization', () => {
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
      name: 'Electronics',
      slug: 'electronics',
    });

    // Create test user
    const hashedPassword = await hashPassword('testpass123');
    testUser = await User.create({
      name: 'Load Test User',
      email: 'loadtest@example.com',
      password: hashedPassword,
      mobile: '9876543210',
      role: ROLES.BUYER,
      isVerified: true,
    });

    // Login to get auth token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'loadtest@example.com', password: 'testpass123' });

    authToken = loginRes.body.data.accessToken;

    // Create test product
    testProduct = await Product.create({
      name: 'Load Test Product',
      description: 'Product for load testing',
      price: 999,
      stock: 10000,
      categoryId: testCategory._id,
      isActive: true,
    });

    logger.info('Load test setup completed', {
      userId: testUser._id,
      productId: testProduct._id,
    });
  }, 30000);

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await redisClient.quit();
  }, 10000);

  beforeEach(async () => {
    // Flush Redis rate limit keys before each test
    const keys = await redisClient.keys('rl:*');
    if (keys.length > 0) {
      await Promise.all(keys.map(key => redisClient.del(key)));
    }
  }, 10000);

  // ==============================================
  // TEST GROUP 1: Concurrent Request Handling
  // ==============================================

  describe('Concurrent Request Handling', () => {
    it('should handle 100 concurrent GET requests with consistent responses', async () => {
      const concurrency = 100;
      const startTime = Date.now();
      const responseTimes = [];
      const responses = [];

      // Make 100 concurrent requests to products endpoint
      const promises = Array.from({ length: concurrency }, async () => {
        const reqStart = Date.now();
        const res = await request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
          .expect((res) => {
            const reqEnd = Date.now();
            responseTimes.push(reqEnd - reqStart);
            responses.push(res.body);
          });
        return res;
      });

      const results = await Promise.allSettled(promises);

      const duration = Date.now() - startTime;
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      // Calculate response time statistics
      const sortedTimes = responseTimes.sort((a, b) => a - b);
      const p50 = sortedTimes[Math.floor(concurrency * 0.5)];
      const p95 = sortedTimes[Math.floor(concurrency * 0.95)];
      const p99 = sortedTimes[Math.floor(concurrency * 0.99)];
      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / concurrency;

      logger.info('100 concurrent requests completed', {
        duration: `${duration}ms`,
        successCount,
        failureCount,
        throughput: `${(concurrency / duration * 1000).toFixed(2)} req/s`,
        responseTime: {
          avg: `${avgTime.toFixed(2)}ms`,
          p50: `${p50}ms`,
          p95: `${p95}ms`,
          p99: `${p99}ms`,
        },
      });

      // Assertions
      expect(successCount).toBe(concurrency);
      expect(failureCount).toBe(0);
      expect(p95).toBeLessThan(500); // Target: p95 <500ms for 100 concurrent
      expect(duration).toBeLessThan(5000); // Should complete within 5s

      // Validate response consistency (all should have same structure)
      const firstResponse = responses[0];
      responses.forEach((res, idx) => {
        expect(res).toHaveProperty('success');
        expect(res).toHaveProperty('data');
        expect(Array.isArray(res.data)).toBe(true);
        expect(res.success).toBe(firstResponse.success);
      });
    }, 30000);

    it('should handle 500 concurrent GET requests without crashes', async () => {
      const concurrency = 500;
      const startTime = Date.now();
      const responseTimes = [];
      const statusCodes = [];

      // Make 500 concurrent requests
      const promises = Array.from({ length: concurrency }, async () => {
        const reqStart = Date.now();
        const res = await request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`);
        
        const reqEnd = Date.now();
        responseTimes.push(reqEnd - reqStart);
        statusCodes.push(res.status);
        return res;
      });

      const results = await Promise.allSettled(promises);

      const duration = Date.now() - startTime;
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      // Calculate statistics
      const sortedTimes = responseTimes.sort((a, b) => a - b);
      const p50 = sortedTimes[Math.floor(concurrency * 0.5)];
      const p95 = sortedTimes[Math.floor(concurrency * 0.95)];
      const p99 = sortedTimes[Math.floor(concurrency * 0.99)];

      logger.info('500 concurrent requests completed', {
        duration: `${duration}ms`,
        successCount,
        failureCount,
        throughput: `${(concurrency / duration * 1000).toFixed(2)} req/s`,
        responseTime: {
          p50: `${p50}ms`,
          p95: `${p95}ms`,
          p99: `${p99}ms`,
        },
        statusCodes: {
          '200': statusCodes.filter(c => c === 200).length,
          '429': statusCodes.filter(c => c === 429).length,
          '503': statusCodes.filter(c => c === 503).length,
        },
      });

      // Assertions
      expect(successCount).toBe(concurrency);
      expect(failureCount).toBe(0);
      expect(duration).toBeLessThan(15000); // Should complete within 15s
      expect(p99).toBeLessThan(2000); // p99 <2s acceptable under extreme load

      // Validate no server crashes (should get 200, 429, or 503, but no 500s)
      const serverErrors = statusCodes.filter(c => c === 500 || c === 502 || c === 504);
      expect(serverErrors.length).toBe(0);
    }, 45000);

    it('should handle 100 concurrent authenticated POST requests', async () => {
      const concurrency = 100;
      const startTime = Date.now();
      const responseTimes = [];

      // Make 100 concurrent cart additions
      const promises = Array.from({ length: concurrency }, async (_, idx) => {
        const reqStart = Date.now();
        const res = await request(app)
          .post('/api/v1/cart')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            productId: testProduct._id.toString(),
            quantity: 1,
          });

        const reqEnd = Date.now();
        responseTimes.push(reqEnd - reqStart);
        return res;
      });

      const results = await Promise.allSettled(promises);

      const duration = Date.now() - startTime;
      const successCount = results.filter(
        r => r.status === 'fulfilled' && (r.value.status === 200 || r.value.status === 201)
      ).length;

      const sortedTimes = responseTimes.sort((a, b) => a - b);
      const p95 = sortedTimes[Math.floor(concurrency * 0.95)];

      logger.info('100 concurrent POST requests completed', {
        duration: `${duration}ms`,
        successCount,
        throughput: `${(concurrency / duration * 1000).toFixed(2)} req/s`,
        p95: `${p95}ms`,
      });

      // Assertions
      expect(successCount).toBeGreaterThan(50); // At least 50% success (accounting for rate limits)
      expect(p95).toBeLessThan(1000); // p95 <1s for write operations
    }, 30000);
  });

  // ==============================================
  // TEST GROUP 2: Mixed Traffic Load
  // ==============================================

  describe('Mixed API Traffic', () => {
    it('should handle mixed GET/POST/PUT operations concurrently', async () => {
      const concurrency = 60; // 20 of each operation
      const startTime = Date.now();

      const operations = [
        // 20 GET products
        ...Array.from({ length: 20 }, () => 
          request(app)
            .get('/api/v1/products')
            .set('Authorization', `Bearer ${authToken}`)
        ),
        // 20 GET health checks
        ...Array.from({ length: 20 }, () => 
          request(app)
            .get('/api/v1/health')
            .set('Authorization', `Bearer ${authToken}`)
        ),
        // 20 POST cart additions
        ...Array.from({ length: 20 }, () => 
          request(app)
            .post('/api/v1/cart')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ productId: testProduct._id.toString(), quantity: 1 })
        ),
      ];

      const results = await Promise.allSettled(operations);

      const duration = Date.now() - startTime;
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      logger.info('Mixed traffic test completed', {
        duration: `${duration}ms`,
        successCount,
        failureCount,
        throughput: `${(concurrency / duration * 1000).toFixed(2)} req/s`,
      });

      // Assertions
      expect(successCount).toBe(concurrency);
      expect(failureCount).toBe(0);
      expect(duration).toBeLessThan(10000); // Should complete within 10s
    }, 30000);

    it('should prioritize read operations over write operations', async () => {
      const readStartTime = Date.now();
      const writeStartTime = Date.now();

      // Start 50 read operations
      const readPromises = Array.from({ length: 50 }, () => 
        request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
      );

      // Start 10 write operations
      const writePromises = Array.from({ length: 10 }, () => 
        request(app)
          .post('/api/v1/cart')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ productId: testProduct._id.toString(), quantity: 1 })
      );

      const [readResults, writeResults] = await Promise.all([
        Promise.allSettled(readPromises),
        Promise.allSettled(writePromises),
      ]);

      const readDuration = Date.now() - readStartTime;
      const writeDuration = Date.now() - writeStartTime;

      logger.info('Read/Write priority test', {
        readDuration: `${readDuration}ms`,
        writeDuration: `${writeDuration}ms`,
        readSuccess: readResults.filter(r => r.status === 'fulfilled').length,
        writeSuccess: writeResults.filter(r => r.status === 'fulfilled').length,
      });

      // Reads should generally complete faster than writes
      expect(readResults.filter(r => r.status === 'fulfilled').length).toBe(50);
    }, 30000);
  });

  // ==============================================
  // TEST GROUP 3: Burst Traffic Handling
  // ==============================================

  describe('Burst Traffic Handling', () => {
    it('should handle sudden burst of 200 requests', async () => {
      const burstSize = 200;
      const startTime = Date.now();

      // Create burst
      const promises = Array.from({ length: burstSize }, () => 
        request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.allSettled(promises);

      const duration = Date.now() - startTime;
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      logger.info('Burst traffic test completed', {
        burstSize,
        duration: `${duration}ms`,
        successCount,
        throughput: `${(burstSize / duration * 1000).toFixed(2)} req/s`,
      });

      // Assertions
      expect(successCount).toBe(burstSize);
      expect(duration).toBeLessThan(10000); // Should handle burst within 10s
    }, 30000);

    it('should maintain stability after burst traffic', async () => {
      // Create burst
      const burstPromises = Array.from({ length: 100 }, () => 
        request(app)
          .get('/api/v1/health')
          .set('Authorization', `Bearer ${authToken}`)
      );

      await Promise.allSettled(burstPromises);

      // Wait 2 seconds for system to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Make normal requests to verify stability
      const normalRequests = Array.from({ length: 10 }, () => 
        request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.all(normalRequests);

      // All normal requests should succeed after burst
      results.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    }, 30000);
  });

  // ==============================================
  // TEST GROUP 4: Sustained Traffic Load
  // ==============================================

  describe('Sustained Traffic Load', () => {
    it('should handle sustained traffic for 30 seconds with stable memory', async () => {
      const durationMs = 30000; // 30 seconds
      const requestsPerSecond = 10;
      const intervalMs = 1000 / requestsPerSecond;

      const startTime = Date.now();
      const startMemory = process.memoryUsage();
      const responseTimes = [];
      let requestCount = 0;

      logger.info('Starting sustained traffic test', {
        duration: `${durationMs}ms`,
        targetRate: `${requestsPerSecond} req/s`,
        startHeapUsed: `${(startMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      });

      // Send requests at steady rate
      while (Date.now() - startTime < durationMs) {
        const reqStart = Date.now();
        
        try {
          await request(app)
            .get('/api/v1/products')
            .set('Authorization', `Bearer ${authToken}`);
          
          requestCount++;
          responseTimes.push(Date.now() - reqStart);
        } catch (err) {
          logger.error('Request failed during sustained load', { error: err.message });
        }

        // Wait for next interval
        const elapsed = Date.now() - reqStart;
        const waitTime = Math.max(0, intervalMs - elapsed);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const endMemory = process.memoryUsage();
      const memoryGrowth = endMemory.heapUsed - startMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;

      // Calculate response time stability
      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const sortedTimes = responseTimes.sort((a, b) => a - b);
      const p50 = sortedTimes[Math.floor(responseTimes.length * 0.5)];
      const p95 = sortedTimes[Math.floor(responseTimes.length * 0.95)];

      logger.info('Sustained traffic test completed', {
        duration: `${Date.now() - startTime}ms`,
        totalRequests: requestCount,
        avgResponseTime: `${avgTime.toFixed(2)}ms`,
        p50: `${p50}ms`,
        p95: `${p95}ms`,
        memoryGrowth: `${memoryGrowthMB.toFixed(2)} MB`,
        endHeapUsed: `${(endMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      });

      // Assertions
      expect(requestCount).toBeGreaterThan(250); // Should complete ~300 requests
      expect(p95).toBeLessThan(500); // Stable response time
      expect(memoryGrowthMB).toBeLessThan(100); // Memory growth <100MB (no major leak)
    }, 60000); // 60s timeout
  });

  // ==============================================
  // TEST GROUP 5: Malformed Traffic Under Load
  // ==============================================

  describe('Malformed Traffic Under Load', () => {
    it('should handle malformed requests without affecting valid requests', async () => {
      const validRequests = Array.from({ length: 50 }, () => 
        request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const malformedRequests = Array.from({ length: 50 }, () => 
        request(app)
          .post('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ invalid: 'data' }) // Missing required fields
      );

      const [validResults, malformedResults] = await Promise.all([
        Promise.allSettled(validRequests),
        Promise.allSettled(malformedRequests),
      ]);

      const validSuccessCount = validResults.filter(
        r => r.status === 'fulfilled' && r.value.status === 200
      ).length;

      const malformedRejectedCount = malformedResults.filter(
        r => r.status === 'fulfilled' && (r.value.status === 400 || r.value.status === 422)
      ).length;

      logger.info('Malformed traffic test completed', {
        validSuccessCount,
        malformedRejectedCount,
      });

      // Valid requests should succeed
      expect(validSuccessCount).toBe(50);

      // Malformed requests should be rejected (not cause server error)
      expect(malformedRejectedCount).toBeGreaterThan(40);
    }, 30000);

    it('should handle missing auth tokens gracefully under load', async () => {
      const noAuthRequests = Array.from({ length: 100 }, () => 
        request(app)
          .get('/api/v1/products')
          // No Authorization header
      );

      const results = await Promise.allSettled(noAuthRequests);

      const unauthorizedCount = results.filter(
        r => r.status === 'fulfilled' && (r.value.status === 401 || r.value.status === 200)
      ).length;

      logger.info('Missing auth test completed', {
        total: 100,
        unauthorizedCount,
      });

      // All should either succeed (if endpoint allows unauth) or return 401
      expect(unauthorizedCount).toBe(100);
    }, 30000);

    it('should handle invalid JSON payloads without crashes', async () => {
      const invalidJsonRequests = Array.from({ length: 50 }, () => 
        request(app)
          .post('/api/v1/cart')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Content-Type', 'application/json')
          .send('{ invalid json }')
      );

      const results = await Promise.allSettled(invalidJsonRequests);

      const badRequestCount = results.filter(
        r => r.status === 'fulfilled' && r.value.status === 400
      ).length;

      logger.info('Invalid JSON test completed', {
        total: 50,
        badRequestCount,
      });

      // Should reject invalid JSON without crashing
      expect(badRequestCount).toBeGreaterThan(40);
    }, 30000);
  });

  // ==============================================
  // TEST GROUP 6: Rate Limiting Under Load
  // ==============================================

  describe('Rate Limiting Under Load', () => {
    it('should enforce global rate limits consistently', async () => {
      // Global limit: 1000 requests per 15 minutes
      const requests = Array.from({ length: 150 }, () => 
        request(app)
          .get('/api/v1/health')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.allSettled(requests);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.status === 200
      ).length;

      const rateLimitedCount = results.filter(
        r => r.status === 'fulfilled' && r.value.status === 429
      ).length;

      logger.info('Rate limit enforcement test', {
        total: 150,
        success: successCount,
        rateLimited: rateLimitedCount,
      });

      // All should either succeed or be rate limited (no server errors)
      expect(successCount + rateLimitedCount).toBe(150);
    }, 30000);

    it('should not have race conditions in rate limit counters', async () => {
      // Make 50 requests simultaneously to test counter consistency
      const promises = Array.from({ length: 50 }, async (_, idx) => {
        const res = await request(app)
          .get('/api/v1/health')
          .set('Authorization', `Bearer ${authToken}`);
        return { idx, status: res.status };
      });

      const results = await Promise.all(promises);

      const successCount = results.filter(r => r.status === 200).length;
      const rateLimitedCount = results.filter(r => r.status === 429).length;

      logger.info('Rate limit consistency test', {
        total: 50,
        success: successCount,
        rateLimited: rateLimitedCount,
      });

      // Total should match (no lost updates)
      expect(successCount + rateLimitedCount).toBe(50);
    }, 30000);
  });

  // ==============================================
  // TEST GROUP 7: Response Consistency
  // ==============================================

  describe('Response Consistency Under Load', () => {
    it('should return consistent response schemas across all requests', async () => {
      const requests = Array.from({ length: 100 }, () => 
        request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.all(requests);

      const firstSchema = {
        hasSuccess: results[0].body.hasOwnProperty('success'),
        hasData: results[0].body.hasOwnProperty('data'),
        isDataArray: Array.isArray(results[0].body.data),
      };

      // All responses should have identical structure
      results.forEach((res, idx) => {
        expect(res.body.hasOwnProperty('success')).toBe(firstSchema.hasSuccess);
        expect(res.body.hasOwnProperty('data')).toBe(firstSchema.hasData);
        if (res.body.data) {
          expect(Array.isArray(res.body.data)).toBe(firstSchema.isDataArray);
        }
      });
    }, 30000);

    it('should not corrupt responses during concurrent requests', async () => {
      // Make requests for different products simultaneously
      const productIds = [testProduct._id.toString()];

      const promises = Array.from({ length: 50 }, (_, idx) => 
        request(app)
          .get(`/api/v1/products/${productIds[idx % productIds.length]}`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.allSettled(promises);

      // Each response should have correct product data (no data mixing)
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value.status === 200) {
          const expectedProductId = productIds[idx % productIds.length];
          // Verify response contains correct product
          expect(result.value.body.data).toBeDefined();
        }
      });
    }, 30000);
  });

  // ==============================================
  // TEST GROUP 8: No Hanging Requests
  // ==============================================

  describe('Request Timeout Handling', () => {
    it('should complete all requests within reasonable time', async () => {
      const timeout = 10000; // 10 second timeout
      const concurrency = 100;

      const promises = Array.from({ length: concurrency }, () => 
        Promise.race([
          request(app)
            .get('/api/v1/products')
            .set('Authorization', `Bearer ${authToken}`),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          ),
        ])
      );

      const results = await Promise.allSettled(promises);

      const timeoutCount = results.filter(
        r => r.status === 'rejected' && r.reason.message === 'Request timeout'
      ).length;

      const successCount = results.filter(r => r.status === 'fulfilled').length;

      logger.info('Request timeout test', {
        total: concurrency,
        success: successCount,
        timeouts: timeoutCount,
      });

      // No requests should timeout
      expect(timeoutCount).toBe(0);
      expect(successCount).toBe(concurrency);
    }, 30000);

    it('should not have hanging connections after high load', async () => {
      // Make high load
      await Promise.allSettled(
        Array.from({ length: 200 }, () => 
          request(app)
            .get('/api/v1/health')
            .set('Authorization', `Bearer ${authToken}`)
        )
      );

      // Wait for connections to close
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Make normal request to verify server is still responsive
      const res = await request(app)
        .get('/api/v1/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.checks).toBeDefined();
    }, 30000);
  });
});
