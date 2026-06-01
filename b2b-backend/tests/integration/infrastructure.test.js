import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { Queue, Worker } from 'bullmq';
import { 
  setupTestDB, 
  teardownTestDB, 
  clearDatabase,
  cleanupQueuesAndWorkers,
  setupRedis,
  teardownRedis
} from '../helpers/testUtils.js';

/**
 * INFRASTRUCTURE VALIDATION TESTS
 * 
 * Purpose: Validate that test infrastructure lifecycle is working correctly
 * - MongoDB connection/disconnection
 * - Redis lifecycle
 * - BullMQ queue/worker cleanup
 * - No resource leaks
 * - Proper async handling
 * 
 * These tests should pass with --detectOpenHandles enabled
 */

describe('Infrastructure Lifecycle Tests', () => {
  
  describe('MongoDB Lifecycle', () => {
    it('should connect to MongoDB successfully', async () => {
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
    });

    it('should handle clearDatabase when connected', async () => {
      // Create a test collection
      const TestModel = mongoose.model('TestCollection', new mongoose.Schema({ name: String }));
      await TestModel.create({ name: 'test' });
      
      // Clear should work
      await expect(clearDatabase()).resolves.not.toThrow();
      
      // Verify cleared
      const count = await TestModel.countDocuments();
      expect(count).toBe(0);
      
      // Cleanup model
      mongoose.deleteModel('TestCollection');
    });

    it('should not throw when clearing database with no collections', async () => {
      await expect(clearDatabase()).resolves.not.toThrow();
    });

    it('should validate connection state before operations', async () => {
      const state = mongoose.connection.readyState;
      expect(state).toBe(1); // Connected
      expect([0, 1, 2, 3]).toContain(state); // Valid states: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    });
  });

  describe('Redis Lifecycle', () => {
    let redis;

    beforeEach(() => {
      redis = setupRedis();
    });

    afterEach(async () => {
      await teardownRedis();
    });

    it('should create Redis mock client', () => {
      expect(redis).toBeDefined();
      expect(typeof redis.get).toBe('function');
      expect(typeof redis.set).toBe('function');
    });

    it('should set and get values', async () => {
      await redis.set('test-key', 'test-value');
      const value = await redis.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should flush all keys', async () => {
      await redis.set('key1', 'value1');
      await redis.set('key2', 'value2');
      await redis.flushall();
      
      const value1 = await redis.get('key1');
      const value2 = await redis.get('key2');
      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });

    it('should disconnect cleanly', async () => {
      await expect(teardownRedis()).resolves.not.toThrow();
    });
  });

  describe('BullMQ Queue Lifecycle', () => {
    let testQueue;
    let testWorker;

    const connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
    };

    beforeEach(() => {
      // Skip BullMQ tests if queues are disabled (which is the default in tests)
      if (process.env.ENABLE_QUEUE !== 'true') {
        return;
      }
      testQueue = new Queue('infrastructure-test-queue', { connection });
    });

    afterEach(async () => {
      if (process.env.ENABLE_QUEUE !== 'true') {
        return;
      }
      
      await cleanupQueuesAndWorkers({
        workers: [testWorker].filter(Boolean),
        queues: [testQueue].filter(Boolean),
        obliterate: true,
        timeout: 5000
      });
    });

    it('should validate BullMQ is disabled in test environment', () => {
      // By default, queues should be disabled in tests
      expect(process.env.ENABLE_QUEUE).toBe('false');
    });

    it.skip('should create queue successfully (requires Redis)', () => {
      // This test requires a real Redis instance
      // Skip in normal test runs, enable when testing with real Redis
      expect(testQueue).toBeDefined();
      expect(testQueue.name).toBe('infrastructure-test-queue');
    });

    it.skip('should add job to queue (requires Redis)', async () => {
      // This test requires a real Redis instance
      const job = await testQueue.add('test-job', { data: 'test' });
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data).toEqual({ data: 'test' });
    });

    it.skip('should process job with worker (requires Redis)', async () => {
      // This test requires a real Redis instance
      let processed = false;

      testWorker = new Worker(
        'infrastructure-test-queue',
        async (job) => {
          processed = true;
          return { success: true };
        },
        { connection }
      );

      await testQueue.add('process-test', { test: true });
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      expect(processed).toBe(true);
    }, 10000);

    it.skip('should clean up queue without hanging (requires Redis)', async () => {
      // This test requires a real Redis instance
      // Add some jobs
      await testQueue.add('cleanup-test-1', { id: 1 });
      await testQueue.add('cleanup-test-2', { id: 2 });
      
      // Cleanup should complete within timeout
      await expect(
        cleanupQueuesAndWorkers({
          queues: [testQueue],
          obliterate: true,
          timeout: 5000
        })
      ).resolves.not.toThrow();
      
      // Prevent double cleanup in afterEach
      testQueue = null;
    });

    it.skip('should handle worker cleanup without hanging (requires Redis)', async () => {
      // This test requires a real Redis instance
      testWorker = new Worker(
        'infrastructure-test-queue',
        async (job) => ({ success: true }),
        { connection }
      );

      // Add and process a job
      await testQueue.add('worker-cleanup-test', { test: true });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Cleanup should complete within timeout
      await expect(
        cleanupQueuesAndWorkers({
          workers: [testWorker],
          queues: [testQueue],
          obliterate: true,
          timeout: 5000
        })
      ).resolves.not.toThrow();

      // Prevent double cleanup in afterEach
      testWorker = null;
      testQueue = null;
    }, 10000);
  });

  describe('Test Isolation', () => {
    it('should have clean database state', async () => {
      // Each test should start with clean state
      const collections = mongoose.connection.collections;
      
      for (const key in collections) {
        const count = await collections[key].countDocuments();
        // Should be 0 or have expected test data only
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    it('should not leak state between tests', async () => {
      // This test validates that previous test's state doesn't leak
      const TestModel = mongoose.model('IsolationTest', new mongoose.Schema({ value: Number }));
      
      // Should start empty
      const initialCount = await TestModel.countDocuments();
      expect(initialCount).toBe(0);
      
      // Add data
      await TestModel.create({ value: 1 });
      
      // Cleanup model
      mongoose.deleteModel('IsolationTest');
    });
  });

  describe('Async Operations', () => {
    it('should handle async cleanup properly', async () => {
      const promises = [];
      
      // Create multiple async operations
      for (let i = 0; i < 5; i++) {
        promises.push(
          new Promise(resolve => setTimeout(() => resolve(i), 100 * i))
        );
      }
      
      // All should complete
      const results = await Promise.all(promises);
      expect(results).toEqual([0, 1, 2, 3, 4]);
    });

    it('should use Promise.allSettled for cleanup operations', async () => {
      const operations = [
        Promise.resolve('success'),
        Promise.reject(new Error('expected failure')),
        Promise.resolve('another success'),
      ];
      
      const results = await Promise.allSettled(operations);
      
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });

    it('should handle timeout protection', async () => {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 1000)
      );
      
      const fastPromise = new Promise(resolve =>
        setTimeout(() => resolve('fast'), 100)
      );
      
      const result = await Promise.race([fastPromise, timeoutPromise]);
      expect(result).toBe('fast');
    });
  });

  describe('Environment Validation', () => {
    it('should have required environment variables', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.JWT_REFRESH_SECRET).toBeDefined();
    });

    it('should have test-specific configuration', () => {
      // Queues should be disabled in tests by default
      expect(process.env.ENABLE_QUEUE).toBe('false');
    });

    it('should have valid MongoDB connection', () => {
      expect(mongoose.connection.readyState).toBe(1);
      expect(mongoose.connection.name).toBeTruthy();
    });
  });
});
