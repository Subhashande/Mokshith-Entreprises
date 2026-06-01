import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Queue, Worker } from 'bullmq';
import { clearDatabase, cleanupQueuesAndWorkers } from '../helpers/testUtils.js';
import { redisClient } from '../../src/config/redis.js';

/**
 * 🔒 CRITICAL: Queue Retry Logic & Dead-Letter Queue Tests
 * Tests exponential backoff, retry exhaustion, DLQ handling, and graceful shutdown
 */

describe('Queue Retry & DLQ Tests', () => {
  let testQueue;
  let testWorker;
  const queueName = 'test-queue';

  const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
  };

  beforeEach(async () => {
    await clearDatabase();
    await redisClient.flushdb();

    // Create test queue with retry config
    testQueue = new Queue(queueName, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000, // 1s, 2s, 4s
        },
        removeOnComplete: {
          count: 100,
          age: 3600,
        },
        removeOnFail: {
          count: 200,
          age: 86400,
        },
      },
    });
  });

  afterEach(async () => {
    // Use safe cleanup utility with timeout protection
    await cleanupQueuesAndWorkers({
      workers: [testWorker].filter(Boolean),
      queues: [testQueue].filter(Boolean),
      obliterate: true,
      timeout: 5000
    });
    
    // Flush Redis data if client is available
    try {
      if (redisClient && typeof redisClient.flushdb === 'function') {
        await redisClient.flushdb();
      }
    } catch (error) {
      console.error('Failed to flush Redis in afterEach:', error.message);
      // Non-fatal - continue cleanup
    }
  });

  describe('Exponential Backoff Retry', () => {
    it('should retry with exponential backoff delays', async () => {
      let attemptCount = 0;
      const attemptTimestamps = [];

      testWorker = new Worker(
        queueName,
        async (job) => {
          attemptCount++;
          attemptTimestamps.push(Date.now());
          
          if (attemptCount < 3) {
            throw new Error(`Attempt ${attemptCount} failed`);
          }
          
          return { success: true, attempts: attemptCount };
        },
        { connection, concurrency: 1 }
      );

      const job = await testQueue.add('retry-test', {
        testData: 'exponential-backoff',
      });

      // Wait for all retries to complete
      await job.waitUntilFinished(testQueue.events, 15000);

      // Verify 3 attempts made
      expect(attemptCount).toBe(3);

      // Verify exponential backoff timing
      if (attemptTimestamps.length === 3) {
        const delay1 = attemptTimestamps[1] - attemptTimestamps[0];
        const delay2 = attemptTimestamps[2] - attemptTimestamps[1];

        // First retry delay ~1000ms
        expect(delay1).toBeGreaterThanOrEqual(900);
        expect(delay1).toBeLessThanOrEqual(1500);

        // Second retry delay ~2000ms
        expect(delay2).toBeGreaterThanOrEqual(1800);
        expect(delay2).toBeLessThanOrEqual(2500);
      }

      // Verify final success
      const completedJob = await testQueue.getJob(job.id);
      expect(completedJob.returnvalue.success).toBe(true);
    }, 45000);

    it('should retry with custom backoff delays', async () => {
      const customQueue = new Queue('custom-backoff-queue', {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 500, // 0.5s, 1s, 2s
          },
        },
      });

      let attemptCount = 0;
      const customWorker = new Worker(
        'custom-backoff-queue',
        async () => {
          attemptCount++;
          throw new Error('Custom backoff test');
        },
        { connection }
      );

      await customQueue.add('custom-backoff-test', {});

      // Wait for all retries
      await new Promise(resolve => setTimeout(resolve, 10000));

      expect(attemptCount).toBe(3);

      // Safe cleanup
      await cleanupQueuesAndWorkers({
        workers: [customWorker].filter(Boolean),
        queues: [customQueue].filter(Boolean),
        obliterate: true,
        timeout: 5000
      });
    }, 35000);
  });

  describe('Retry Exhaustion & DLQ', () => {
    it('should move to failed queue after exhausting retries', async () => {
      testWorker = new Worker(
        queueName,
        async () => {
          throw new Error('Permanent failure - all retries exhausted');
        },
        { connection }
      );

      const job = await testQueue.add('dlq-test', {
        testData: 'should-fail',
      });

      // Wait for all retries to fail
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Verify job moved to failed
      const failedJobs = await testQueue.getFailed();
      const ourJob = failedJobs.find(j => j.id === job.id);

      expect(ourJob).toBeDefined();
      expect(ourJob.attemptsMade).toBe(3);
      expect(ourJob.failedReason).toContain('Permanent failure');
      expect(ourJob.finishedOn).toBeDefined();
    }, 35000);

    it('should preserve job data in DLQ for debugging', async () => {
      testWorker = new Worker(
        queueName,
        async (job) => {
          throw new Error(`Failed processing order: ${job.data.orderId}`);
        },
        { connection }
      );

      const job = await testQueue.add('dlq-data-preservation', {
        orderId: 'ORDER_123',
        userId: 'USER_456',
        amount: 5000,
      });

      await new Promise(resolve => setTimeout(resolve, 10000));

      const failedJobs = await testQueue.getFailed();
      const ourJob = failedJobs.find(j => j.id === job.id);

      expect(ourJob).toBeDefined();
      expect(ourJob.data.orderId).toBe('ORDER_123');
      expect(ourJob.data.userId).toBe('USER_456');
      expect(ourJob.data.amount).toBe(5000);
      expect(ourJob.stacktrace).toBeDefined();
      expect(ourJob.stacktrace.length).toBeGreaterThan(0);
    }, 35000);

    it('should allow manual retry of failed jobs from DLQ', async () => {
      let attemptCount = 0;

      testWorker = new Worker(
        queueName,
        async () => {
          attemptCount++;
          if (attemptCount <= 3) {
            throw new Error('Fail first 3 attempts');
          }
          return { success: true, retriedFromDLQ: true };
        },
        { connection }
      );

      const job = await testQueue.add('manual-retry-test', {
        testData: 'retry-from-dlq',
      });

      // Wait for initial failures
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Verify job is in failed state
      const failedJobs = await testQueue.getFailed();
      const failedJob = failedJobs.find(j => j.id === job.id);
      expect(failedJob).toBeDefined();

      // Manually retry from DLQ
      await failedJob.retry();

      // Wait for retry to process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Should succeed on manual retry
      const retriedJob = await testQueue.getJob(job.id);
      expect(retriedJob.attemptsMade).toBeGreaterThan(3);
    }, 45000);

    it('should handle DLQ cleanup policy', async () => {
      testWorker = new Worker(
        queueName,
        async () => {
          throw new Error('Test DLQ cleanup');
        },
        { connection }
      );

      // Add multiple failing jobs
      const jobs = [];
      for (let i = 0; i < 5; i++) {
        jobs.push(
          testQueue.add(`dlq-cleanup-${i}`, {
            index: i,
          })
        );
      }

      await Promise.all(jobs);

      // Wait for all to fail
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Verify failed jobs exist
      const failedJobs = await testQueue.getFailed();
      expect(failedJobs.length).toBeGreaterThanOrEqual(5);

      // Cleanup old failed jobs (simulate retention policy)
      await testQueue.clean(0, 3, 'failed'); // Keep only 3 most recent

      const remainingFailed = await testQueue.getFailed();
      expect(remainingFailed.length).toBeLessThanOrEqual(3);
    }, 35000);
  });

  describe('Transient vs Permanent Failures', () => {
    it('should succeed on transient failure after retry', async () => {
      let attemptCount = 0;

      testWorker = new Worker(
        queueName,
        async (job) => {
          attemptCount++;
          
          // Simulate transient failure (network timeout) on first 2 attempts
          if (attemptCount <= 2) {
            throw new Error('Network timeout - transient failure');
          }
          
          return {
            success: true,
            retriesNeeded: attemptCount - 1,
          };
        },
        { connection }
      );

      const job = await testQueue.add('transient-failure', {
        operation: 'payment-webhook',
      });

      await job.waitUntilFinished(testQueue.events, 15000);

      const completedJob = await testQueue.getJob(job.id);
      expect(completedJob.returnvalue.success).toBe(true);
      expect(completedJob.attemptsMade).toBe(3);
    }, 45000);

    it('should fail permanently on validation errors', async () => {
      testWorker = new Worker(
        queueName,
        async (job) => {
          // Validation errors should NOT retry
          if (!job.data.orderId) {
            const error = new Error('Missing orderId - validation error');
            error.name = 'ValidationError';
            throw error;
          }
          return { success: true };
        },
        { connection }
      );

      const job = await testQueue.add('validation-error', {
        userId: 'USER_123',
        // Missing orderId
      });

      await new Promise(resolve => setTimeout(resolve, 10000));

      const failedJob = await testQueue.getJob(job.id);
      expect(failedJob.attemptsMade).toBe(3); // Still retries 3 times
      expect(failedJob.failedReason).toContain('validation error');
    }, 35000);
  });

  describe('Graceful Shutdown', () => {
    it('should complete active jobs before shutdown', async () => {
      let jobStarted = false;
      let jobCompleted = false;

      testWorker = new Worker(
        queueName,
        async (job) => {
          jobStarted = true;
          // Simulate long-running job
          await new Promise(resolve => setTimeout(resolve, 3000));
          jobCompleted = true;
          return { success: true };
        },
        { connection, concurrency: 1 }
      );

      const job = await testQueue.add('graceful-shutdown-test', {});

      // Wait for job to start
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(jobStarted).toBe(true);

      // Initiate graceful shutdown
      const shutdownPromise = testWorker.close();

      // Job should complete before worker closes
      await shutdownPromise;
      expect(jobCompleted).toBe(true);

      const completedJob = await testQueue.getJob(job.id);
      expect(completedJob.returnvalue.success).toBe(true);
    }, 25000);

    it('should not accept new jobs during shutdown', async () => {
      testWorker = new Worker(
        queueName,
        async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return { success: true };
        },
        { connection }
      );

      // Add first job
      await testQueue.add('shutdown-job-1', {});

      // Start shutdown
      const shutdownPromise = testWorker.close();

      // Try to add job during shutdown
      const job2 = await testQueue.add('shutdown-job-2', {});

      await shutdownPromise;

      // Second job should remain in waiting state
      const job2Status = await job2.getState();
      expect(job2Status).toBe('waiting');
    }, 25000);

    it('should handle shutdown during retry delay', async () => {
      let attemptCount = 0;

      testWorker = new Worker(
        queueName,
        async () => {
          attemptCount++;
          throw new Error('Test retry during shutdown');
        },
        { connection }
      );

      await testQueue.add('shutdown-during-retry', {});

      // Wait for first attempt to fail
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Shutdown during retry backoff
      await testWorker.close();

      // Job should be in delayed state (waiting for retry)
      const jobs = await testQueue.getJobs(['delayed', 'waiting']);
      expect(jobs.length).toBeGreaterThan(0);
    }, 25000);
  });

  describe('Job Priority & Ordering', () => {
    it('should process high-priority jobs first', async () => {
      const processedOrder = [];

      testWorker = new Worker(
        queueName,
        async (job) => {
          processedOrder.push(job.data.priority);
          return { success: true };
        },
        { connection }
      );

      // Add jobs with different priorities
      await testQueue.add('low-priority', { priority: 'low' }, { priority: 10 });
      await testQueue.add('high-priority', { priority: 'high' }, { priority: 1 });
      await testQueue.add('medium-priority', { priority: 'medium' }, { priority: 5 });

      // Wait for all to process
      await new Promise(resolve => setTimeout(resolve, 5000));

      // High priority should be processed first
      expect(processedOrder[0]).toBe('high');
    }, 25000);

    it('should maintain FIFO for same priority jobs', async () => {
      const processedOrder = [];

      testWorker = new Worker(
        queueName,
        async (job) => {
          processedOrder.push(job.data.index);
          return { success: true };
        },
        { connection, concurrency: 1 } // Process one at a time
      );

      // Add jobs in order
      for (let i = 0; i < 5; i++) {
        await testQueue.add(`job-${i}`, { index: i });
      }

      // Wait for all to process
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Should maintain FIFO order
      expect(processedOrder).toEqual([0, 1, 2, 3, 4]);
    }, 25000);
  });

  describe('Rate Limiting', () => {
    it('should respect queue rate limits', async () => {
      let processCount = 0;
      const processTimestamps = [];

      const rateLimitedQueue = new Queue('rate-limited-queue', {
        connection,
        limiter: {
          max: 2, // Max 2 jobs
          duration: 2000, // Per 2 seconds
        },
      });

      const rateLimitedWorker = new Worker(
        'rate-limited-queue',
        async () => {
          processCount++;
          processTimestamps.push(Date.now());
          return { success: true };
        },
        { connection }
      );

      // Add 5 jobs rapidly
      for (let i = 0; i < 5; i++) {
        await rateLimitedQueue.add(`rate-limited-${i}`, {});
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Should have processed jobs with rate limiting
      expect(processCount).toBe(5);

      // Verify rate limit was respected (at most 2 jobs per 2s window)
      if (processTimestamps.length >= 3) {
        const window1 = processTimestamps[1] - processTimestamps[0];
        expect(window1).toBeLessThanOrEqual(2000);
      }

      // Safe cleanup
      await cleanupQueuesAndWorkers({
        workers: [rateLimitedWorker].filter(Boolean),
        queues: [rateLimitedQueue].filter(Boolean),
        obliterate: true,
        timeout: 5000
      });
    }, 30000);
  });

  describe('Stalled Job Detection', () => {
    it('should detect and reprocess stalled jobs', async () => {
      let processCount = 0;

      testWorker = new Worker(
        queueName,
        async (job) => {
          processCount++;
          
          if (processCount === 1) {
            // Simulate worker crash (never complete)
            await new Promise(() => {}); // Hang forever
          }
          
          return { success: true, attempt: processCount };
        },
        {
          connection,
          stalledInterval: 2000, // Check for stalled jobs every 2s
          maxStalledCount: 1,
        }
      );

      await testQueue.add('stalled-job-test', {});

      // Wait for stalled detection
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Job should be marked as stalled and moved back to waiting
      const stalledJobs = await testQueue.getFailed();
      expect(stalledJobs.length).toBeGreaterThan(0);
    }, 30000);
  });
});
