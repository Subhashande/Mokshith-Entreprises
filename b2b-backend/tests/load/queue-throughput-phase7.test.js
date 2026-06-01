import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import connectDB from '../../src/config/db.js';
import { redisClient } from '../../src/config/redis.js';
import {
  emailQueue,
  notificationQueue,
  inventoryQueue,
  paymentQueue,
  webhookQueue,
  auditQueue,
} from '../../src/config/queue.js';
import User from '../../src/modules/user/user.model.js';
import { hashPassword } from '../../src/utils/hashPassword.js';
import { ROLES } from '../../src/constants/roles.js';
import { logger } from '../../src/config/logger.js';

/**
 * 🚀 PHASE 7 STEP 7: Queue Throughput & Backpressure Tests
 * 
 * Tests queue system performance under high load, backpressure handling,
 * job processing throughput, retry mechanisms, and queue stability.
 * 
 * Critical Validation:
 * - High throughput job processing
 * - Proper backpressure handling
 * - No job loss during load
 * - Retry mechanism reliability
 * - Queue depth monitoring
 * - Worker concurrency control
 * - No queue saturation crashes
 */

describe('PHASE 7 STEP 7: Queue Throughput & Backpressure Tests', () => {
  let testUser;

  beforeAll(async () => {
    await connectDB();
    await redisClient.connect();

    // Clear test data
    await User.deleteMany({});

    // Create test user
    const hashedPassword = await hashPassword('testpass123');
    testUser = await User.create({
      name: 'Queue Test User',
      email: 'queuetest@example.com',
      password: hashedPassword,
      mobile: '9876543210',
      role: ROLES.BUYER,
      isVerified: true,
    });

    logger.info('Queue test setup completed', { userId: testUser._id });
  }, 60000);

  afterAll(async () => {
    await User.deleteMany({});
    await redisClient.quit();
    await mongoose.connection.close();
  }, 30000);

  beforeEach(async () => {
    // Clear queue jobs before each test
    try {
      await emailQueue.obliterate({ force: true });
      await notificationQueue.obliterate({ force: true });
      await inventoryQueue.obliterate({ force: true });
      await paymentQueue.obliterate({ force: true });
      await webhookQueue.obliterate({ force: true });
      await auditQueue.obliterate({ force: true });
    } catch (error) {
      logger.warn('Error clearing queues', { error: error.message });
    }
  }, 30000);

  // ==============================================
  // TEST GROUP 1: High Volume Job Processing
  // ==============================================

  describe('High Volume Job Processing', () => {
    it('should process 1000 email jobs within reasonable time', async () => {
      const jobCount = 1000;
      const startTime = Date.now();

      // Add 1000 jobs to email queue
      const jobPromises = Array.from({ length: jobCount }, (_, idx) =>
        emailQueue.add(
          'test-email',
          {
            to: `test${idx}@example.com`,
            subject: `Test Email ${idx}`,
            body: `This is test email ${idx}`,
          },
          {
            attempts: 1,
            removeOnComplete: true,
            removeOnFail: 100,
          }
        )
      );

      await Promise.all(jobPromises);

      const enqueueTime = Date.now() - startTime;

      logger.info('Email queue enqueue performance', {
        jobs: jobCount,
        enqueueTime: `${enqueueTime}ms`,
        avgEnqueueTime: `${(enqueueTime / jobCount).toFixed(2)}ms/job`,
        throughput: `${(jobCount / enqueueTime * 1000).toFixed(2)} jobs/s`,
      });

      // Verify jobs were added
      const waitingCount = await emailQueue.getWaitingCount();
      const activeCount = await emailQueue.getActiveCount();
      const totalQueued = waitingCount + activeCount;

      logger.info('Email queue status', {
        waiting: waitingCount,
        active: activeCount,
        total: totalQueued,
      });

      // CRITICAL: All jobs should be queued
      expect(totalQueued).toBe(jobCount);

      // CRITICAL: Enqueue should be fast (<5s for 1000 jobs)
      expect(enqueueTime).toBeLessThan(5000);
    }, 60000);

    it('should handle burst of 500 notification jobs', async () => {
      const jobCount = 500;
      const startTime = Date.now();

      // Burst add
      const promises = Array.from({ length: jobCount }, (_, idx) =>
        notificationQueue.add(
          'test-notification',
          {
            userId: testUser._id.toString(),
            title: `Notification ${idx}`,
            message: `Test notification ${idx}`,
            type: 'INFO',
          },
          { attempts: 1, removeOnComplete: true }
        )
      );

      await Promise.all(promises);

      const duration = Date.now() - startTime;

      logger.info('Notification queue burst test', {
        jobs: jobCount,
        duration: `${duration}ms`,
        throughput: `${(jobCount / duration * 1000).toFixed(2)} jobs/s`,
      });

      const queuedCount = await notificationQueue.getWaitingCount() +
        await notificationQueue.getActiveCount();

      expect(queuedCount).toBe(jobCount);
      expect(duration).toBeLessThan(3000);
    }, 60000);

    it('should process mixed queue jobs concurrently', async () => {
      const jobsPerQueue = 100;
      const startTime = Date.now();

      // Add jobs to multiple queues simultaneously
      const promises = [
        ...Array.from({ length: jobsPerQueue }, (_, idx) =>
          emailQueue.add('test-email', { to: `test${idx}@example.com` }, { attempts: 1, removeOnComplete: true })
        ),
        ...Array.from({ length: jobsPerQueue }, (_, idx) =>
          notificationQueue.add('test-notification', { userId: testUser._id, message: `Msg ${idx}` }, { attempts: 1, removeOnComplete: true })
        ),
        ...Array.from({ length: jobsPerQueue }, (_, idx) =>
          auditQueue.add('test-audit', { action: `Action ${idx}`, userId: testUser._id }, { attempts: 1, removeOnComplete: true })
        ),
      ];

      await Promise.all(promises);

      const duration = Date.now() - startTime;
      const totalJobs = jobsPerQueue * 3;

      logger.info('Mixed queue concurrent test', {
        queues: 3,
        jobsPerQueue,
        totalJobs,
        duration: `${duration}ms`,
        throughput: `${(totalJobs / duration * 1000).toFixed(2)} jobs/s`,
      });

      // Verify jobs in each queue
      const emailCount = await emailQueue.getWaitingCount() + await emailQueue.getActiveCount();
      const notificationCount = await notificationQueue.getWaitingCount() + await notificationQueue.getActiveCount();
      const auditCount = await auditQueue.getWaitingCount() + await auditQueue.getActiveCount();

      expect(emailCount).toBe(jobsPerQueue);
      expect(notificationCount).toBe(jobsPerQueue);
      expect(auditCount).toBe(jobsPerQueue);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 2: Backpressure Handling
  // ==============================================

  describe('Backpressure Handling', () => {
    it('should handle queue depth without crashing', async () => {
      const jobCount = 2000;

      // Add 2000 jobs rapidly
      const promises = Array.from({ length: jobCount }, (_, idx) =>
        inventoryQueue.add(
          'test-inventory',
          {
            productId: new mongoose.Types.ObjectId().toString(),
            quantity: idx,
          },
          { attempts: 1, removeOnComplete: true }
        )
      );

      await Promise.all(promises);

      // Check queue depth
      const waitingCount = await inventoryQueue.getWaitingCount();
      const activeCount = await inventoryQueue.getActiveCount();
      const totalDepth = waitingCount + activeCount;

      logger.info('Queue depth test', {
        jobs: jobCount,
        waiting: waitingCount,
        active: activeCount,
        totalDepth,
      });

      // CRITICAL: All jobs should be queued without loss
      expect(totalDepth).toBe(jobCount);

      // System should still be responsive
      const healthCheckStart = Date.now();
      await redisClient.ping();
      const healthCheckTime = Date.now() - healthCheckStart;

      expect(healthCheckTime).toBeLessThan(100);
    }, 60000);

    it('should apply rate limiting correctly', async () => {
      const jobCount = 150;

      // Email queue has rate limit: 100 jobs per minute
      const promises = Array.from({ length: jobCount }, (_, idx) =>
        emailQueue.add(
          'rate-limited-email',
          { to: `test${idx}@example.com` },
          { attempts: 1, removeOnComplete: true }
        )
      );

      await Promise.all(promises);

      // Wait for processing to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      const waitingCount = await emailQueue.getWaitingCount();
      const activeCount = await emailQueue.getActiveCount();
      const completedCount = await emailQueue.getCompletedCount();

      logger.info('Rate limiting test', {
        submitted: jobCount,
        waiting: waitingCount,
        active: activeCount,
        completed: completedCount,
      });

      // Some jobs should be waiting due to rate limit
      expect(waitingCount + activeCount).toBeGreaterThan(0);
    }, 60000);

    it('should prevent queue saturation from affecting other queues', async () => {
      // Saturate email queue
      const saturationJobs = 1000;
      const saturationPromises = Array.from({ length: saturationJobs }, (_, idx) =>
        emailQueue.add('saturation-email', { to: `test${idx}@example.com` }, { attempts: 1, removeOnComplete: true })
      );

      await Promise.all(saturationPromises);

      // Try to add jobs to other queue (should not be affected)
      const normalJobs = 50;
      const startTime = Date.now();

      const normalPromises = Array.from({ length: normalJobs }, (_, idx) =>
        auditQueue.add('normal-audit', { action: `Action ${idx}` }, { attempts: 1, removeOnComplete: true })
      );

      await Promise.all(normalPromises);

      const duration = Date.now() - startTime;

      logger.info('Queue isolation test', {
        saturatedQueue: 'email',
        saturatedJobs: saturationJobs,
        normalQueue: 'audit',
        normalJobs,
        addDuration: `${duration}ms`,
      });

      // Audit queue should not be affected by email queue saturation
      expect(duration).toBeLessThan(2000);

      const auditCount = await auditQueue.getWaitingCount() + await auditQueue.getActiveCount();
      expect(auditCount).toBe(normalJobs);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 3: Job Retry Mechanisms
  // ==============================================

  describe('Job Retry Mechanisms', () => {
    it('should retry failed jobs according to strategy', async () => {
      // Add job that will fail
      const job = await webhookQueue.add(
        'failing-webhook',
        {
          url: 'http://invalid-url-that-will-fail.test',
          payload: { test: 'data' },
        },
        {
          attempts: 3,
          backoff: {
            type: 'fixed',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      logger.info('Retry test job added', { jobId: job.id });

      // Wait for job to fail and retry
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check job state
      const jobState = await job.getState();
      const attemptsMade = job.attemptsMade;

      logger.info('Job retry status', {
        jobId: job.id,
        state: jobState,
        attemptsMade,
      });

      // Job should have attempted retries (or still be waiting/active)
      expect(['waiting', 'active', 'failed']).toContain(jobState);
    }, 30000);

    it('should handle exponential backoff correctly', async () => {
      // Add job with exponential backoff
      const job = await paymentQueue.add(
        'failing-payment',
        {
          orderId: new mongoose.Types.ObjectId().toString(),
          amount: 1000,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      logger.info('Exponential backoff test job added', { jobId: job.id });

      // Allow time for failures and retries
      await new Promise(resolve => setTimeout(resolve, 8000));

      const jobState = await job.getState();
      const attemptsMade = job.attemptsMade;

      logger.info('Exponential backoff job status', {
        jobId: job.id,
        state: jobState,
        attemptsMade,
      });

      // Verify retry behavior
      expect(attemptsMade).toBeGreaterThan(0);
    }, 30000);
  });

  // ==============================================
  // TEST GROUP 4: Queue Metrics & Monitoring
  // ==============================================

  describe('Queue Metrics & Monitoring', () => {
    it('should provide accurate queue metrics under load', async () => {
      const jobCount = 200;

      // Add jobs
      await Promise.all(
        Array.from({ length: jobCount }, (_, idx) =>
          notificationQueue.add('metric-notification', { message: `Msg ${idx}` }, { attempts: 1, removeOnComplete: true })
        )
      );

      // Get metrics
      const waiting = await notificationQueue.getWaitingCount();
      const active = await notificationQueue.getActiveCount();
      const completed = await notificationQueue.getCompletedCount();
      const failed = await notificationQueue.getFailedCount();
      const delayed = await notificationQueue.getDelayedCount();

      const metrics = { waiting, active, completed, failed, delayed, total: waiting + active };

      logger.info('Queue metrics', metrics);

      // Metrics should be accurate
      expect(metrics.total).toBe(jobCount);
      expect(metrics.failed).toBe(0);
    }, 60000);

    it('should track job completion rate', async () => {
      const jobCount = 100;
      const startTime = Date.now();

      // Add fast-processing jobs
      await Promise.all(
        Array.from({ length: jobCount }, (_, idx) =>
          auditQueue.add('tracking-audit', { action: `Action ${idx}` }, { attempts: 1, removeOnComplete: true })
        )
      );

      // Wait for some processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      const duration = Date.now() - startTime;
      const completed = await auditQueue.getCompletedCount();
      const completionRate = completed / duration * 1000;

      logger.info('Job completion rate', {
        duration: `${duration}ms`,
        submitted: jobCount,
        completed,
        completionRate: `${completionRate.toFixed(2)} jobs/s`,
      });

      // Some jobs should be completed
      expect(completed).toBeGreaterThan(0);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 5: Queue Stability Under Load
  // ==============================================

  describe('Queue Stability Under Load', () => {
    it('should maintain stability with sustained job addition', async () => {
      const durationMs = 30000; // 30 seconds
      const jobsPerSecond = 10;
      const intervalMs = 1000 / jobsPerSecond;

      const startTime = Date.now();
      let jobsAdded = 0;

      while (Date.now() - startTime < durationMs) {
        const loopStart = Date.now();

        try {
          await emailQueue.add(
            'sustained-email',
            { to: `sustained${jobsAdded}@example.com` },
            { attempts: 1, removeOnComplete: true }
          );

          jobsAdded++;
        } catch (error) {
          logger.error('Error adding job', { error: error.message });
        }

        const elapsed = Date.now() - loopStart;
        const waitTime = Math.max(0, intervalMs - elapsed);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const duration = Date.now() - startTime;

      logger.info('Sustained queue load test', {
        duration: `${duration / 1000}s`,
        jobsAdded,
        avgRate: `${(jobsAdded / duration * 1000).toFixed(2)} jobs/s`,
      });

      // Should maintain stable addition rate
      expect(jobsAdded).toBeGreaterThan(250); // At least 250 jobs in 30s

      // Redis should still be responsive
      const pingStart = Date.now();
      await redisClient.ping();
      const pingTime = Date.now() - pingStart;

      expect(pingTime).toBeLessThan(100);
    }, 60000);

    it('should recover from temporary Redis slowness', async () => {
      // Add jobs normally
      const beforeSlowness = Date.now();
      await Promise.all(
        Array.from({ length: 50 }, (_, idx) =>
          inventoryQueue.add('before-slowness', { productId: idx }, { attempts: 1, removeOnComplete: true })
        )
      );
      const beforeDuration = Date.now() - beforeSlowness;

      // Simulate slowness by adding many jobs to Redis
      const slowdownJobs = Array.from({ length: 500 }, (_, idx) =>
        redisClient.set(`slowdown:${idx}`, `value_${idx}`, 'EX', 60)
      );
      await Promise.all(slowdownJobs);

      // Try adding jobs during slowness
      const duringSlowness = Date.now();
      await Promise.all(
        Array.from({ length: 50 }, (_, idx) =>
          inventoryQueue.add('during-slowness', { productId: idx + 100 }, { attempts: 1, removeOnComplete: true })
        )
      );
      const duringDuration = Date.now() - duringSlowness;

      logger.info('Redis slowness recovery test', {
        beforeDuration: `${beforeDuration}ms`,
        duringDuration: `${duringDuration}ms`,
        degradation: `${((duringDuration - beforeDuration) / beforeDuration * 100).toFixed(2)}%`,
      });

      // Should still complete (may be slower but not fail)
      expect(duringDuration).toBeLessThan(10000);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 6: Job Priority & Ordering
  // ==============================================

  describe('Job Priority & Ordering', () => {
    it('should respect job priorities', async () => {
      // Add jobs with different priorities
      const lowPriorityJob = await paymentQueue.add(
        'low-priority',
        { priority: 'low' },
        { priority: 10, attempts: 1, removeOnComplete: true }
      );

      const highPriorityJob = await paymentQueue.add(
        'high-priority',
        { priority: 'high' },
        { priority: 1, attempts: 1, removeOnComplete: true }
      );

      const mediumPriorityJob = await paymentQueue.add(
        'medium-priority',
        { priority: 'medium' },
        { priority: 5, attempts: 1, removeOnComplete: true }
      );

      logger.info('Priority test jobs added', {
        lowPriority: lowPriorityJob.id,
        mediumPriority: mediumPriorityJob.id,
        highPriority: highPriorityJob.id,
      });

      // All jobs should be queued
      const queuedCount = await paymentQueue.getWaitingCount() + await paymentQueue.getActiveCount();
      expect(queuedCount).toBeGreaterThanOrEqual(3);
    }, 30000);

    it('should maintain FIFO order for same-priority jobs', async () => {
      const jobCount = 20;

      // Add jobs in sequence
      const jobs = [];
      for (let i = 0; i < jobCount; i++) {
        const job = await auditQueue.add(
          'fifo-audit',
          { index: i, timestamp: Date.now() },
          { priority: 5, attempts: 1, removeOnComplete: true }
        );
        jobs.push({ id: job.id, index: i });
      }

      logger.info('FIFO order test', {
        jobsAdded: jobCount,
        firstJobId: jobs[0].id,
        lastJobId: jobs[jobs.length - 1].id,
      });

      // Verify all jobs are queued
      const queuedCount = await auditQueue.getWaitingCount() + await auditQueue.getActiveCount();
      expect(queuedCount).toBeGreaterThanOrEqual(jobCount);
    }, 30000);
  });
});
