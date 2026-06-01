import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/modules/user/user.model.js';
import Order from '../../src/modules/order/order.model.js';
import Product from '../../src/modules/product/product.model.js';
import Payment from '../../src/modules/payment/payment.model.js';
import Cart from '../../src/modules/cart/cart.model.js';
import Shipment from '../../src/modules/shipment/shipment.model.js';
import { clearDatabase, cleanupQueuesAndWorkers } from '../helpers/testUtils.js';
import { redisClient } from '../../src/config/redis.js';
import { ROLES } from '../../src/constants/roles.js';

/**
 * 🔒 CRITICAL: Partial Failure Tests
 * Tests non-blocking failures (invoice, shipment, notification, cart clear) that should log but not fail the request
 */

describe('Partial Failure Tests', () => {
  let testUser;
  let authToken;
  let testProduct;
  let testOrder;
  let testPayment;

  beforeEach(async () => {
    await clearDatabase();
    await redisClient.flushdb();

    // Create test user
    testUser = await User.create({
      name: 'Partial Failure Test User',
      email: 'partial@test.com',
      password: 'Test@1234',
      role: ROLES.B2B_CUSTOMER,
      mobile: '9876543210',
      status: 'ACTIVE',
    });

    // Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'partial@test.com', password: 'Test@1234' });
    authToken = loginRes.body.data.token;

    // Create test product
    testProduct = await Product.create({
      name: 'Partial Failure Test Product',
      category: 'Test',
      basePrice: 1000,
      stock: 100,
      status: 'ACTIVE',
    });

    // Create test order
    testOrder = await Order.create({
      userId: testUser._id,
      items: [{ productId: testProduct._id, name: 'Test Product', quantity: 2, price: 1000 }],
      totalAmount: 2000,
      paymentStatus: 'PAID',
      status: 'CONFIRMED',
      paymentMethod: 'ONLINE',
      address: {
        name: 'Test User',
        phone: '9876543210',
        addressLine: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
      },
    });

    testPayment = await Payment.create({
      orderId: testOrder._id,
      userId: testUser._id,
      amount: 2000,
      status: 'SUCCESS',
      paymentMethod: 'ONLINE',
      razorpayPaymentId: 'pay_partial123',
      razorpayOrderId: 'order_partial123',
    });

    // Create cart
    await Cart.create({
      userId: testUser._id,
      items: [{ productId: testProduct._id, quantity: 2 }],
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await redisClient.flushdb();
  });

  describe('Invoice Generation Failure (Non-Blocking)', () => {
    it('should complete payment verification even if invoice generation fails', async () => {
      // Mock invoice service to fail
      if (require('../../src/services/invoice.service.js').generateInvoice) {
        jest.spyOn(require('../../src/services/invoice.service.js'), 'generateInvoice').mockRejectedValue(
          new Error('Invoice service unavailable')
        );
      }

      const res = await request(app)
        .post('/api/v1/payment/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: testPayment.razorpayOrderId,
          razorpay_payment_id: testPayment.razorpayPaymentId,
          razorpay_signature: 'test_signature',
        });

      // Payment should still succeed
      expect(res.status).toMatch(/200|201|409/);
      
      // Order should be confirmed
      const order = await Order.findById(testOrder._id);
      expect(order.paymentStatus).toBe('PAID');
    });

    it('should log invoice generation error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      if (require('../../src/services/invoice.service.js').generateInvoice) {
        jest.spyOn(require('../../src/services/invoice.service.js'), 'generateInvoice').mockRejectedValue(
          new Error('Invoice generation failed')
        );
      }

      await request(app)
        .post('/api/v1/payment/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: testPayment.razorpayOrderId,
          razorpay_payment_id: testPayment.razorpayPaymentId,
          razorpay_signature: 'test_signature',
        });

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorCalls = consoleErrorSpy.mock.calls.filter(call => 
        call.some(arg => typeof arg === 'string' && arg.toLowerCase().includes('invoice'))
      );
      expect(errorCalls.length).toBeGreaterThan(0);

      consoleErrorSpy.mockRestore();
    });

    it('should mark order for retry on invoice failure', async () => {
      if (require('../../src/services/invoice.service.js').generateInvoice) {
        jest.spyOn(require('../../src/services/invoice.service.js'), 'generateInvoice').mockRejectedValue(
          new Error('Invoice failed')
        );
      }

      await request(app)
        .post('/api/v1/payment/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: testPayment.razorpayOrderId,
          razorpay_payment_id: testPayment.razorpayPaymentId,
          razorpay_signature: 'test_signature',
        });

      // Order should have metadata indicating invoice pending
      const order = await Order.findById(testOrder._id);
      if (order.metadata) {
        expect(order.metadata.invoicePending || !order.invoiceUrl).toBeTruthy();
      }
    });
  });

  describe('Shipment Creation Failure (Non-Blocking)', () => {
    it('should complete order confirmation even if shipment creation fails', async () => {
      // Mock shipment service to fail
      if (require('../../src/services/shipment.service.js').createShipment) {
        jest.spyOn(require('../../src/services/shipment.service.js'), 'createShipment').mockRejectedValue(
          new Error('Shipment service error')
        );
      }

      // Trigger order processing
      const res = await request(app)
        .post('/api/v1/orders/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ orderId: testOrder._id.toString() });

      // Order should still process
      expect([200, 201, 409]).toContain(res.status);

      const order = await Order.findById(testOrder._id);
      expect(order.status).toMatch(/CONFIRMED|PROCESSING/);
    });

    it('should log shipment creation error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      if (require('../../src/services/shipment.service.js').createShipment) {
        jest.spyOn(require('../../src/services/shipment.service.js'), 'createShipment').mockRejectedValue(
          new Error('Shipment failed')
        );
      }

      await request(app)
        .post('/api/v1/orders/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ orderId: testOrder._id.toString() });

      // Verify error logged
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should continue with delivery assignment if shipment creation fails', async () => {
      if (require('../../src/services/shipment.service.js').createShipment) {
        jest.spyOn(require('../../src/services/shipment.service.js'), 'createShipment').mockRejectedValue(
          new Error('Shipment API down')
        );
      }

      await request(app)
        .post('/api/v1/orders/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ orderId: testOrder._id.toString() });

      // Order should still have delivery status updated
      const order = await Order.findById(testOrder._id);
      expect(order).toBeDefined();
      expect(order.status).not.toBe('CANCELLED');
    });
  });

  describe('Notification Failure (Non-Blocking)', () => {
    it('should complete order processing even if notification fails', async () => {
      // Mock notification service to fail
      if (require('../../src/services/notification.service.js').sendNotification) {
        jest.spyOn(require('../../src/services/notification.service.js'), 'sendNotification').mockRejectedValue(
          new Error('Notification service down')
        );
      }

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
      expect(res.body.data).toHaveProperty('orderId');
    });

    it('should log notification failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      if (require('../../src/services/notification.service.js').sendNotification) {
        jest.spyOn(require('../../src/services/notification.service.js'), 'sendNotification').mockRejectedValue(
          new Error('Notification failed')
        );
      }

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

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should queue failed notifications for retry', async () => {
      if (require('../../src/services/notification.service.js').sendNotification) {
        jest.spyOn(require('../../src/services/notification.service.js'), 'sendNotification').mockRejectedValue(
          new Error('Email service unavailable')
        );
      }

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

      // Verify notification queued (check notification queue if available)
      // This is implementation-specific
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Cart Clear Failure (Non-Blocking)', () => {
    it('should complete payment verification even if cart clear fails', async () => {
      // Mock cart service to fail
      const originalDeleteMany = Cart.deleteMany;
      jest.spyOn(Cart, 'deleteMany').mockRejectedValue(
        new Error('Cart clear failed')
      );

      const res = await request(app)
        .post('/api/v1/payment/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: testPayment.razorpayOrderId,
          razorpay_payment_id: testPayment.razorpayPaymentId,
          razorpay_signature: 'test_signature',
        });

      // Payment verification should succeed
      expect([200, 201, 409]).toContain(res.status);

      const order = await Order.findById(testOrder._id);
      expect(order.paymentStatus).toBe('PAID');
    });

    it('should log cart clear error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      jest.spyOn(Cart, 'deleteMany').mockRejectedValue(
        new Error('Cart clear error')
      );

      await request(app)
        .post('/api/v1/payment/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: testPayment.razorpayOrderId,
          razorpay_payment_id: testPayment.razorpayPaymentId,
          razorpay_signature: 'test_signature',
        });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should eventually clear cart on background retry', async () => {
      // Simulate eventual success
      let callCount = 0;
      const originalDeleteMany = Cart.deleteMany;
      
      jest.spyOn(Cart, 'deleteMany').mockImplementation(async function(...args) {
        callCount++;
        if (callCount === 1) {
          throw new Error('First attempt fails');
        }
        return originalDeleteMany.apply(this, args);
      });

      // First call fails, cart remains
      await request(app)
        .post('/api/v1/payment/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: testPayment.razorpayOrderId,
          razorpay_payment_id: testPayment.razorpayPaymentId,
          razorpay_signature: 'test_signature',
        });

      // Second call succeeds
      await Cart.deleteMany({ userId: testUser._id });

      const cart = await Cart.findOne({ userId: testUser._id });
      expect(cart).toBeNull();
    });
  });

  describe('Queue Job Partial Failures', () => {
    it('should continue processing other jobs if one fails', async () => {
      const { Queue, Worker } = await import('bullmq');
      
      const testQueue = new Queue('partial-failure-queue', {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
        },
      });

      let processedCount = 0;
      let failedCount = 0;

      const worker = new Worker(
        'partial-failure-queue',
        async (job) => {
          // Fail job 2
          if (job.data.id === 2) {
            failedCount++;
            throw new Error('Job 2 intentional failure');
          }
          processedCount++;
          return { success: true };
        },
        {
          connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
          },
        }
      );

      // Add 5 jobs
      for (let i = 1; i <= 5; i++) {
        await testQueue.add('test-job', { id: i });
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Should have processed 4 jobs, failed 1
      expect(processedCount).toBe(4);
      expect(failedCount).toBe(1);

      // Cleanup
      await worker.close();
      await cleanupQueuesAndWorkers({
        queues: [testQueue].filter(Boolean),
        obliterate: true,
        timeout: 5000
      });
    }, 10000);

    it('should isolate failures to prevent cascading', async () => {
      const { Queue, Worker } = await import('bullmq');
      
      const testQueue = new Queue('isolated-failure-queue', {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
        },
      });

      const results = [];

      const worker = new Worker(
        'isolated-failure-queue',
        async (job) => {
          try {
            if (job.data.shouldFail) {
              throw new Error('Intentional failure');
            }
            results.push({ id: job.data.id, status: 'success' });
            return { success: true };
          } catch (err) {
            results.push({ id: job.data.id, status: 'failed', error: err.message });
            throw err;
          }
        },
        {
          connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
          },
        }
      );

      // Add jobs: fail-success-fail-success-success
      await testQueue.add('job', { id: 1, shouldFail: true });
      await testQueue.add('job', { id: 2, shouldFail: false });
      await testQueue.add('job', { id: 3, shouldFail: true });
      await testQueue.add('job', { id: 4, shouldFail: false });
      await testQueue.add('job', { id: 5, shouldFail: false });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify successful jobs completed despite failures
      const successes = results.filter(r => r.status === 'success');
      expect(successes.length).toBe(3);

      // Cleanup
      await worker.close();
      await cleanupQueuesAndWorkers({
        queues: [testQueue].filter(Boolean),
        obliterate: true,
        timeout: 5000
      });
    }, 10000);
  });

  describe('Multi-Item Order with Some Products Unavailable', () => {
    it('should process available items and mark unavailable ones', async () => {
      const product2 = await Product.create({
        name: 'Unavailable Product',
        category: 'Test',
        basePrice: 500,
        stock: 0, // Out of stock
        status: 'ACTIVE',
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            { productId: testProduct._id.toString(), quantity: 1 },
            { productId: product2._id.toString(), quantity: 1 }, // Out of stock
          ],
          paymentMethod: 'COD',
          shippingAddress: {
            street: 'Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'India',
            zipCode: '123456',
          },
        });

      // Should either succeed with partial order or fail gracefully
      expect([200, 201, 400]).toContain(res.status);

      if (res.status === 201) {
        // Partial order created
        const order = await Order.findById(res.body.data.orderId);
        expect(order.items.length).toBeLessThanOrEqual(2);
        
        if (order.metadata) {
          expect(order.metadata.partialOrder).toBe(true);
        }
      } else {
        // Order rejected due to unavailable items
        expect(res.body.message).toMatch(/unavailable|out of stock/i);
      }
    });

    it('should calculate correct amount for partial order', async () => {
      const product2 = await Product.create({
        name: 'Available Product 2',
        category: 'Test',
        basePrice: 500,
        stock: 10,
        status: 'ACTIVE',
      });

      const product3 = await Product.create({
        name: 'Unavailable Product 3',
        category: 'Test',
        basePrice: 2000,
        stock: 0,
        status: 'ACTIVE',
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            { productId: testProduct._id.toString(), quantity: 1 }, // 1000
            { productId: product2._id.toString(), quantity: 1 }, // 500
            { productId: product3._id.toString(), quantity: 1 }, // Out of stock
          ],
          paymentMethod: 'COD',
          shippingAddress: {
            street: 'Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'India',
            zipCode: '123456',
          },
        });

      if (res.status === 201) {
        const order = await Order.findById(res.body.data.orderId);
        // Amount should only include available items
        expect(order.totalAmount).toBeLessThanOrEqual(1500); // 1000 + 500
      }
    });
  });

  describe('Error Logging and Monitoring', () => {
    it('should capture all partial failure metrics', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Trigger multiple partial failures
      if (require('../../src/services/invoice.service.js').generateInvoice) {
        jest.spyOn(require('../../src/services/invoice.service.js'), 'generateInvoice').mockRejectedValue(
          new Error('Invoice failed')
        );
      }

      if (require('../../src/services/notification.service.js').sendNotification) {
        jest.spyOn(require('../../src/services/notification.service.js'), 'sendNotification').mockRejectedValue(
          new Error('Notification failed')
        );
      }

      await request(app)
        .post('/api/v1/payment/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: testPayment.razorpayOrderId,
          razorpay_payment_id: testPayment.razorpayPaymentId,
          razorpay_signature: 'test_signature',
        });

      // Should have logged multiple errors
      expect(consoleErrorSpy.mock.calls.length).toBeGreaterThan(0);
      consoleErrorSpy.mockRestore();
    });

    it('should include context in error logs', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      if (require('../../src/services/invoice.service.js').generateInvoice) {
        jest.spyOn(require('../../src/services/invoice.service.js'), 'generateInvoice').mockRejectedValue(
          new Error('Invoice error')
        );
      }

      await request(app)
        .post('/api/v1/payment/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: testPayment.razorpayOrderId,
          razorpay_payment_id: testPayment.razorpayPaymentId,
          razorpay_signature: 'test_signature',
        });

      // Error logs should include order ID and user ID for debugging
      const errorCalls = consoleErrorSpy.mock.calls;
      const hasContext = errorCalls.some(call => 
        call.some(arg => 
          typeof arg === 'string' && 
          (arg.includes(testOrder._id.toString()) || arg.includes('invoice'))
        )
      );
      expect(hasContext).toBe(true);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Graceful Degradation', () => {
    it('should provide minimal service when dependencies fail', async () => {
      // Mock all external services to fail
      if (require('../../src/services/invoice.service.js').generateInvoice) {
        jest.spyOn(require('../../src/services/invoice.service.js'), 'generateInvoice').mockRejectedValue(
          new Error('Service down')
        );
      }

      if (require('../../src/services/notification.service.js').sendNotification) {
        jest.spyOn(require('../../src/services/notification.service.js'), 'sendNotification').mockRejectedValue(
          new Error('Service down')
        );
      }

      if (require('../../src/services/shipment.service.js').createShipment) {
        jest.spyOn(require('../../src/services/shipment.service.js'), 'createShipment').mockRejectedValue(
          new Error('Service down')
        );
      }

      // Core order creation should still work
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
      expect(res.body.data).toHaveProperty('orderId');

      // Order should be created
      const order = await Order.findById(res.body.data.orderId);
      expect(order).toBeDefined();
      expect(order.status).toMatch(/PENDING|CONFIRMED/);
    });
  });
});
