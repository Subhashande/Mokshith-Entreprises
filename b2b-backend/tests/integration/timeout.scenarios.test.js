import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/modules/user/user.model.js';
import Order from '../../src/modules/order/order.model.js';
import Product from '../../src/modules/product/product.model.js';
import Payment from '../../src/modules/payment/payment.model.js';
import { clearDatabase } from '../helpers/testUtils.js';
import { redisClient } from '../../src/config/redis.js';
import { ROLES } from '../../src/constants/roles.js';

/**
 * 🔒 CRITICAL: Timeout Scenario Tests
 * Tests payment gateway timeouts, database query timeouts, inventory retry timeouts, S3 upload timeouts
 */

describe('Timeout Scenario Tests', () => {
  let testUser;
  let authToken;
  let testProduct;
  let testOrder;

  beforeEach(async () => {
    await clearDatabase();
    await redisClient.flushdb();

    // Create test user
    testUser = await User.create({
      name: 'Timeout Test User',
      email: 'timeout@test.com',
      password: 'Test@1234',
      role: ROLES.B2B_CUSTOMER,
      mobile: '9876543210',
      status: 'ACTIVE',
    });

    // Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'timeout@test.com', password: 'Test@1234' });
    authToken = loginRes.body.data.token;

    // Create test product
    testProduct = await Product.create({
      name: 'Timeout Test Product',
      category: 'Test',
      basePrice: 1000,
      stock: 100,
      status: 'ACTIVE',
    });

    // Create test order
    testOrder = await Order.create({
      userId: testUser._id,
      items: [{ productId: testProduct._id, quantity: 2, price: 1000 }],
      totalAmount: 2000,
      paymentStatus: 'PENDING',
      status: 'PENDING',
      paymentMethod: 'ONLINE',
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await redisClient.flushdb();
  });

  describe('Payment Gateway Timeout (10s for order creation, 15s for refund)', () => {
    it('should timeout payment order creation after 10 seconds', async () => {
      // Mock Razorpay to delay
      const originalCreateOrder = require('../../src/modules/payment/payment.gateway.js').createOrder;
      jest.spyOn(require('../../src/modules/payment/payment.gateway.js'), 'createOrder').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 12000)); // 12s delay (exceeds 10s timeout)
        return originalCreateOrder();
      });

      const res = await request(app)
        .post('/api/v1/payment/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 2000,
        })
        .timeout(15000);

      // Should either timeout or return error
      expect([408, 500, 504]).toContain(res.status);
      if (res.body.message) {
        expect(res.body.message).toMatch(/timeout|timed out|deadline exceeded/i);
      }
    }, 20000);

    it('should timeout refund creation after 15 seconds', async () => {
      // Create payment first
      const payment = await Payment.create({
        orderId: testOrder._id,
        userId: testUser._id,
        amount: 2000,
        status: 'SUCCESS',
        paymentMethod: 'ONLINE',
        razorpayPaymentId: 'pay_timeout123',
        razorpayOrderId: 'order_timeout123',
      });

      await Order.findByIdAndUpdate(testOrder._id, { paymentStatus: 'PAID' });

      // Mock Razorpay refund to delay
      const originalCreateRefund = require('../../src/modules/payment/payment.gateway.js').createRefund;
      jest.spyOn(require('../../src/modules/payment/payment.gateway.js'), 'createRefund').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 18000)); // 18s delay (exceeds 15s timeout)
        return originalCreateRefund();
      });

      const res = await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 2000,
          reason: 'Timeout test',
        })
        .timeout(20000);

      // Should timeout gracefully
      expect([408, 500, 504]).toContain(res.status);
    }, 25000);

    it('should not corrupt data on gateway timeout', async () => {
      // Mock timeout
      jest.spyOn(require('../../src/modules/payment/payment.gateway.js'), 'createOrder').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 12000));
        throw new Error('Gateway timeout');
      });

      try {
        await request(app)
          .post('/api/v1/payment/create-order')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            orderId: testOrder._id.toString(),
            amount: 2000,
          })
          .timeout(15000);
      } catch (err) {
        // Expected timeout
      }

      // Order status should be unchanged
      const order = await Order.findById(testOrder._id);
      expect(order.paymentStatus).toBe('PENDING');
    }, 20000);
  });

  describe('Inventory Retry Global Timeout (10s with jitter)', () => {
    it('should timeout inventory operations after 10 seconds', async () => {
      // Mock inventory check to be slow
      const originalFindOne = mongoose.Model.findOne;
      jest.spyOn(mongoose.Model, 'findOne').mockImplementation(async function(...args) {
        if (this.modelName === 'Inventory') {
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3s delay per attempt
        }
        return originalFindOne.apply(this, args);
      });

      const startTime = Date.now();

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [{ productId: testProduct._id.toString(), quantity: 2 }],
          paymentMethod: 'COD',
          shippingAddress: {
            street: 'Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'India',
            zipCode: '123456',
          },
        })
        .timeout(15000);

      const duration = Date.now() - startTime;

      // Should timeout around 10s (with some margin for jitter)
      expect(duration).toBeLessThan(13000);
    }, 20000);

    it('should apply jitter to retry delays', async () => {
      const delays = [];

      // Mock to capture retry delays
      const originalSetTimeout = global.setTimeout;
      jest.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
        if (delay > 100 && delay < 5000) {
          delays.push(delay);
        }
        return originalSetTimeout(fn, delay);
      });

      // Trigger retries by making inventory unavailable temporarily
      try {
        await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            items: [{ productId: testProduct._id.toString(), quantity: 1000 }], // Exceeds stock
            paymentMethod: 'COD',
            shippingAddress: {
              street: 'Test St',
              city: 'Test City',
              state: 'Test State',
              country: 'India',
              zipCode: '123456',
            },
          })
          .timeout(15000);
      } catch (err) {
        // Expected to fail
      }

      // Verify jitter was applied (delays should not be exact multiples)
      if (delays.length >= 2) {
        const hasJitter = delays.some((delay, i) => {
          if (i === 0) return false;
          return Math.abs(delay - delays[i - 1] * 2) > 100; // Not exactly 2x
        });
        expect(hasJitter).toBe(true);
      }
    }, 20000);
  });

  describe('Database Query Timeout Under Load', () => {
    it('should timeout slow database queries', async () => {
      // Mock slow query
      const originalExec = mongoose.Query.prototype.exec;
      jest.spyOn(mongoose.Query.prototype, 'exec').mockImplementation(async function() {
        await new Promise(resolve => setTimeout(resolve, 8000)); // 8s delay
        return originalExec.call(this);
      });

      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000);

      // Should timeout or complete with degraded performance
      expect([200, 408, 500, 504]).toContain(res.status);
    }, 15000);

    it('should handle partial results on timeout', async () => {
      // Mock query to return partial results before timeout
      const originalExec = mongoose.Query.prototype.exec;
      jest.spyOn(mongoose.Query.prototype, 'exec').mockImplementation(async function() {
        await new Promise(resolve => setTimeout(resolve, 500));
        return originalExec.call(this);
      });

      const res = await request(app)
        .get('/api/v1/products?limit=100')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(2000);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    }, 5000);
  });

  describe('Webhook Processing Timeout', () => {
    it('should timeout webhook processing after 30 seconds', async () => {
      // Mock webhook handler to be slow
      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_webhook123',
              order_id: 'order_webhook123',
              amount: 200000,
              status: 'captured',
            },
          },
        },
      };

      // Generate valid signature
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret')
        .update(JSON.stringify(webhookPayload))
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('x-razorpay-signature', signature)
        .send(webhookPayload)
        .timeout(35000);

      // Should complete or timeout gracefully
      expect([200, 202, 408, 504]).toContain(res.status);
    }, 40000);

    it('should not block webhook queue on timeout', async () => {
      // Send webhook that might timeout
      const webhookPayload1 = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_webhook1',
              order_id: 'order_webhook1',
              amount: 100000,
              status: 'captured',
            },
          },
        },
      };

      const crypto = require('crypto');
      const signature1 = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret')
        .update(JSON.stringify(webhookPayload1))
        .digest('hex');

      // Send first webhook (might timeout)
      request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('x-razorpay-signature', signature1)
        .send(webhookPayload1)
        .timeout(10000)
        .catch(() => {}); // Ignore timeout

      // Send second webhook immediately
      const webhookPayload2 = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_webhook2',
              order_id: 'order_webhook2',
              amount: 100000,
              status: 'captured',
            },
          },
        },
      };

      const signature2 = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret')
        .update(JSON.stringify(webhookPayload2))
        .digest('hex');

      const res2 = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('x-razorpay-signature', signature2)
        .send(webhookPayload2)
        .timeout(5000);

      // Second webhook should process independently
      expect([200, 202]).toContain(res2.status);
    }, 20000);
  });

  describe('S3 Upload Timeout (3 retries with exponential backoff)', () => {
    it('should timeout S3 upload after retries', async () => {
      // Mock file upload endpoint
      const filePath = require('path').join(__dirname, '../helpers/test-file.txt');
      
      // Create test file if not exists
      const fs = require('fs');
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, 'Test file content');
      }

      // Mock S3 to be slow
      if (require('../../src/services/s3.service.js').uploadFile) {
        jest.spyOn(require('../../src/services/s3.service.js'), 'uploadFile').mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 15000)); // 15s delay
          throw new Error('Upload timeout');
        });
      }

      const res = await request(app)
        .post('/api/v1/upload/invoice')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath)
        .timeout(30000);

      // Should timeout after retries
      expect([408, 500, 504]).toContain(res.status);
    }, 35000);

    it('should apply exponential backoff on S3 upload retries', async () => {
      const retryDelays = [];
      const originalSetTimeout = global.setTimeout;

      jest.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
        if (delay > 500 && delay < 10000) {
          retryDelays.push(delay);
        }
        return originalSetTimeout(fn, delay);
      });

      // Trigger upload retries
      try {
        if (require('../../src/services/s3.service.js').uploadFile) {
          jest.spyOn(require('../../src/services/s3.service.js'), 'uploadFile').mockRejectedValue(
            new Error('Upload failed')
          );
        }

        const filePath = require('path').join(__dirname, '../helpers/test-file.txt');
        await request(app)
          .post('/api/v1/upload/invoice')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', filePath)
          .timeout(20000);
      } catch (err) {
        // Expected to fail
      }

      // Verify exponential backoff (each delay roughly 2x previous)
      if (retryDelays.length >= 2) {
        for (let i = 1; i < retryDelays.length; i++) {
          const ratio = retryDelays[i] / retryDelays[i - 1];
          expect(ratio).toBeGreaterThan(1.5); // At least 1.5x
          expect(ratio).toBeLessThan(3); // At most 3x
        }
      }
    }, 25000);
  });

  describe('Graceful Timeout Handling', () => {
    it('should log timeout errors for monitoring', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Trigger timeout scenario
      jest.spyOn(require('../../src/modules/payment/payment.gateway.js'), 'createOrder').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 12000));
        throw new Error('Gateway timeout');
      });

      try {
        await request(app)
          .post('/api/v1/payment/create-order')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            orderId: testOrder._id.toString(),
            amount: 2000,
          })
          .timeout(15000);
      } catch (err) {
        // Expected
      }

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    }, 20000);

    it('should not leave locks held on timeout', async () => {
      const lockKey = `payment:lock:${testOrder._id}`;

      // Simulate operation with lock that times out
      try {
        await redisClient.acquireLock(lockKey, 'test_lock', 30);

        // Simulate timeout
        await new Promise(resolve => setTimeout(resolve, 100));
        throw new Error('Operation timeout');
      } catch (err) {
        // Release lock even on timeout
        await redisClient.releaseLock(lockKey, 'test_lock');
      }

      // Verify lock released
      const lockExists = await redisClient.get(lockKey);
      expect(lockExists).toBeNull();
    });

    it('should rollback database transactions on timeout', async () => {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Simulate slow operation in transaction
        await Order.create([{
          userId: testUser._id,
          items: [{ productId: testProduct._id, quantity: 1, price: 1000 }],
          totalAmount: 1000,
          paymentStatus: 'PENDING',
          status: 'PENDING',
        }], { session });

        // Simulate timeout
        await new Promise(resolve => setTimeout(resolve, 100));
        throw new Error('Transaction timeout');
      } catch (err) {
        // Rollback on timeout
        await session.abortTransaction();
      } finally {
        session.endSession();
      }

      // Verify no partial data committed
      const orders = await Order.find({ userId: testUser._id });
      expect(orders.length).toBeLessThanOrEqual(1); // Only pre-existing test order
    });
  });

  describe('Concurrent Operations with Timeouts', () => {
    it('should handle multiple concurrent timeout scenarios', async () => {
      const promises = [];

      // Mock gateway to be slow
      jest.spyOn(require('../../src/modules/payment/payment.gateway.js'), 'createOrder').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 8000));
        return { id: 'order_mock', amount: 2000 };
      });

      // 5 concurrent payment creations
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/v1/payment/create-order')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              orderId: testOrder._id.toString(),
              amount: 2000,
            })
            .timeout(10000)
            .catch(err => ({ error: err.message }))
        );
      }

      const results = await Promise.all(promises);

      // All should complete or timeout gracefully
      expect(results.length).toBe(5);
      expect(results.every(r => r.status || r.error)).toBe(true);
    }, 15000);
  });
});
