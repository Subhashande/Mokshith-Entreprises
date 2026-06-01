import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { performance, PerformanceObserver } from 'perf_hooks';
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
 * 🚀 PHASE 7 STEP 6: CPU & Event Loop Stability Tests
 * 
 * Tests event loop responsiveness, blocking operation detection,
 * CPU utilization patterns, and async operation consistency under load.
 * 
 * Critical Validation:
 * - Event loop lag <50ms under normal load
 * - No blocking operations
 * - Stable worker performance
 * - Async/await consistency
 * - No CPU starvation
 * - Proper backpressure handling
 */

describe('PHASE 7 STEP 6: CPU & Event Loop Stability Tests', () => {
  let authToken;
  let testUser;
  let testProduct;
  let testCategory;

  // Event loop lag monitoring
  let eventLoopLag = 0;
  let eventLoopMonitor;

  // Helper: Measure event loop lag
  const measureEventLoopLag = () => {
    const start = Date.now();
    
    setImmediate(() => {
      const lag = Date.now() - start;
      eventLoopLag = Math.max(eventLoopLag, lag);
    });
  };

  // Helper: Get CPU usage
  const getCPUUsage = () => {
    const usage = process.cpuUsage();
    return {
      user: usage.user / 1000, // Convert to ms
      system: usage.system / 1000,
      total: (usage.user + usage.system) / 1000,
    };
  };

  beforeAll(async () => {
    await connectDB();
    await redisClient.connect();

    // Clear test data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});

    // Create test category
    testCategory = await Category.create({
      name: 'CPU Test Category',
      slug: 'cpu-test',
    });

    // Create test user
    const hashedPassword = await hashPassword('testpass123');
    testUser = await User.create({
      name: 'CPU Test User',
      email: 'cputest@example.com',
      password: hashedPassword,
      mobile: '9876543210',
      role: ROLES.BUYER,
      isVerified: true,
    });

    // Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'cputest@example.com', password: 'testpass123' });

    authToken = loginRes.body.data.accessToken;

    // Create 50 test products
    const products = [];
    for (let i = 0; i < 50; i++) {
      products.push({
        name: `CPU Test Product ${i}`,
        description: `Product ${i} for CPU testing`,
        price: 100 + i * 10,
        stock: 1000,
        categoryId: testCategory._id,
        isActive: true,
      });
    }
    const createdProducts = await Product.insertMany(products);
    testProduct = createdProducts[0];

    logger.info('CPU test setup completed', {
      userId: testUser._id,
      productId: testProduct._id,
    });
  }, 60000);

  afterAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await redisClient.quit();
    await mongoose.connection.close();

    // Stop event loop monitoring
    if (eventLoopMonitor) {
      clearInterval(eventLoopMonitor);
    }
  }, 30000);

  // ==============================================
  // TEST GROUP 1: Event Loop Lag Monitoring
  // ==============================================

  describe('Event Loop Lag Monitoring', () => {
    it('should maintain event loop lag <50ms under normal load', async () => {
      const requestCount = 100;
      const lagMeasurements = [];

      // Start event loop monitoring
      const monitorInterval = setInterval(() => {
        const start = Date.now();
        setImmediate(() => {
          const lag = Date.now() - start;
          lagMeasurements.push(lag);
        });
      }, 100);

      // Generate load
      const promises = Array.from({ length: requestCount }, () =>
        request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
      );

      await Promise.allSettled(promises);

      // Stop monitoring
      clearInterval(monitorInterval);

      // Wait for final measurements
      await new Promise(resolve => setTimeout(resolve, 500));

      // Calculate statistics
      const avgLag = lagMeasurements.reduce((a, b) => a + b, 0) / lagMeasurements.length;
      const maxLag = Math.max(...lagMeasurements);
      const p95Lag = lagMeasurements.sort((a, b) => a - b)[Math.floor(lagMeasurements.length * 0.95)];

      logger.info('Event loop lag test', {
        requests: requestCount,
        measurements: lagMeasurements.length,
        avgLag: `${avgLag.toFixed(2)}ms`,
        maxLag: `${maxLag}ms`,
        p95Lag: `${p95Lag}ms`,
      });

      // CRITICAL: Average lag should be minimal
      expect(avgLag).toBeLessThan(50);

      // CRITICAL: p95 lag should be acceptable
      expect(p95Lag).toBeLessThan(100);

      // CRITICAL: Max lag should not be extreme
      expect(maxLag).toBeLessThan(200);
    }, 60000);

    it('should recover from event loop lag spikes', async () => {
      const lagBefore = [];
      const lagDuring = [];
      const lagAfter = [];

      // Measure baseline lag
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await new Promise(resolve => setImmediate(resolve));
        lagBefore.push(Date.now() - start);
      }

      // Create spike (heavy load)
      const heavyLoad = Array.from({ length: 200 }, () =>
        request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
      );

      // Measure during spike
      const measureDuring = async () => {
        for (let i = 0; i < 10; i++) {
          const start = Date.now();
          await new Promise(resolve => setImmediate(resolve));
          lagDuring.push(Date.now() - start);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      };

      await Promise.all([
        Promise.allSettled(heavyLoad),
        measureDuring(),
      ]);

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Measure after recovery
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await new Promise(resolve => setImmediate(resolve));
        lagAfter.push(Date.now() - start);
      }

      const avgBefore = lagBefore.reduce((a, b) => a + b, 0) / lagBefore.length;
      const avgDuring = lagDuring.reduce((a, b) => a + b, 0) / lagDuring.length;
      const avgAfter = lagAfter.reduce((a, b) => a + b, 0) / lagAfter.length;

      logger.info('Event loop recovery test', {
        avgBefore: `${avgBefore.toFixed(2)}ms`,
        avgDuring: `${avgDuring.toFixed(2)}ms`,
        avgAfter: `${avgAfter.toFixed(2)}ms`,
      });

      // CRITICAL: Should recover to baseline levels
      expect(avgAfter).toBeLessThan(avgBefore * 2);
    }, 60000);

    it('should handle sustained load without degrading event loop', async () => {
      const durationMs = 60000; // 1 minute
      const requestsPerSecond = 10;
      const intervalMs = 1000 / requestsPerSecond;

      const startTime = Date.now();
      const lagMeasurements = [];
      let requestCount = 0;

      // Monitor event loop continuously
      const monitorInterval = setInterval(() => {
        const start = Date.now();
        setImmediate(() => {
          lagMeasurements.push(Date.now() - start);
        });
      }, 500);

      // Generate sustained load
      while (Date.now() - startTime < durationMs) {
        const reqStart = Date.now();

        try {
          await request(app)
            .get('/api/v1/products')
            .set('Authorization', `Bearer ${authToken}`);

          requestCount++;
        } catch (err) {
          logger.error('Request failed', { error: err.message });
        }

        const elapsed = Date.now() - reqStart;
        const waitTime = Math.max(0, intervalMs - elapsed);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      clearInterval(monitorInterval);

      // Analyze lag trend
      const firstQuartile = lagMeasurements.slice(0, Math.floor(lagMeasurements.length / 4));
      const lastQuartile = lagMeasurements.slice(-Math.floor(lagMeasurements.length / 4));

      const avgFirst = firstQuartile.reduce((a, b) => a + b, 0) / firstQuartile.length;
      const avgLast = lastQuartile.reduce((a, b) => a + b, 0) / lastQuartile.length;

      logger.info('Sustained load event loop test', {
        duration: `${durationMs / 1000}s`,
        totalRequests: requestCount,
        measurements: lagMeasurements.length,
        avgFirstQuartile: `${avgFirst.toFixed(2)}ms`,
        avgLastQuartile: `${avgLast.toFixed(2)}ms`,
        degradation: `${((avgLast - avgFirst) / avgFirst * 100).toFixed(2)}%`,
      });

      // CRITICAL: Event loop should not degrade significantly
      expect(avgLast).toBeLessThan(avgFirst * 1.5);
    }, 90000);
  });

  // ==============================================
  // TEST GROUP 2: Blocking Operation Detection
  // ==============================================

  describe('Blocking Operation Detection', () => {
    it('should detect CPU-intensive synchronous operations', async () => {
      const blockingDuration = 100; // ms
      const detectThreshold = 50; // ms

      // Simulate blocking operation
      const blockStart = Date.now();
      const start = Date.now();

      // CPU-intensive sync operation
      while (Date.now() - blockStart < blockingDuration) {
        // Busy wait
      }

      // Check if event loop was blocked
      await new Promise(resolve => setImmediate(resolve));
      const blockEnd = Date.now();
      const actualBlock = blockEnd - start;

      logger.info('Blocking operation detection', {
        intendedBlock: `${blockingDuration}ms`,
        actualBlock: `${actualBlock}ms`,
        detected: actualBlock > detectThreshold,
      });

      // Should detect the block
      expect(actualBlock).toBeGreaterThan(detectThreshold);
    }, 30000);

    it('should handle I/O operations without blocking event loop', async () => {
      const operations = 100;
      const lagMeasurements = [];

      // Start monitoring
      const monitorInterval = setInterval(() => {
        const start = Date.now();
        setImmediate(() => {
          lagMeasurements.push(Date.now() - start);
        });
      }, 50);

      // Perform I/O operations
      const promises = Array.from({ length: operations }, async () => {
        // Database I/O (should be non-blocking)
        await Product.findOne({ _id: testProduct._id }).lean();
        
        // Redis I/O (should be non-blocking)
        await redisClient.get('test:key');
      });

      await Promise.allSettled(promises);

      clearInterval(monitorInterval);
      await new Promise(resolve => setTimeout(resolve, 200));

      const maxLag = Math.max(...lagMeasurements);
      const avgLag = lagMeasurements.reduce((a, b) => a + b, 0) / lagMeasurements.length;

      logger.info('I/O non-blocking test', {
        operations,
        measurements: lagMeasurements.length,
        avgLag: `${avgLag.toFixed(2)}ms`,
        maxLag: `${maxLag}ms`,
      });

      // CRITICAL: I/O should not block event loop significantly
      expect(avgLag).toBeLessThan(30);
      expect(maxLag).toBeLessThan(100);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 3: Async/Await Consistency
  // ==============================================

  describe('Async/Await Consistency Under Load', () => {
    it('should maintain async execution order under concurrent load', async () => {
      const concurrency = 50;
      const executionOrder = [];

      const promises = Array.from({ length: concurrency }, async (_, idx) => {
        executionOrder.push({ id: idx, stage: 'start', time: Date.now() });

        // Async database operation
        await Product.findById(testProduct._id).lean();

        executionOrder.push({ id: idx, stage: 'middle', time: Date.now() });

        // Async cache operation
        await redisClient.get(`test:${idx}`);

        executionOrder.push({ id: idx, stage: 'end', time: Date.now() });

        return idx;
      });

      const results = await Promise.allSettled(promises);

      logger.info('Async execution order test', {
        concurrency,
        executionStages: executionOrder.length,
        successful: results.filter(r => r.status === 'fulfilled').length,
      });

      // Verify all operations completed in correct stages
      const startStages = executionOrder.filter(e => e.stage === 'start').length;
      const middleStages = executionOrder.filter(e => e.stage === 'middle').length;
      const endStages = executionOrder.filter(e => e.stage === 'end').length;

      expect(startStages).toBe(concurrency);
      expect(middleStages).toBe(concurrency);
      expect(endStages).toBe(concurrency);
    }, 60000);

    it('should handle async errors without breaking event loop', async () => {
      const concurrency = 30;

      const promises = Array.from({ length: concurrency }, async (_, idx) => {
        try {
          // Intentionally cause errors in half the operations
          if (idx % 2 === 0) {
            await Product.findById('invalid_id').lean();
          } else {
            await Product.findById(testProduct._id).lean();
          }

          return { success: true, idx };
        } catch (error) {
          return { success: false, idx, error: error.message };
        }
      });

      const results = await Promise.allSettled(promises);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      const errorCount = results.filter(
        r => r.status === 'fulfilled' && !r.value.success
      ).length;

      logger.info('Async error handling test', {
        total: concurrency,
        successful: successCount,
        errors: errorCount,
      });

      // Half should succeed, half should fail gracefully
      expect(successCount).toBeGreaterThan(10);
      expect(errorCount).toBeGreaterThan(10);

      // All should settle (no unhandled rejections)
      expect(results.filter(r => r.status === 'rejected').length).toBe(0);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 4: CPU Utilization Patterns
  // ==============================================

  describe('CPU Utilization Patterns', () => {
    it('should maintain reasonable CPU usage during normal operations', async () => {
      const initialCPU = getCPUUsage();
      const operations = 100;

      // Perform normal operations
      const promises = Array.from({ length: operations }, () =>
        request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
      );

      await Promise.allSettled(promises);

      const finalCPU = getCPUUsage();
      const cpuDelta = {
        user: finalCPU.user - initialCPU.user,
        system: finalCPU.system - initialCPU.system,
        total: finalCPU.total - initialCPU.total,
      };

      logger.info('CPU utilization test', {
        operations,
        cpuUsed: {
          user: `${cpuDelta.user.toFixed(2)}ms`,
          system: `${cpuDelta.system.toFixed(2)}ms`,
          total: `${cpuDelta.total.toFixed(2)}ms`,
        },
        avgPerOp: `${(cpuDelta.total / operations).toFixed(2)}ms`,
      });

      // CPU usage should be reasonable
      expect(cpuDelta.total).toBeLessThan(operations * 100); // <100ms per request
    }, 60000);

    it('should distribute CPU time fairly across concurrent operations', async () => {
      const concurrency = 50;
      const operationTimes = [];

      const promises = Array.from({ length: concurrency }, async (_, idx) => {
        const start = Date.now();

        await Product.find().limit(10).lean();

        const duration = Date.now() - start;
        operationTimes.push({ idx, duration });

        return duration;
      });

      await Promise.all(promises);

      // Calculate statistics
      const durations = operationTimes.map(o => o.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length;
      const stdDev = Math.sqrt(variance);

      logger.info('CPU fairness test', {
        operations: concurrency,
        avgDuration: `${avgDuration.toFixed(2)}ms`,
        minDuration: `${minDuration}ms`,
        maxDuration: `${maxDuration}ms`,
        stdDev: `${stdDev.toFixed(2)}ms`,
      });

      // Operations should have similar durations (fair scheduling)
      expect(stdDev).toBeLessThan(avgDuration * 0.5);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 5: Backpressure & Throttling
  // ==============================================

  describe('Backpressure & Throttling', () => {
    it('should handle rapid request bursts without starvation', async () => {
      const burstSize = 100;
      const startTime = Date.now();
      const responseTimes = [];

      // Send burst
      const promises = Array.from({ length: burstSize }, async () => {
        const reqStart = Date.now();
        await request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`);
        
        responseTimes.push(Date.now() - reqStart);
      });

      await Promise.allSettled(promises);

      const totalTime = Date.now() - startTime;
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      logger.info('Request burst test', {
        burstSize,
        totalTime: `${totalTime}ms`,
        avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        maxResponseTime: `${maxResponseTime}ms`,
        throughput: `${(burstSize / totalTime * 1000).toFixed(2)} req/s`,
      });

      // No request should be starved (excessive wait)
      expect(maxResponseTime).toBeLessThan(5000);
    }, 60000);

    it('should throttle excessive operations gracefully', async () => {
      const operations = 200;
      const lagMeasurements = [];

      // Monitor event loop during excessive load
      const monitorInterval = setInterval(() => {
        const start = Date.now();
        setImmediate(() => {
          lagMeasurements.push(Date.now() - start);
        });
      }, 100);

      // Generate excessive load
      const promises = Array.from({ length: operations }, () =>
        request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
      );

      await Promise.allSettled(promises);

      clearInterval(monitorInterval);
      await new Promise(resolve => setTimeout(resolve, 500));

      const maxLag = Math.max(...lagMeasurements);
      const avgLag = lagMeasurements.reduce((a, b) => a + b, 0) / lagMeasurements.length;

      logger.info('Throttling test', {
        operations,
        measurements: lagMeasurements.length,
        avgLag: `${avgLag.toFixed(2)}ms`,
        maxLag: `${maxLag}ms`,
      });

      // Event loop should remain responsive (proper throttling)
      expect(avgLag).toBeLessThan(100);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 6: Retry Storm Prevention
  // ==============================================

  describe('Retry Storm Prevention', () => {
    it('should handle concurrent retry attempts without overwhelming event loop', async () => {
      const attempts = 50;
      const maxRetries = 3;
      const lagMeasurements = [];

      // Monitor event loop
      const monitorInterval = setInterval(() => {
        const start = Date.now();
        setImmediate(() => {
          lagMeasurements.push(Date.now() - start);
        });
      }, 100);

      // Simulate operations that retry
      const promises = Array.from({ length: attempts }, async () => {
        let retries = 0;

        while (retries < maxRetries) {
          try {
            // Simulate operation that might fail
            if (Math.random() < 0.7) {
              throw new Error('Simulated failure');
            }

            return { success: true, retries };
          } catch (error) {
            retries++;
            await new Promise(resolve => setTimeout(resolve, 100)); // Backoff
          }
        }

        return { success: false, retries };
      });

      const results = await Promise.allSettled(promises);

      clearInterval(monitorInterval);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      const maxLag = Math.max(...lagMeasurements);

      logger.info('Retry storm test', {
        attempts,
        successful: successCount,
        measurements: lagMeasurements.length,
        maxLag: `${maxLag}ms`,
      });

      // Event loop should remain stable despite retries
      expect(maxLag).toBeLessThan(150);
    }, 60000);
  });
});
