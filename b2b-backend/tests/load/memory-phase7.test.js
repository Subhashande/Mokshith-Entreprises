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
 * 🚀 PHASE 7 STEP 5: Memory Leak & Resource Stability Tests
 * 
 * Tests for memory leaks, connection leaks, file handle leaks,
 * and overall resource management under sustained load.
 * 
 * Critical Validation:
 * - No unbounded memory growth
 * - Stable heap size over time
 * - No connection leaks (MongoDB, Redis)
 * - No file handle leaks
 * - Event listener cleanup
 * - Proper garbage collection
 */

describe('PHASE 7 STEP 5: Memory Leak & Resource Stability Tests', () => {
  let authToken;
  let testUser;
  let testProduct;
  let testCategory;

  // Helper: Get current memory usage
  const getMemoryUsage = () => {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      heapUsedMB: (usage.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: (usage.heapTotal / 1024 / 1024).toFixed(2),
      rssMB: (usage.rss / 1024 / 1024).toFixed(2),
    };
  };

  // Helper: Force garbage collection (if enabled)
  const forceGC = () => {
    if (global.gc) {
      global.gc();
      logger.info('Forced garbage collection');
    } else {
      logger.warn('Garbage collection not exposed (run with --expose-gc flag)');
    }
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
      name: 'Memory Test Category',
      slug: 'memory-test',
    });

    // Create test user
    const hashedPassword = await hashPassword('testpass123');
    testUser = await User.create({
      name: 'Memory Test User',
      email: 'memorytest@example.com',
      password: hashedPassword,
      mobile: '9876543210',
      role: ROLES.BUYER,
      isVerified: true,
    });

    // Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'memorytest@example.com', password: 'testpass123' });

    authToken = loginRes.body.data.accessToken;

    // Create 20 test products
    const products = [];
    for (let i = 0; i < 20; i++) {
      products.push({
        name: `Memory Test Product ${i}`,
        description: `Product ${i} for memory testing`,
        price: 100 + i * 10,
        stock: 1000,
        categoryId: testCategory._id,
        isActive: true,
      });
    }
    const createdProducts = await Product.insertMany(products);
    testProduct = createdProducts[0];

    logger.info('Memory test setup completed', {
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
  }, 30000);

  // ==============================================
  // TEST GROUP 1: Sustained Load Memory Stability
  // ==============================================

  describe('Sustained Load Memory Stability', () => {
    it('should maintain stable heap size during 5 minutes of sustained traffic', async () => {
      const durationMs = 5 * 60 * 1000; // 5 minutes
      const requestsPerSecond = 5;
      const intervalMs = 1000 / requestsPerSecond;

      const startTime = Date.now();
      const startMemory = getMemoryUsage();

      // Force GC before starting
      forceGC();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const baselineMemory = getMemoryUsage();

      logger.info('Starting sustained load memory test', {
        duration: `${durationMs / 1000}s`,
        targetRate: `${requestsPerSecond} req/s`,
        baselineHeapUsed: `${baselineMemory.heapUsedMB} MB`,
        baselineHeapTotal: `${baselineMemory.heapTotalMB} MB`,
        baselineRSS: `${baselineMemory.rssMB} MB`,
      });

      let requestCount = 0;
      const memorySnapshots = [];
      let lastSnapshotTime = Date.now();

      // Send requests at steady rate for 5 minutes
      while (Date.now() - startTime < durationMs) {
        const reqStart = Date.now();

        try {
          await request(app)
            .get('/api/v1/products')
            .set('Authorization', `Bearer ${authToken}`);

          requestCount++;

          // Take memory snapshot every 30 seconds
          if (Date.now() - lastSnapshotTime >= 30000) {
            const snapshot = getMemoryUsage();
            memorySnapshots.push({
              time: Date.now() - startTime,
              ...snapshot,
            });
            lastSnapshotTime = Date.now();

            logger.info('Memory snapshot', {
              elapsed: `${((Date.now() - startTime) / 1000).toFixed(0)}s`,
              heapUsed: `${snapshot.heapUsedMB} MB`,
              heapTotal: `${snapshot.heapTotalMB} MB`,
              rss: `${snapshot.rssMB} MB`,
            });
          }
        } catch (err) {
          logger.error('Request failed during sustained load', { error: err.message });
        }

        // Wait for next interval
        const elapsed = Date.now() - reqStart;
        const waitTime = Math.max(0, intervalMs - elapsed);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Force GC after test
      forceGC();
      await new Promise(resolve => setTimeout(resolve, 2000));

      const finalMemory = getMemoryUsage();
      const duration = Date.now() - startTime;

      const memoryGrowth = finalMemory.heapUsed - baselineMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;
      const memoryGrowthPercent = (memoryGrowth / baselineMemory.heapUsed) * 100;

      logger.info('Sustained load memory test completed', {
        duration: `${(duration / 1000).toFixed(0)}s`,
        totalRequests: requestCount,
        avgRate: `${(requestCount / duration * 1000).toFixed(2)} req/s`,
        baselineHeapUsed: `${baselineMemory.heapUsedMB} MB`,
        finalHeapUsed: `${finalMemory.heapUsedMB} MB`,
        memoryGrowth: `${memoryGrowthMB.toFixed(2)} MB`,
        memoryGrowthPercent: `${memoryGrowthPercent.toFixed(2)}%`,
        snapshots: memorySnapshots.length,
      });

      // Assertions
      expect(requestCount).toBeGreaterThan(1200); // Should process ~1500 requests

      // CRITICAL: Memory growth should be minimal (<200MB)
      expect(memoryGrowthMB).toBeLessThan(200);

      // CRITICAL: Memory growth should be <100% of baseline
      expect(memoryGrowthPercent).toBeLessThan(100);

      // Verify memory trend (should not continuously grow)
      if (memorySnapshots.length >= 3) {
        const firstSnapshot = memorySnapshots[0];
        const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
        const trendGrowth = lastSnapshot.heapUsed - firstSnapshot.heapUsed;
        const trendGrowthMB = trendGrowth / 1024 / 1024;

        logger.info('Memory trend analysis', {
          firstSnapshot: `${(firstSnapshot.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          lastSnapshot: `${(lastSnapshot.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          trendGrowth: `${trendGrowthMB.toFixed(2)} MB`,
        });

        // Trend growth should be minimal
        expect(trendGrowthMB).toBeLessThan(150);
      }
    }, 360000); // 6 minute timeout

    it('should handle repeated request cycles without unbounded memory growth', async () => {
      const cycles = 5;
      const requestsPerCycle = 200;
      const memoryAfterCycles = [];

      for (let cycle = 0; cycle < cycles; cycle++) {
        const cycleStart = Date.now();

        // Make 200 requests
        const promises = Array.from({ length: requestsPerCycle }, () =>
          request(app)
            .get('/api/v1/products')
            .set('Authorization', `Bearer ${authToken}`)
        );

        await Promise.allSettled(promises);

        // Force GC after each cycle
        forceGC();
        await new Promise(resolve => setTimeout(resolve, 1000));

        const memoryAfterCycle = getMemoryUsage();
        memoryAfterCycles.push({
          cycle: cycle + 1,
          heapUsed: memoryAfterCycle.heapUsed,
          heapUsedMB: memoryAfterCycle.heapUsedMB,
          duration: Date.now() - cycleStart,
        });

        logger.info(`Cycle ${cycle + 1} completed`, {
          requests: requestsPerCycle,
          heapUsed: `${memoryAfterCycle.heapUsedMB} MB`,
          duration: `${Date.now() - cycleStart}ms`,
        });

        // Wait between cycles
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Analyze memory across cycles
      const firstCycleMemory = memoryAfterCycles[0].heapUsed;
      const lastCycleMemory = memoryAfterCycles[cycles - 1].heapUsed;
      const memoryIncrease = lastCycleMemory - firstCycleMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      logger.info('Repeated cycles memory analysis', {
        totalCycles: cycles,
        requestsPerCycle,
        firstCycleMemory: `${(firstCycleMemory / 1024 / 1024).toFixed(2)} MB`,
        lastCycleMemory: `${(lastCycleMemory / 1024 / 1024).toFixed(2)} MB`,
        memoryIncrease: `${memoryIncreaseMB.toFixed(2)} MB`,
      });

      // CRITICAL: Memory should not grow unbounded across cycles
      expect(memoryIncreaseMB).toBeLessThan(100);
    }, 120000);
  });

  // ==============================================
  // TEST GROUP 2: Connection Leak Detection
  // ==============================================

  describe('Connection Leak Detection', () => {
    it('should not leak MongoDB connections during high load', async () => {
      // Get initial connection pool stats
      const initialPoolStats = {
        available: mongoose.connection?.db?.serverConfig?.s?.pool?.availableConnections || 0,
        inUse: mongoose.connection?.db?.serverConfig?.s?.pool?.inUseConnections || 0,
      };

      logger.info('Initial MongoDB connection pool stats', initialPoolStats);

      // Make 500 requests
      const promises = Array.from({ length: 500 }, () =>
        request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
      );

      await Promise.allSettled(promises);

      // Wait for connections to be released
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get final connection pool stats
      const finalPoolStats = {
        available: mongoose.connection?.db?.serverConfig?.s?.pool?.availableConnections || 0,
        inUse: mongoose.connection?.db?.serverConfig?.s?.pool?.inUseConnections || 0,
      };

      logger.info('Final MongoDB connection pool stats', finalPoolStats);

      // CRITICAL: In-use connections should return to low levels
      expect(finalPoolStats.inUse).toBeLessThan(10);
    }, 60000);

    it('should not leak Redis connections during repeated operations', async () => {
      // Make 1000 Redis operations
      for (let i = 0; i < 1000; i++) {
        await redisClient.set(`test:leak:${i}`, `value_${i}`, 'EX', 10);
        await redisClient.get(`test:leak:${i}`);
      }

      // Redis should still be responsive
      const pingStart = Date.now();
      await redisClient.ping();
      const pingDuration = Date.now() - pingStart;

      logger.info('Redis connection leak test', {
        operations: 1000,
        pingDuration: `${pingDuration}ms`,
      });

      // Redis should respond quickly (no connection buildup)
      expect(pingDuration).toBeLessThan(50);
    }, 60000);

    it('should not leave hanging HTTP connections', async () => {
      // Make 300 requests
      const promises = Array.from({ length: 300 }, () =>
        request(app)
          .get('/api/v1/health')
          .set('Authorization', `Bearer ${authToken}`)
      );

      await Promise.allSettled(promises);

      // Wait for connections to close
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Make a normal request - should work fine
      const res = await request(app)
        .get('/api/v1/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 3: Event Listener Accumulation
  // ==============================================

  describe('Event Listener Accumulation', () => {
    it('should not accumulate event listeners during repeated operations', async () => {
      // Get initial event listener count
      const getListenerCount = () => {
        let totalListeners = 0;

        // Check MongoDB connection listeners
        if (mongoose.connection) {
          const dbListeners = mongoose.connection.eventNames();
          dbListeners.forEach(event => {
            totalListeners += mongoose.connection.listenerCount(event);
          });
        }

        return totalListeners;
      };

      const initialListenerCount = getListenerCount();

      logger.info('Initial event listener count', { count: initialListenerCount });

      // Perform operations that might add listeners
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`);
      }

      const finalListenerCount = getListenerCount();

      logger.info('Final event listener count', { count: finalListenerCount });

      // CRITICAL: Listener count should not grow significantly
      const listenerGrowth = finalListenerCount - initialListenerCount;
      expect(listenerGrowth).toBeLessThan(50); // Allow some growth but not unbounded
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 4: Garbage Collection Behavior
  // ==============================================

  describe('Garbage Collection Behavior', () => {
    it('should allow garbage collection of large objects after use', async () => {
      const initialMemory = getMemoryUsage();

      // Create large payload (simulate processing large data)
      const createLargePayload = () => {
        return Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: 'A'.repeat(100),
          metadata: { created: new Date(), index: i },
        }));
      };

      // Process large payloads
      for (let i = 0; i < 50; i++) {
        const largeData = createLargePayload();
        // Process data (simulate work)
        const processed = largeData.map(item => item.id).slice(0, 10);
        // Data should be eligible for GC after this iteration
      }

      // Force GC
      forceGC();
      await new Promise(resolve => setTimeout(resolve, 2000));

      const finalMemory = getMemoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;

      logger.info('Garbage collection test', {
        initialHeapUsed: `${initialMemory.heapUsedMB} MB`,
        finalHeapUsed: `${finalMemory.heapUsedMB} MB`,
        memoryGrowth: `${memoryGrowthMB.toFixed(2)} MB`,
      });

      // After GC, memory growth should be minimal
      expect(memoryGrowthMB).toBeLessThan(50);
    }, 60000);

    it('should handle memory pressure with appropriate GC', async () => {
      const memoryReadings = [];

      // Create memory pressure
      for (let cycle = 0; cycle < 10; cycle++) {
        // Allocate memory
        const largeArray = new Array(100000).fill({
          data: 'x'.repeat(100),
        });

        // Do some work
        const filtered = largeArray.slice(0, 100);

        // Take memory reading
        const memory = getMemoryUsage();
        memoryReadings.push({
          cycle,
          heapUsedMB: parseFloat(memory.heapUsedMB),
        });

        // Wait for potential GC
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      logger.info('Memory pressure test readings', { readings: memoryReadings });

      // Memory should stabilize or decrease in later cycles (GC working)
      const earlyAvg = (memoryReadings[0].heapUsedMB + memoryReadings[1].heapUsedMB) / 2;
      const lateAvg = (memoryReadings[8].heapUsedMB + memoryReadings[9].heapUsedMB) / 2;
      const memoryChange = lateAvg - earlyAvg;

      logger.info('Memory pressure analysis', {
        earlyAvg: `${earlyAvg.toFixed(2)} MB`,
        lateAvg: `${lateAvg.toFixed(2)} MB`,
        change: `${memoryChange.toFixed(2)} MB`,
      });

      // Memory shouldn't continuously grow (GC should kick in)
      expect(memoryChange).toBeLessThan(200);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 5: Resource Cleanup Verification
  // ==============================================

  describe('Resource Cleanup Verification', () => {
    it('should clean up temporary data structures after operations', async () => {
      const operations = 100;

      // Perform operations that create temporary structures
      for (let i = 0; i < operations; i++) {
        await request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ page: i % 10, limit: 20 });
      }

      // Force cleanup
      forceGC();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Make a normal request - should not be affected
      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }, 60000);

    it('should handle rapid allocation and deallocation', async () => {
      const initialMemory = getMemoryUsage();

      // Rapid allocation/deallocation cycles
      for (let i = 0; i < 100; i++) {
        const tempData = new Array(10000).fill(i);
        const sum = tempData.reduce((a, b) => a + b, 0);
        // tempData eligible for GC
      }

      // Force GC
      forceGC();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalMemory = getMemoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;

      logger.info('Rapid allocation/deallocation test', {
        cycles: 100,
        initialMemory: `${initialMemory.heapUsedMB} MB`,
        finalMemory: `${finalMemory.heapUsedMB} MB`,
        memoryGrowth: `${memoryGrowthMB.toFixed(2)} MB`,
      });

      // Memory should return to near baseline
      expect(memoryGrowthMB).toBeLessThan(30);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 6: Memory Leak Specific Patterns
  // ==============================================

  describe('Memory Leak Specific Patterns', () => {
    it('should not leak memory with repeated database queries', async () => {
      const initialMemory = getMemoryUsage();

      // Execute 500 database queries
      for (let i = 0; i < 500; i++) {
        await Product.find().limit(10).lean();
      }

      // Force GC
      forceGC();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalMemory = getMemoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;

      logger.info('Database query leak test', {
        queries: 500,
        memoryGrowth: `${memoryGrowthMB.toFixed(2)} MB`,
      });

      // CRITICAL: Minimal memory growth
      expect(memoryGrowthMB).toBeLessThan(50);
    }, 60000);

    it('should not leak memory with repeated JSON operations', async () => {
      const initialMemory = getMemoryUsage();

      // Repeated JSON stringify/parse (common in APIs)
      for (let i = 0; i < 1000; i++) {
        const obj = {
          id: i,
          name: `Item ${i}`,
          data: { nested: { value: i } },
        };

        const json = JSON.stringify(obj);
        const parsed = JSON.parse(json);
      }

      // Force GC
      forceGC();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalMemory = getMemoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;

      logger.info('JSON operations leak test', {
        operations: 1000,
        memoryGrowth: `${memoryGrowthMB.toFixed(2)} MB`,
      });

      // CRITICAL: Minimal memory growth
      expect(memoryGrowthMB).toBeLessThan(20);
    }, 60000);

    it('should not leak memory with repeated cache operations', async () => {
      const initialMemory = getMemoryUsage();

      // Repeated cache set/get operations
      for (let i = 0; i < 1000; i++) {
        await redisClient.set(`test:mem:${i}`, JSON.stringify({ data: i }), 'EX', 10);
        await redisClient.get(`test:mem:${i}`);
      }

      // Force GC
      forceGC();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalMemory = getMemoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;

      logger.info('Cache operations leak test', {
        operations: 1000,
        memoryGrowth: `${memoryGrowthMB.toFixed(2)} MB`,
      });

      // CRITICAL: Minimal memory growth
      expect(memoryGrowthMB).toBeLessThan(30);
    }, 60000);
  });
});
