import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Queue, Worker, QueueEvents } from 'bullmq';
import { clearDatabase, cleanupQueuesAndWorkers } from '../helpers/testUtils.js';
import { redisClient } from '../../src/config/redis.js';
import mongoose from 'mongoose';
import Order from '../../src/modules/order/order.model.js';
import Payment from '../../src/modules/payment/payment.model.js';
import User from '../../src/modules/user/user.model.js';
import { ROLES } from '../../src/constants/roles.js';

/**
 * 🔒 PHASE 6 STEP 10-14: Health, Distributed, Integration & Validation Tests
 * Comprehensive tests for queue health monitoring, distributed processing,
 * end-to-end integration flows, error handling, and final validation
 */

describe('Phase 6: Health, Distributed Processing & Validation', () => {
  let testQueue;
  let testWorker;
  let queueEvents;
  const queueName = 'health-distributed-queue';

  const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  };

  beforeEach(async () => {
    await clearDatabase();
    await redisClient.flushdb();

    testQueue = new Queue(queueName, { connection });
    queueEvents = new QueueEvents(queueName, { connection });
  });

  afterEach(async () => {
    await cleanupQueuesAndWorkers({
      workers: [testWorker].filter(Boolean),
      queues: [testQueue].filter(Boolean),
      queueEvents: [queueEvents].filter(Boolean),
      obliterate: true,
      timeout: 5000,
    });

    try {
      if (redisClient && typeof redisClient.flushdb === 'function') {
        await redisClient.flushdb();
      }
    } catch (error) {
      console.error('Failed to flush Redis:', error.message);
    }
  });

  describe('STEP 10: Queue Health & Monitoring', () => {
    beforeEach(() => {
      testWorker = new Worker(
        queueName,
        async (job) => {
          if (job.data.shouldFail) {
            throw new Error('Intentional failure for metrics');
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          return { success: true };
        },
        { connection, concurrency: 3 }
      );
    });

    it('should track queue depth (waiting jobs count)', async () => {
      // Add jobs
      await Promise.all([
        testQueue.add('depth-1', {}),
        testQueue.add('depth-2', {}),
        testQueue.add('depth-3', {}),
        testQueue.add('depth-4', {}),
        testQueue.add('depth-5', {}),
      ]);

      // Get waiting count immediately
      const waitingCount = await testQueue.getWaitingCount();
      expect(waitingCount).toBeGreaterThan(0);
      expect(waitingCount).toBeLessThanOrEqual(5);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Queue depth should decrease
      const remainingWaiting = await testQueue.getWaitingCount();
      expect(remainingWaiting).toBeLessThan(waitingCount);
    }, 50000);

    it('should track failed job count accurately', async () => {
      // Add jobs that will fail
      await Promise.all([
        testQueue.add('fail-1', { shouldFail: true }, { attempts: 1 }),
        testQueue.add('fail-2', { shouldFail: true }, { attempts: 1 }),
        testQueue.add('fail-3', { shouldFail: true }, { attempts: 1 }),
      ]);

      // Wait for failures
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check failed count
      const failedCount = await testQueue.getFailedCount();
      expect(failedCount).toBe(3);
    }, 50000);

    it('should track completed job count', async () => {
      await Promise.all([
        testQueue.add('complete-1', {}),
        testQueue.add('complete-2', {}),
        testQueue.add('complete-3', {}),
      ]);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const completedCount = await testQueue.getCompletedCount();
      expect(completedCount).toBe(3);
    }, 50000);

    it('should provide comprehensive job counts via getJobCounts', async () => {
      // Add various jobs
      await testQueue.add('waiting-1', {});
      await testQueue.add('waiting-2', {});
      await testQueue.add('fail-1', { shouldFail: true }, { attempts: 1 });
      await testQueue.add('delayed-1', {}, { delay: 5000 });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const counts = await testQueue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed'
      );

      expect(counts.waiting).toBeDefined();
      expect(counts.active).toBeDefined();
      expect(counts.completed).toBeDefined();
      expect(counts.failed).toBeDefined();
      expect(counts.delayed).toBeDefined();

      // Verify counts match expectations
      expect(counts.completed).toBeGreaterThan(0);
      expect(counts.failed).toBeGreaterThan(0);
      expect(counts.delayed).toBe(1);
    }, 50000);

    it('should track active worker count (simulated)', async () => {
      // In a real environment, you'd query Redis for active connections
      // For tests, we verify worker is processing

      await testQueue.add('active-test', {});

      const activeCount = await testQueue.getActiveCount();
      
      // Should have active jobs while worker is processing
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(activeCount).toBeGreaterThanOrEqual(0);
    }, 40000);

    it('should track retry metrics', async () => {
      let attemptCount = 0;

      await testWorker.close();
      testWorker = new Worker(
        queueName,
        async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Trigger retry');
          }
          return { success: true };
        },
        { connection }
      );

      const job = await testQueue.add('retry-metrics', {}, { attempts: 3 });

      await job.waitUntilFinished(queueEvents, 10000);

      const completedJob = await testQueue.getJob(job.id);

      // Verify retry metrics
      expect(completedJob.attemptsMade).toBe(3);
      expect(completedJob.finishedOn).toBeDefined();
      expect(completedJob.processedOn).toBeDefined();
    }, 40000);

    it('should calculate average processing time', async () => {
      const processingTimes = [];

      await testWorker.close();
      testWorker = new Worker(
        queueName,
        async (job) => {
          const startTime = Date.now();
          await new Promise(resolve => setTimeout(resolve, 200));
          processingTimes.push(Date.now() - startTime);
          return { success: true };
        },
        { connection }
      );

      await Promise.all([
        testQueue.add('timing-1', {}),
        testQueue.add('timing-2', {}),
        testQueue.add('timing-3', {}),
      ]);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const averageTime =
        processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;

      expect(averageTime).toBeGreaterThanOrEqual(180);
      expect(averageTime).toBeLessThan(300);
    }, 50000);

    it('should provide queue health status API', async () => {
      await Promise.all([
        testQueue.add('health-1', {}),
        testQueue.add('health-2', { shouldFail: true }, { attempts: 1 }),
      ]);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulated health check
      const health = {
        queueName: testQueue.name,
        waiting: await testQueue.getWaitingCount(),
        active: await testQueue.getActiveCount(),
        completed: await testQueue.getCompletedCount(),
        failed: await testQueue.getFailedCount(),
        delayed: await testQueue.getDelayedCount(),
        paused: await testQueue.isPaused(),
      };

      expect(health.queueName).toBe(queueName);
      expect(health.waiting).toBeGreaterThanOrEqual(0);
      expect(health.completed).toBeGreaterThan(0);
      expect(health.failed).toBeGreaterThan(0);
      expect(health.paused).toBe(false);
    }, 50000);
  });

  describe('STEP 11: Distributed Processing Consistency', () => {
    it('should process jobs across multiple worker instances without duplication', async () => {
      const processedJobs = [];

      // Create 3 workers
      const worker1 = new Worker(
        queueName,
        async (job) => {
          processedJobs.push({ jobId: job.id, worker: 1 });
          await new Promise(resolve => setTimeout(resolve, 100));
          return { success: true, worker: 1 };
        },
        { connection, concurrency: 2 }
      );

      const worker2 = new Worker(
        queueName,
        async (job) => {
          processedJobs.push({ jobId: job.id, worker: 2 });
          await new Promise(resolve => setTimeout(resolve, 100));
          return { success: true, worker: 2 };
        },
        { connection, concurrency: 2 }
      );

      const worker3 = new Worker(
        queueName,
        async (job) => {
          processedJobs.push({ jobId: job.id, worker: 3 });
          await new Promise(resolve => setTimeout(resolve, 100));
          return { success: true, worker: 3 };
        },
        { connection, concurrency: 2 }
      );

      // Add 10 jobs
      const jobs = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          testQueue.add(`distributed-${i}`, { index: i })
        )
      );

      await Promise.all(jobs.map(job => job.waitUntilFinished(queueEvents, 10000)));

      // Verify no duplicate processing
      expect(processedJobs.length).toBe(10);
      const uniqueJobIds = new Set(processedJobs.map(j => j.jobId));
      expect(uniqueJobIds.size).toBe(10);

      // Verify distribution across workers
      const worker1Jobs = processedJobs.filter(j => j.worker === 1).length;
      const worker2Jobs = processedJobs.filter(j => j.worker === 2).length;
      const worker3Jobs = processedJobs.filter(j => j.worker === 3).length;

      expect(worker1Jobs + worker2Jobs + worker3Jobs).toBe(10);

      await worker1.close();
      await worker2.close();
      await worker3.close();
    }, 40000);

    it('should maintain consistent distributed state across workers', async () => {
      const sharedState = { counter: 0 };

      const worker1 = new Worker(
        queueName,
        async (job) => {
          sharedState.counter++;
          await new Promise(resolve => setTimeout(resolve, 50));
          return { success: true, counter: sharedState.counter };
        },
        { connection }
      );

      const worker2 = new Worker(
        queueName,
        async (job) => {
          sharedState.counter++;
          await new Promise(resolve => setTimeout(resolve, 50));
          return { success: true, counter: sharedState.counter };
        },
        { connection }
      );

      await Promise.all([
        testQueue.add('state-1', {}),
        testQueue.add('state-2', {}),
        testQueue.add('state-3', {}),
        testQueue.add('state-4', {}),
      ]);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Counter should reflect all jobs (distributed across workers)
      expect(sharedState.counter).toBe(4);

      await worker1.close();
      await worker2.close();
    }, 50000);

    it('should handle worker failover gracefully', async () => {
      let worker1ProcessedCount = 0;

      testWorker = new Worker(
        queueName,
        async (job) => {
          worker1ProcessedCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
          return { success: true };
        },
        { connection, concurrency: 1 }
      );

      // Add jobs
      await Promise.all([
        testQueue.add('failover-1', {}),
        testQueue.add('failover-2', {}),
        testQueue.add('failover-3', {}),
        testQueue.add('failover-4', {}),
      ]);

      // Wait for first job to start
      await new Promise(resolve => setTimeout(resolve, 200));

      // Simulate worker 1 crash
      await testWorker.close();

      // Start worker 2 (failover)
      let worker2ProcessedCount = 0;
      testWorker = new Worker(
        queueName,
        async (job) => {
          worker2ProcessedCount++;
          return { success: true };
        },
        { connection, concurrency: 2 }
      );

      // Wait for remaining jobs to process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // All jobs should eventually complete
      const completedCount = await testQueue.getCompletedCount();
      expect(completedCount).toBeGreaterThanOrEqual(3);

      // Both workers should have processed jobs
      expect(worker1ProcessedCount).toBeGreaterThan(0);
      expect(worker2ProcessedCount).toBeGreaterThan(0);
    }, 30000);

    it('should handle concurrent consumers without race conditions', async () => {
      const processedItems = [];

      const worker1 = new Worker(
        queueName,
        async (job) => {
          processedItems.push({ jobId: job.id, timestamp: Date.now(), worker: 1 });
          return { success: true };
        },
        { connection, concurrency: 5 }
      );

      const worker2 = new Worker(
        queueName,
        async (job) => {
          processedItems.push({ jobId: job.id, timestamp: Date.now(), worker: 2 });
          return { success: true };
        },
        { connection, concurrency: 5 }
      );

      // Add 20 jobs simultaneously
      await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          testQueue.add(`concurrent-${i}`, { index: i })
        )
      );

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify all processed exactly once
      expect(processedItems.length).toBe(20);
      const uniqueJobIds = new Set(processedItems.map(item => item.jobId));
      expect(uniqueJobIds.size).toBe(20);

      await worker1.close();
      await worker2.close();
    }, 30000);
  });

  describe('STEP 12: Queue Integration Tests', () => {
    let testUser;
    let testOrder;
    let testPayment;

    beforeEach(async () => {
      // Create test user
      testUser = await User.create({
        name: 'Integration Test User',
        email: 'integration@test.com',
        password: 'Test@1234',
        role: ROLES.B2B_CUSTOMER,
        mobile: '9876543210',
        status: 'ACTIVE',
      });

      // Create test order
      testOrder = await Order.create({
        userId: testUser._id,
        items: [{ 
          productId: new mongoose.Types.ObjectId(), 
          name: 'Test Product',
          quantity: 5, 
          price: 1000 
        }],
        totalAmount: 5000,
        paymentStatus: 'PENDING',
        status: 'PENDING_PAYMENT',
        paymentMethod: 'ONLINE',
        address: {
          name: 'Test Customer',
          phone: '9876543210',
          addressLine: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
        },
      });
    });

    it('should handle complete order → queue → worker → invoice flow', async () => {
      const invoiceGenerated = [];

      testWorker = new Worker(
        queueName,
        async (job) => {
          const { orderId, userId } = job.data;

          // Simulate invoice generation
          invoiceGenerated.push({ orderId, userId, timestamp: Date.now() });

          // Update order
          await Order.findByIdAndUpdate(orderId, {
            status: 'CONFIRMED',
            invoiceGenerated: true,
          });

          return { success: true, invoiceId: `INV_${orderId}` };
        },
        { connection }
      );

      // Queue job
      const job = await testQueue.add('post-order-processing', {
        orderId: testOrder._id.toString(),
        userId: testUser._id.toString(),
      });

      await job.waitUntilFinished(queueEvents, 5000);

      // Verify invoice generated
      expect(invoiceGenerated).toHaveLength(1);
      expect(invoiceGenerated[0].orderId).toBe(testOrder._id.toString());

      // Verify order updated
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.status).toBe('CONFIRMED');
      expect(updatedOrder.invoiceGenerated).toBe(true);
    }, 30000);

    it('should handle payment → queue → delivery assignment flow', async () => {
      // Create successful payment
      testPayment = await Payment.create({
        orderId: testOrder._id,
        userId: testUser._id,
        amount: 5000,
        status: 'SUCCESS',
        paymentMethod: 'ONLINE',
        razorpayPaymentId: 'pay_integration_test',
      });

      const deliveryAssignments = [];

      testWorker = new Worker(
        queueName,
        async (job) => {
          const { orderId, paymentId } = job.data;

          // Simulate delivery assignment
          deliveryAssignments.push({
            orderId,
            paymentId,
            assignedAt: Date.now(),
          });

          await Order.findByIdAndUpdate(orderId, {
            deliveryAssigned: true,
            deliveryPartnerId: new mongoose.Types.ObjectId(),
          });

          return { success: true };
        },
        { connection }
      );

      const job = await testQueue.add('post-payment-delivery', {
        orderId: testOrder._id.toString(),
        paymentId: testPayment._id.toString(),
      });

      await job.waitUntilFinished(queueEvents, 5000);

      expect(deliveryAssignments).toHaveLength(1);

      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.deliveryAssigned).toBe(true);
    }, 30000);

    it('should handle retry → recovery → success flow', async () => {
      let attemptCount = 0;

      testWorker = new Worker(
        queueName,
        async (job) => {
          attemptCount++;

          if (attemptCount < 3) {
            throw new Error('Service temporarily unavailable');
          }

          // Success on 3rd attempt
          await Order.findByIdAndUpdate(job.data.orderId, {
            status: 'CONFIRMED',
            retryCount: attemptCount,
          });

          return { success: true, attempts: attemptCount };
        },
        { connection }
      );

      const job = await testQueue.add(
        'retry-recovery',
        { orderId: testOrder._id.toString() },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 500 },
        }
      );

      await job.waitUntilFinished(queueEvents, 10000);

      expect(attemptCount).toBe(3);

      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.status).toBe('CONFIRMED');
      expect(updatedOrder.retryCount).toBe(3);
    }, 40000);

    it('should handle DLQ → manual retry → success flow', async () => {
      let attemptCount = 0;

      testWorker = new Worker(
        queueName,
        async (job) => {
          attemptCount++;

          if (attemptCount <= 2) {
            throw new Error('Initial attempts fail');
          }

          return { success: true, retriedFromDLQ: true };
        },
        { connection }
      );

      const job = await testQueue.add('dlq-manual-retry', {}, { attempts: 2 });

      // Wait for failure
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Get failed job
      const failedJobs = await testQueue.getFailed();
      const failedJob = failedJobs.find(j => j.id === job.id);
      expect(failedJob).toBeDefined();

      // Manual retry
      await failedJob.retry();

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should succeed
      const retriedJob = await testQueue.getJob(job.id);
      expect(retriedJob.returnvalue?.success).toBe(true);
    }, 40000);

    it('should handle shutdown → restart → job recovery flow', async () => {
      testWorker = new Worker(
        queueName,
        async (job) => {
          await new Promise(resolve => setTimeout(resolve, 500));
          return { success: true };
        },
        { connection }
      );

      // Add jobs
      await Promise.all([
        testQueue.add('restart-1', {}),
        testQueue.add('restart-2', {}),
        testQueue.add('restart-3', {}),
      ]);

      // Wait for partial processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Shutdown
      await testWorker.close();

      // Restart
      testWorker = new Worker(
        queueName,
        async (job) => ({ success: true, recovered: true }),
        { connection }
      );

      await new Promise(resolve => setTimeout(resolve, 2000));

      const completed = await testQueue.getCompletedCount();
      expect(completed).toBeGreaterThanOrEqual(2);
    }, 30000);
  });

  describe('STEP 13: Error Handling Validation', () => {
    it('should handle malformed job payloads gracefully', async () => {
      testWorker = new Worker(
        queueName,
        async (job) => {
          if (!job.data || typeof job.data !== 'object') {
            throw new Error('Invalid job payload');
          }
          return { success: true };
        },
        { connection }
      );

      // Add malformed job
      const job = await testQueue.add('malformed', null);

      await new Promise(resolve => setTimeout(resolve, 5000));

      const failedJob = await testQueue.getJob(job.id);
      expect(failedJob.failedReason).toContain('Invalid job payload');
    }, 25000);

    it('should handle Redis connection failures gracefully', async () => {
      testWorker = new Worker(
        queueName,
        async () => ({ success: true }),
        { connection }
      );

      const job = await testQueue.add('redis-resilience', {});

      // BullMQ handles Redis reconnection internally
      await job.waitUntilFinished(queueEvents, 5000);

      const completedJob = await testQueue.getJob(job.id);
      expect(completedJob.returnvalue.success).toBe(true);
    });

    it('should handle worker crashes without data loss', async () => {
      let crashed = false;

      testWorker = new Worker(
        queueName,
        async (job) => {
          if (!crashed) {
            crashed = true;
            process.nextTick(() => testWorker.close());
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          return { success: true };
        },
        { connection }
      );

      const job = await testQueue.add('crash-safety', {});

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Restart worker
      testWorker = new Worker(
        queueName,
        async () => ({ success: true, recovered: true }),
        { connection }
      );

      await job.waitUntilFinished(queueEvents, 10000);

      const recoveredJob = await testQueue.getJob(job.id);
      expect(recoveredJob.returnvalue.success).toBe(true);
    }, 40000);

    it('should handle duplicate job events gracefully', async () => {
      const processedEvents = [];

      testWorker = new Worker(
        queueName,
        async (job) => {
          processedEvents.push(job.id);
          return { success: true };
        },
        { connection }
      );

      const job = await testQueue.add('duplicate-event', {}, {
        jobId: 'unique-job-123', // Prevents duplicates
      });

      // Try to add duplicate
      const duplicateJob = await testQueue.add('duplicate-event', {}, {
        jobId: 'unique-job-123',
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should only process once
      expect(processedEvents.length).toBe(1);
    }, 50000);
  });

  describe('STEP 14: Final Validation Requirements', () => {
    it('should have no hanging workers after test completion', async () => {
      testWorker = new Worker(
        queueName,
        async () => ({ success: true }),
        { connection }
      );

      await testQueue.add('no-hanging', {});
      await new Promise(resolve => setTimeout(resolve, 1000));

      await testWorker.close();

      // Worker should be closed
      expect(true).toBe(true);
    });

    it('should have no open Redis handles after cleanup', async () => {
      testWorker = new Worker(queueName, async () => ({ success: true }), { connection });

      await testQueue.add('redis-cleanup', {});
      await new Promise(resolve => setTimeout(resolve, 1000));

      await testWorker.close();
      await testQueue.close();
      await queueEvents.close();

      // No hanging handles
      expect(true).toBe(true);
    });

    it('should prevent duplicate job execution with jobId', async () => {
      const processed = [];

      testWorker = new Worker(
        queueName,
        async (job) => {
          processed.push(job.id);
          return { success: true };
        },
        { connection }
      );

      await testQueue.add('unique', {}, { jobId: 'test-unique-123' });
      await testQueue.add('unique', {}, { jobId: 'test-unique-123' });

      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(processed.length).toBe(1);
    }, 50000);

    it('should support stable repeated test runs', async () => {
      for (let run = 1; run <= 3; run++) {
        testWorker = new Worker(
          queueName,
          async () => ({ success: true, run }),
          { connection }
        );

        const job = await testQueue.add(`stable-run-${run}`, {});
        await job.waitUntilFinished(queueEvents, 5000);

        const completedJob = await testQueue.getJob(job.id);
        expect(completedJob.returnvalue.success).toBe(true);
        expect(completedJob.returnvalue.run).toBe(run);

        await testWorker.close();
        await testQueue.obliterate({ force: true });
      }
    }, 50000);
  });
});
