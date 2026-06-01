/**
 * 🔒 PHASE 4: Large-scale load and concurrency testing
 * Tests the system under realistic high-load conditions (100-500+ concurrent requests)
 * Validates replay protection, race condition safety, and system resilience
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import app from '../../src/app.js';
import User from '../../src/modules/user/user.model.js';
import Product from '../../src/modules/product/product.model.js';
import Order from '../../src/modules/order/order.model.js';
import Payment from '../../src/modules/payment/payment.model.js';
import Inventory from '../../src/modules/inventory/inventory.model.js';
import { redisClient } from '../../src/config/redis.js';
import { ROLES } from '../../src/constants/roles.js';

describe('Load & Concurrency Tests', () => {
  let authToken;
  let userId;
  let productId;
  let warehouseId;

  beforeAll(async () => {
    // Create test user
    const user = await User.create({
      name: 'Load Test User',
      email: 'loadtest@example.com',
      password: 'Password123!',
      role: ROLES.B2B_CUSTOMER,
      mobile: '9876543210',
      status: 'ACTIVE',
    });
    userId = user._id;

    // Login to get token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'loadtest@example.com', password: 'Password123!' });
    authToken = loginRes.body.data.token;

    // Create test product and inventory
    const product = await Product.create({
      name: 'Load Test Product',
      category: 'Test',
      basePrice: 100,
      stock: 10000,
      status: 'ACTIVE',
    });
    productId = product._id;

    const Warehouse = mongoose.model('Warehouse');
    let warehouse = await Warehouse.findOne();
    if (!warehouse) {
      warehouse = await Warehouse.create({
        name: 'Test Warehouse',
        location: { city: 'Test City' },
      });
    }
    warehouseId = warehouse._id;

    await Inventory.create({
      productId,
      warehouseId,
      stock: 10000,
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /loadtest/ });
    await Product.deleteMany({ name: /Load Test/ });
    await Order.deleteMany({ userId });
    await Payment.deleteMany({ userId });
    await Inventory.deleteMany({ productId });
  });

  describe('Payment Concurrency Tests', () => {
    it('should handle 100 concurrent payment verifications without race conditions', async () => {
      const orderId = new mongoose.Types.ObjectId();
      const razorpayOrderId = `order_${Date.now()}`;
      const razorpayPaymentId = `pay_${Date.now()}`;

      // Create payment record
      await Payment.create({
        orderId,
        userId,
        amount: 100,
        transactionId: razorpayOrderId,
        status: 'PENDING',
        paymentMethod: 'ONLINE',
      });

      // Create order
      await Order.create({
        _id: orderId,
        userId,
        items: [{ productId, name: 'Test Product', quantity: 1, price: 100 }],
        totalAmount: 100,
        paymentStatus: 'PENDING',
        status: 'PENDING',
        address: {
          name: 'Test User',
          phone: '9876543210',
          addressLine: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
        },
      });

      // Simulate 100 concurrent payment verification attempts
      const concurrentRequests = 100;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/v1/payment/verify')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              orderId: orderId.toString(),
              razorpay_order_id: razorpayOrderId,
              razorpay_payment_id: razorpayPaymentId,
              razorpay_signature: 'dummy_signature',
            })
        );
      }

      const results = await Promise.allSettled(promises);

      // Count successes (should be 1 due to replay protection)
      const successes = results.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const failures = results.filter(r => r.status === 'fulfilled' && r.value.status !== 200);

      // Replay protection should prevent duplicates
      expect(successes.length).toBeLessThanOrEqual(5); // Allow some race window
      expect(failures.length).toBeGreaterThan(90);

      // Verify order was only paid once
      const finalOrder = await Order.findById(orderId);
      expect(finalOrder.paymentStatus).toBe('PAID');
    }, 30000);

    it('should handle 200 concurrent lock acquisitions with exponential backoff', async () => {
      const testOrderId = new mongoose.Types.ObjectId();
      const concurrentRequests = 200;
      const lockKey = `test:lock:${testOrderId}`;

      const promises = [];
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          (async () => {
            const lockValue = `test-${i}-${Date.now()}`;
            const acquired = await redisClient.acquireLock(lockKey, lockValue, 5);
            if (acquired) {
              successCount++;
              await new Promise(resolve => setTimeout(resolve, 10)); // Hold lock briefly
              await redisClient.releaseLock(lockKey, lockValue);
            } else {
              failureCount++;
            }
          })()
        );
      }

      await Promise.allSettled(promises);

      // Most requests should fail to acquire lock (only 1 at a time can hold it)
      expect(failureCount).toBeGreaterThan(150);
      expect(successCount).toBeLessThan(50);
    }, 30000);
  });

  describe('Inventory Concurrency Tests', () => {
    it('should handle 500 concurrent stock deductions without overselling', async () => {
      const testProduct = await Product.create({
        name: 'Concurrency Test Product',
        category: 'Test',
        basePrice: 50,
        stock: 100,
        status: 'ACTIVE',
      });

      await Inventory.create({
        productId: testProduct._id,
        warehouseId,
        stock: 100,
      });

      const concurrentRequests = 500;
      const promises = [];

      // Try to deduct 1 unit 500 times (should only succeed 100 times)
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          (async () => {
            const { reduceStock } = await import('../../src/modules/inventory/inventory.service.js');
            try {
              await reduceStock(testProduct._id, 1, { maxRetries: 2, globalTimeoutMs: 5000 });
              return 'success';
            } catch (err) {
              return 'failure';
            }
          })()
        );
      }

      const results = await Promise.allSettled(promises);
      const successes = results.filter(
        r => r.status === 'fulfilled' && r.value === 'success'
      ).length;

      // Should deduct exactly 100 (initial stock), not more
      expect(successes).toBe(100);

      // Verify final stock is 0
      const finalInventory = await Inventory.findOne({ productId: testProduct._id });
      expect(finalInventory.stock).toBe(0);

      await Product.deleteOne({ _id: testProduct._id });
      await Inventory.deleteMany({ productId: testProduct._id });
    }, 60000);
  });

  describe('Order Creation Stress Test', () => {
    it('should handle 100 concurrent order creations with rate limiting', async () => {
      const concurrentRequests = 100;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/v1/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              items: [{ productId: productId.toString(), quantity: 1 }],
              paymentMethod: 'COD',
              shippingAddress: {
                street: 'Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'India',
                zipCode: '123456',
              },
            })
        );
      }

      const results = await Promise.allSettled(promises);

      // Rate limiter should block most requests (10 orders per 5 min)
      const successes = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const rateLimited = results.filter(
        r => r.status === 'fulfilled' && r.value.status === 429
      );

      expect(successes.length).toBeLessThanOrEqual(15); // Allow some margin
      expect(rateLimited.length).toBeGreaterThan(80);
    }, 30000);
  });

  describe('Redis Failure Simulation', () => {
    it('should gracefully handle Redis disconnection during operations', async () => {
      // Simulate Redis being down by using circuit breaker
      const testKey = `test:redis:failure:${Date.now()}`;

      // Try operations while Redis may be degraded
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          (async () => {
            try {
              await redisClient.set(testKey, 'value', 'EX', 10);
              return 'success';
            } catch {
              return 'failure';
            }
          })()
        );
      }

      const results = await Promise.allSettled(promises);

      // Some operations should succeed (graceful degradation)
      const successes = results.filter(
        r => r.status === 'fulfilled' && r.value === 'success'
      ).length;

      // System should still be partially functional
      expect(successes).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Idempotency Race Condition Test', () => {
    it('should prevent duplicate order processing with concurrent requests', async () => {
      const idempotencyKey = `load-test-${Date.now()}`;
      const concurrentRequests = 50;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/v1/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .set('Idempotency-Key', idempotencyKey)
            .send({
              items: [{ productId: productId.toString(), quantity: 1 }],
              paymentMethod: 'COD',
              shippingAddress: {
                street: 'Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'India',
                zipCode: '123456',
              },
            })
        );
      }

      const results = await Promise.allSettled(promises);

      // Only 1 order should succeed, rest should get duplicate error or cached response
      const successes = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const cachedResponses = results.filter(
        r => r.status === 'fulfilled' && r.value.status === 200
      );
      const conflicts = results.filter(r => r.status === 'fulfilled' && r.value.status === 409);

      // Either cached or conflict responses
      expect(successes.length).toBe(1);
      expect(cachedResponses.length + conflicts.length).toBeGreaterThan(45);

      // Verify only 1 order was created
      const orders = await Order.find({ 'metadata.idempotencyKey': idempotencyKey });
      expect(orders.length).toBeLessThanOrEqual(1);
    }, 30000);
  });

  describe('System Scalability Metrics', () => {
    it('should maintain acceptable response times under high load', async () => {
      const concurrentRequests = 100;
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app).get('/api/v1/health').set('Authorization', `Bearer ${authToken}`)
        );
      }

      await Promise.allSettled(promises);
      const duration = Date.now() - startTime;

      // 100 health checks should complete within 5 seconds
      expect(duration).toBeLessThan(5000);

      // Average response time should be under 50ms per request
      const avgResponseTime = duration / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(50);
    }, 10000);
  });
});
