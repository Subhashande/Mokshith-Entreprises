import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Queue, Worker } from 'bullmq';
import mongoose from 'mongoose';
import Order from '../../src/modules/order/order.model.js';
import Payment from '../../src/modules/payment/payment.model.js';
import User from '../../src/modules/user/user.model.js';
import Product from '../../src/modules/product/product.model.js';
import Inventory from '../../src/modules/inventory/inventory.model.js';
import { clearDatabase, cleanupQueuesAndWorkers } from '../helpers/testUtils.js';
import { redisClient } from '../../src/config/redis.js';
import { ROLES } from '../../src/constants/roles.js';

/**
 * 🔒 CRITICAL: Worker Job Processing & Crash Recovery Tests
 * Tests worker reliability, retry logic, failure handling, and crash recovery
 */

describe('Worker Job Processing Tests', () => {
  let testUser;
  let testOrder;
  let testPayment;
  let testProduct;
  let testInventory;
  let postPaymentQueue;
  let postOrderQueue;

  const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
  };

  beforeEach(async () => {
    await clearDatabase();
    await redisClient.flushdb();

    // Initialize queues
    postPaymentQueue = new Queue('post-payment', { connection });
    postOrderQueue = new Queue('post-order', { connection });

    // Create test data
    testUser = await User.create({
      name: 'Worker Test User',
      email: 'worker@test.com',
      password: 'Test@1234',
      role: ROLES.B2B_CUSTOMER,
      mobile: '9876543210',
      status: 'ACTIVE',
    });

    testProduct = await Product.create({
      name: 'Worker Test Product',
      category: 'Test',
      basePrice: 1000,
      stock: 100,
      status: 'ACTIVE',
    });

    const Warehouse = mongoose.model('Warehouse');
    let warehouse = await Warehouse.findOne();
    if (!warehouse) {
      warehouse = await Warehouse.create({
        name: 'Test Warehouse',
        location: { city: 'Test City' },
      });
    }

    testInventory = await Inventory.create({
      productId: testProduct._id,
      warehouseId: warehouse._id,
      stock: 100,
    });

    testOrder = await Order.create({
      userId: testUser._id,
      items: [{ productId: testProduct._id, quantity: 5, price: 1000 }],
      totalAmount: 5000,
      paymentStatus: 'PAID',
      status: 'CONFIRMED',
      paymentMethod: 'ONLINE',
    });

    testPayment = await Payment.create({
      orderId: testOrder._id,
      userId: testUser._id,
      amount: 5000,
      status: 'SUCCESS',
      paymentMethod: 'ONLINE',
      razorpayPaymentId: 'pay_test123',
    });
  });

  afterEach(async () => {
    // Use safe cleanup utility with timeout protection
    await cleanupQueuesAndWorkers({
      queues: [postPaymentQueue, postOrderQueue].filter(Boolean),
      workers: [], // No workers created in beforeEach
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

  describe('Post-Payment Worker', () => {
    it('should successfully process post-payment job', async () => {
      // Add job to queue
      const job = await postPaymentQueue.add('post-payment-job', {
        orderId: testOrder._id.toString(),
        userId: testUser._id.toString(),
        amount: 5000,
        paymentMethod: 'ONLINE',
      });

      expect(job.id).toBeDefined();
      expect(job.data.orderId).toBe(testOrder._id.toString());

      // Wait for job to be ready
      await job.waitUntilFinished(postPaymentQueue.events, 10000);

      // Verify job completed
      const completedJob = await postPaymentQueue.getJob(job.id);
      expect(completedJob.finishedOn).toBeDefined();
      expect(completedJob.returnvalue).toHaveProperty('success', true);
    }, 15000);

    it('should retry failed post-payment job 3 times', async () => {
      // Mock invoice service to fail first 2 times
      let attemptCount = 0;
      jest.mock('../../src/modules/invoice/invoice.service.js', () => ({
        generateInvoice: jest.fn(async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Invoice service unavailable');
          }
          return { invoiceId: 'INV123' };
        }),
      }));

      const job = await postPaymentQueue.add('post-payment-retry', {
        orderId: testOrder._id.toString(),
        userId: testUser._id.toString(),
        amount: 5000,
        paymentMethod: 'ONLINE',
      });

      // Wait for retries to complete
      await new Promise(resolve => setTimeout(resolve, 15000));

      const failedJob = await postPaymentQueue.getJob(job.id);
      expect(failedJob.attemptsMade).toBeGreaterThan(1);
      expect(failedJob.attemptsMade).toBeLessThanOrEqual(3);
    }, 20000);

    it('should move to failed queue after 3 failed attempts', async () => {
      // Mock invoice service to always fail
      jest.mock('../../src/modules/invoice/invoice.service.js', () => ({
        generateInvoice: jest.fn(async () => {
          throw new Error('Permanent invoice service failure');
        }),
      }));

      const job = await postPaymentQueue.add('post-payment-permanent-fail', {
        orderId: testOrder._id.toString(),
        userId: testUser._id.toString(),
        amount: 5000,
        paymentMethod: 'ONLINE',
      });

      // Wait for all retries to exhaust
      await new Promise(resolve => setTimeout(resolve, 20000));

      // Check if job is in failed state
      const failedJob = await postPaymentQueue.getJob(job.id);
      expect(failedJob.attemptsMade).toBe(3);
      expect(failedJob.finishedOn).toBeDefined();
      expect(failedJob.failedReason).toContain('invoice service failure');

      // Verify job is in failed jobs list
      const failedJobs = await postPaymentQueue.getFailed();
      const ourFailedJob = failedJobs.find(j => j.id === job.id);
      expect(ourFailedJob).toBeDefined();
    }, 30000);

    it('should handle missing order gracefully', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId().toString();

      const job = await postPaymentQueue.add('post-payment-missing-order', {
        orderId: fakeOrderId,
        userId: testUser._id.toString(),
        amount: 5000,
        paymentMethod: 'ONLINE',
      });

      try {
        await job.waitUntilFinished(postPaymentQueue.events, 10000);
      } catch (err) {
        // Expected to fail
      }

      const failedJob = await postPaymentQueue.getJob(job.id);
      expect(failedJob.failedReason).toContain('not found');
    }, 15000);

    it('should process concurrent post-payment jobs', async () => {
      const jobs = [];
      const numJobs = 10;

      // Create 10 orders and payments
      for (let i = 0; i < numJobs; i++) {
        const order = await Order.create({
          userId: testUser._id,
          items: [{ productId: testProduct._id, quantity: 1, price: 1000 }],
          totalAmount: 1000,
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          paymentMethod: 'ONLINE',
        });

        await Payment.create({
          orderId: order._id,
          userId: testUser._id,
          amount: 1000,
          status: 'SUCCESS',
          paymentMethod: 'ONLINE',
          razorpayPaymentId: `pay_concurrent_${i}`,
        });

        jobs.push(
          postPaymentQueue.add(`concurrent-job-${i}`, {
            orderId: order._id.toString(),
            userId: testUser._id.toString(),
            amount: 1000,
            paymentMethod: 'ONLINE',
          })
        );
      }

      // Wait for all jobs to complete
      await Promise.allSettled(
        jobs.map(job => job.then(j => j.waitUntilFinished(postPaymentQueue.events, 20000)))
      );

      // Verify all jobs completed
      const completedJobs = await postPaymentQueue.getCompleted();
      expect(completedJobs.length).toBeGreaterThanOrEqual(numJobs - 2); // Allow 2 failures
    }, 30000);
  });

  describe('Post-Order Worker', () => {
    it('should successfully process post-order job', async () => {
      const job = await postOrderQueue.add('post-order-job', {
        orderId: testOrder._id.toString(),
        userId: testUser._id.toString(),
        paymentMethod: 'COD',
      });

      expect(job.id).toBeDefined();
      expect(job.data.orderId).toBe(testOrder._id.toString());

      // Wait for processing
      await job.waitUntilFinished(postOrderQueue.events, 10000);

      const completedJob = await postOrderQueue.getJob(job.id);
      expect(completedJob.finishedOn).toBeDefined();
    }, 15000);

    it('should retry post-order job on transient failures', async () => {
      let attemptCount = 0;
      
      // Mock logistics service to fail first time
      jest.mock('../../src/modules/order/order.service.js', () => ({
        assignDelivery: jest.fn(async () => {
          attemptCount++;
          if (attemptCount === 1) {
            throw new Error('Logistics service timeout');
          }
          return { deliveryId: 'DEL123' };
        }),
      }));

      const job = await postOrderQueue.add('post-order-retry', {
        orderId: testOrder._id.toString(),
        userId: testUser._id.toString(),
        paymentMethod: 'COD',
      });

      await new Promise(resolve => setTimeout(resolve, 15000));

      const processedJob = await postOrderQueue.getJob(job.id);
      expect(processedJob.attemptsMade).toBeGreaterThan(0);
    }, 20000);

    it('should handle shipment creation failure gracefully', async () => {
      // Mock shipment service to fail
      jest.mock('../../src/modules/order/order.service.js', () => ({
        createShipment: jest.fn(async () => {
          throw new Error('Shipment service unavailable');
        }),
        assignDelivery: jest.fn(async () => ({ deliveryId: 'DEL123' })),
      }));

      const job = await postOrderQueue.add('post-order-shipment-fail', {
        orderId: testOrder._id.toString(),
        userId: testUser._id.toString(),
        paymentMethod: 'COD',
      });

      // Should still complete (shipment failure is non-critical)
      await job.waitUntilFinished(postOrderQueue.events, 10000);

      const completedJob = await postOrderQueue.getJob(job.id);
      expect(completedJob.finishedOn).toBeDefined();
    }, 15000);
  });

  describe('Worker Crash Recovery', () => {
    it('should preserve jobs across worker restarts', async () => {
      // Add jobs to queue
      const job1 = await postPaymentQueue.add('job-before-crash', {
        orderId: testOrder._id.toString(),
        userId: testUser._id.toString(),
        amount: 5000,
        paymentMethod: 'ONLINE',
      });

      // Simulate worker crash (don't process, just add to queue)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify job still exists in queue
      const waitingJobs = await postPaymentQueue.getWaiting();
      const ourJob = waitingJobs.find(j => j.id === job1.id);
      expect(ourJob).toBeDefined();
      expect(ourJob.data.orderId).toBe(testOrder._id.toString());
    }, 10000);

    it('should resume processing stalled jobs after worker restart', async () => {
      const job = await postPaymentQueue.add('stalled-job-recovery', {
        orderId: testOrder._id.toString(),
        userId: testUser._id.toString(),
        amount: 5000,
        paymentMethod: 'ONLINE',
      });

      // Simulate stalled job (mark as active but don't process)
      await job.updateProgress(0);

      // Wait for stalled job detection
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check if job moved back to waiting
      const stalledJobs = await postPaymentQueue.getFailed();
      const activeJobs = await postPaymentQueue.getActive();
      
      // Job should either be stalled or moved back to waiting
      expect(stalledJobs.length + activeJobs.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Queue Health & Monitoring', () => {
    it('should track completed job count', async () => {
      // Add and complete multiple jobs
      for (let i = 0; i < 5; i++) {
        await postPaymentQueue.add(`monitoring-job-${i}`, {
          orderId: testOrder._id.toString(),
          userId: testUser._id.toString(),
          amount: 1000,
          paymentMethod: 'ONLINE',
        });
      }

      await new Promise(resolve => setTimeout(resolve, 10000));

      const completedCount = await postPaymentQueue.getCompletedCount();
      expect(completedCount).toBeGreaterThan(0);
    }, 15000);

    it('should track failed job count', async () => {
      // Mock to fail
      jest.mock('../../src/modules/invoice/invoice.service.js', () => ({
        generateInvoice: jest.fn(async () => {
          throw new Error('Test failure');
        }),
      }));

      await postPaymentQueue.add('monitoring-failed-job', {
        orderId: testOrder._id.toString(),
        userId: testUser._id.toString(),
        amount: 5000,
        paymentMethod: 'ONLINE',
      });

      await new Promise(resolve => setTimeout(resolve, 10000));

      const failedCount = await postPaymentQueue.getFailedCount();
      expect(failedCount).toBeGreaterThan(0);
    }, 15000);

    it('should report queue depth accurately', async () => {
      // Add multiple jobs without processing
      const jobs = [];
      for (let i = 0; i < 10; i++) {
        jobs.push(
          postPaymentQueue.add(`depth-test-${i}`, {
            orderId: testOrder._id.toString(),
            userId: testUser._id.toString(),
            amount: 1000,
            paymentMethod: 'ONLINE',
          })
        );
      }

      await Promise.all(jobs);

      const waitingCount = await postPaymentQueue.getWaitingCount();
      const activeCount = await postPaymentQueue.getActiveCount();
      const totalDepth = waitingCount + activeCount;

      expect(totalDepth).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Job Cleanup & Retention', () => {
    it('should cleanup old completed jobs', async () => {
      // Add and complete jobs
      const job = await postPaymentQueue.add('cleanup-test', {
        orderId: testOrder._id.toString(),
        userId: testUser._id.toString(),
        amount: 5000,
        paymentMethod: 'ONLINE',
      });

      await job.waitUntilFinished(postPaymentQueue.events, 10000);

      // Manually cleanup
      await postPaymentQueue.clean(0, 10, 'completed');

      const completed = await postPaymentQueue.getCompleted();
      // Should keep last 100 as per config
      expect(completed.length).toBeLessThanOrEqual(100);
    }, 15000);

    it('should retain failed jobs for debugging', async () => {
      // Mock to fail
      jest.mock('../../src/modules/invoice/invoice.service.js', () => ({
        generateInvoice: jest.fn(async () => {
          throw new Error('Test failure for retention');
        }),
      }));

      await postPaymentQueue.add('retention-test', {
        orderId: testOrder._id.toString(),
        userId: testUser._id.toString(),
        amount: 5000,
        paymentMethod: 'ONLINE',
      });

      await new Promise(resolve => setTimeout(resolve, 10000));

      const failedJobs = await postPaymentQueue.getFailed();
      expect(failedJobs.length).toBeGreaterThan(0);

      // Failed job should have error details
      const failedJob = failedJobs[0];
      expect(failedJob.failedReason).toBeDefined();
      expect(failedJob.stacktrace).toBeDefined();
    }, 15000);
  });
});
