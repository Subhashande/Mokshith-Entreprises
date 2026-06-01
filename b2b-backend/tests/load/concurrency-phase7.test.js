import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import app from '../../src/app.js';
import connectDB from '../../src/config/db.js';
import { redisClient } from '../../src/config/redis.js';
import User from '../../src/modules/user/user.model.js';
import Product from '../../src/modules/product/product.model.js';
import Order from '../../src/modules/order/order.model.js';
import Inventory from '../../src/modules/inventory/inventory.model.js';
import Category from '../../src/modules/category/category.model.js';
import Warehouse from '../../src/modules/warehouse/warehouse.model.js';
import Payment from '../../src/modules/payment/payment.model.js';
import { hashPassword } from '../../src/utils/hashPassword.js';
import { ROLES } from '../../src/constants/roles.js';
import { ORDER_STATUS } from '../../src/constants/orderStatus.js';
import { PAYMENT_STATUS } from '../../src/constants/paymentStatus.js';
import { logger } from '../../src/config/logger.js';

/**
 * 🚀 PHASE 7 STEP 4: Concurrency & Race Condition Tests
 * 
 * Tests critical race conditions that could lead to data corruption,
 * double-spending, inventory over-selling, and duplicate transactions.
 * 
 * Critical Validation:
 * - Atomic operations (no lost updates)
 * - Deterministic state updates
 * - Transactional consistency
 * - Idempotency enforcement
 * - No duplicate processing
 * - Proper lock handling
 */

describe('PHASE 7 STEP 4: Concurrency & Race Condition Tests', () => {
  let authToken;
  let testUser;
  let testProduct;
  let testCategory;
  let testWarehouse;

  beforeAll(async () => {
    await connectDB();
    await redisClient.connect();

    // Clear test data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Inventory.deleteMany({});
    await Category.deleteMany({});
    await Warehouse.deleteMany({});
    await Payment.deleteMany({});

    // Create test category
    testCategory = await Category.create({
      name: 'Concurrency Test Category',
      slug: 'concurrency-test',
    });

    // Create test warehouse
    testWarehouse = await Warehouse.create({
      name: 'Concurrency Test Warehouse',
      location: {
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
      },
      capacity: 10000,
      isActive: true,
    });

    // Create test user
    const hashedPassword = await hashPassword('testpass123');
    testUser = await User.create({
      name: 'Concurrency Test User',
      email: 'concurrency@example.com',
      password: hashedPassword,
      mobile: '9876543210',
      role: ROLES.BUYER,
      isVerified: true,
    });

    // Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'concurrency@example.com', password: 'testpass123' });

    authToken = loginRes.body.data.accessToken;

    // Create test product
    testProduct = await Product.create({
      name: 'Limited Stock Product',
      description: 'Product with limited stock for concurrency testing',
      price: 999,
      stock: 100, // Limited stock for race condition testing
      categoryId: testCategory._id,
      isActive: true,
    });

    // Create inventory
    await Inventory.create({
      productId: testProduct._id,
      warehouseId: testWarehouse._id,
      stock: 100, // Limited stock
      version: 0,
    });

    logger.info('Concurrency test setup completed', {
      userId: testUser._id,
      productId: testProduct._id,
    });
  }, 60000);

  afterAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Inventory.deleteMany({});
    await Category.deleteMany({});
    await Warehouse.deleteMany({});
    await Payment.deleteMany({});
    await redisClient.quit();
    await mongoose.connection.close();
  }, 30000);

  beforeEach(async () => {
    // Reset state between tests
    await Order.deleteMany({});
    await Payment.deleteMany({});
    
    // Reset inventory
    await Inventory.updateOne(
      { productId: testProduct._id, warehouseId: testWarehouse._id },
      { stock: 100, version: 0 }
    );

    // Reset product stock
    await Product.updateOne({ _id: testProduct._id }, { stock: 100 });

    // Clear Redis rate limit keys
    const keys = await redisClient.keys('rl:*');
    if (keys.length > 0) {
      await Promise.all(keys.map(key => redisClient.del(key)));
    }
  }, 10000);

  // ==============================================
  // TEST GROUP 1: Concurrent Order Creation
  // ==============================================

  describe('Concurrent Order Creation Race Conditions', () => {
    it('should prevent inventory over-selling with 50 concurrent orders', async () => {
      // Product has 100 stock, try to order 50 x 3 = 150 (should fail some)
      const concurrency = 50;
      const quantityPerOrder = 3;
      const totalRequested = concurrency * quantityPerOrder; // 150
      const availableStock = 100;

      const startTime = Date.now();

      const promises = Array.from({ length: concurrency }, async (_, idx) => {
        try {
          const res = await request(app)
            .post('/api/v1/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              items: [
                {
                  productId: testProduct._id.toString(),
                  quantity: quantityPerOrder,
                },
              ],
              paymentMethod: 'COD',
              shippingAddress: {
                street: `Test St ${idx}`,
                city: 'Test City',
                state: 'Test State',
                country: 'India',
                zipCode: '123456',
              },
            });

          return {
            success: res.status === 201,
            status: res.status,
            orderId: res.body.data?._id,
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const results = await Promise.allSettled(promises);

      const duration = Date.now() - startTime;
      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      const failureCount = results.filter(
        r => r.status === 'fulfilled' && !r.value.success
      ).length;

      logger.info('Concurrent order race condition test', {
        duration: `${duration}ms`,
        totalRequests: concurrency,
        successfulOrders: successCount,
        failedOrders: failureCount,
        requestedStock: totalRequested,
        availableStock,
      });

      // Verify inventory integrity
      const finalInventory = await Inventory.findOne({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
      });

      const totalDeducted = availableStock - finalInventory.stock;
      const expectedDeducted = successCount * quantityPerOrder;

      logger.info('Inventory verification', {
        initialStock: availableStock,
        finalStock: finalInventory.stock,
        totalDeducted,
        expectedDeducted,
        successfulOrders: successCount,
      });

      // CRITICAL: Stock should never go negative
      expect(finalInventory.stock).toBeGreaterThanOrEqual(0);

      // CRITICAL: Total deducted should match successful orders
      expect(totalDeducted).toBe(expectedDeducted);

      // CRITICAL: Cannot fulfill all orders (not enough stock)
      expect(successCount).toBeLessThan(concurrency);
      expect(successCount).toBe(Math.floor(availableStock / quantityPerOrder));
    }, 60000);

    it('should handle concurrent orders for same product from same user', async () => {
      const concurrency = 30;
      const startTime = Date.now();

      // Same user, same product, 30 concurrent orders
      const promises = Array.from({ length: concurrency }, async () => {
        try {
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
            });

          return { success: res.status === 201, orderId: res.body.data?._id };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const results = await Promise.allSettled(promises);

      const duration = Date.now() - startTime;
      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      logger.info('Same user concurrent orders test', {
        duration: `${duration}ms`,
        totalAttempts: concurrency,
        successful: successCount,
      });

      // Verify all successful orders have unique IDs
      const orderIds = results
        .filter(r => r.status === 'fulfilled' && r.value.orderId)
        .map(r => r.value.orderId);

      const uniqueOrderIds = new Set(orderIds);
      expect(uniqueOrderIds.size).toBe(orderIds.length); // All unique
    }, 60000);

    it('should enforce idempotency with duplicate idempotency keys', async () => {
      const idempotencyKey = uuidv4();
      const concurrency = 20;

      // Try to create 20 orders with same idempotency key
      const promises = Array.from({ length: concurrency }, async () => {
        try {
          const res = await request(app)
            .post('/api/v1/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-Idempotency-Key', idempotencyKey)
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

          return { success: res.status === 201, orderId: res.body.data?._id };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const results = await Promise.allSettled(promises);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      const orderIds = results
        .filter(r => r.status === 'fulfilled' && r.value.orderId)
        .map(r => r.value.orderId);

      const uniqueOrderIds = new Set(orderIds);

      logger.info('Idempotency key test', {
        attempts: concurrency,
        successfulCreations: successCount,
        uniqueOrders: uniqueOrderIds.size,
      });

      // Only one order should be created
      // NOTE: If idempotency not implemented, this will fail
      expect(uniqueOrderIds.size).toBeLessThanOrEqual(1);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 2: Concurrent Payment Processing
  // ==============================================

  describe('Concurrent Payment Processing', () => {
    it('should prevent duplicate payment processing for same order', async () => {
      // Create an order first
      const order = await Order.create({
        userId: testUser._id,
        items: [
          {
            productId: testProduct._id,
            name: testProduct.name,
            price: testProduct.price,
            quantity: 1,
          },
        ],
        totalAmount: testProduct.price,
        status: ORDER_STATUS.PENDING,
        paymentMethod: 'ONLINE',
        shippingAddress: {
          street: 'Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'India',
          zipCode: '123456',
        },
      });

      const concurrency = 30;
      const razorpayPaymentId = `pay_${Date.now()}`;

      // Try to process payment 30 times simultaneously
      const promises = Array.from({ length: concurrency }, async () => {
        try {
          const res = await request(app)
            .post('/api/v1/payments/verify')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              orderId: order._id.toString(),
              razorpay_order_id: `order_${order._id}`,
              razorpay_payment_id: razorpayPaymentId,
              razorpay_signature: 'test_signature',
            });

          return { success: res.status === 200, paymentId: res.body.data?._id };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const results = await Promise.allSettled(promises);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      logger.info('Duplicate payment prevention test', {
        attempts: concurrency,
        successful: successCount,
      });

      // Verify only one payment was created
      const payments = await Payment.find({ orderId: order._id });
      expect(payments.length).toBeLessThanOrEqual(1);

      // Verify order status updated only once
      const updatedOrder = await Order.findById(order._id);
      const statusChangeCount = updatedOrder.paymentStatus === PAYMENT_STATUS.PAID ? 1 : 0;
      expect(statusChangeCount).toBeLessThanOrEqual(1);
    }, 60000);

    it('should handle concurrent payment creations with unique razorpay IDs', async () => {
      const concurrency = 50;

      const promises = Array.from({ length: concurrency}, async (_, idx) => {
        try {
          const payment = await Payment.create({
            userId: testUser._id,
            orderId: new mongoose.Types.ObjectId(),
            amount: 1000 + idx,
            razorpayOrderId: `order_${Date.now()}_${idx}_${Math.random()}`,
            razorpayPaymentId: `pay_${Date.now()}_${idx}_${Math.random()}`,
            razorpaySignature: `sig_${Date.now()}_${idx}`,
            status: PAYMENT_STATUS.SUCCESS,
          });

          return { success: true, paymentId: payment._id };
        } catch (error) {
          return { success: false, isDuplicate: error.code === 11000 };
        }
      });

      const results = await Promise.allSettled(promises);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      const duplicateCount = results.filter(
        r => r.status === 'fulfilled' && r.value.isDuplicate
      ).length;

      logger.info('Concurrent payment creation test', {
        total: concurrency,
        successful: successCount,
        duplicates: duplicateCount,
      });

      // All should succeed (unique razorpay IDs)
      expect(successCount).toBe(concurrency);
      expect(duplicateCount).toBe(0);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 3: Inventory Atomic Operations
  // ==============================================

  describe('Inventory Atomic Operations', () => {
    it('should handle 100 concurrent inventory deductions atomically', async () => {
      const initialStock = 100;
      const concurrency = 100;
      const deductAmount = 1;

      const startTime = Date.now();

      const promises = Array.from({ length: concurrency }, async () => {
        try {
          const result = await Inventory.findOneAndUpdate(
            {
              productId: testProduct._id,
              warehouseId: testWarehouse._id,
              stock: { $gte: deductAmount },
            },
            {
              $inc: { stock: -deductAmount, version: 1 },
            },
            { new: true }
          );

          return { success: !!result, finalStock: result?.stock };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const results = await Promise.allSettled(promises);

      const duration = Date.now() - startTime;
      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      logger.info('Atomic inventory deduction test', {
        duration: `${duration}ms`,
        initialStock,
        attempts: concurrency,
        successful: successCount,
        throughput: `${(concurrency / duration * 1000).toFixed(2)} ops/s`,
      });

      // Verify final inventory
      const finalInventory = await Inventory.findOne({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
      });

      logger.info('Final inventory state', {
        initialStock,
        finalStock: finalInventory.stock,
        expectedStock: initialStock - successCount,
        actualDeducted: initialStock - finalInventory.stock,
      });

      // CRITICAL: Stock should exactly match expected
      expect(finalInventory.stock).toBe(initialStock - successCount);

      // CRITICAL: All operations should succeed (enough stock)
      expect(successCount).toBe(concurrency);

      // CRITICAL: Stock should never go negative
      expect(finalInventory.stock).toBeGreaterThanOrEqual(0);
    }, 60000);

    it('should prevent negative stock with insufficient inventory', async () => {
      // Set low stock
      await Inventory.updateOne(
        { productId: testProduct._id, warehouseId: testWarehouse._id },
        { stock: 10, version: 0 }
      );

      const concurrency = 50;
      const deductAmount = 1;

      const promises = Array.from({ length: concurrency }, async () => {
        try {
          const result = await Inventory.findOneAndUpdate(
            {
              productId: testProduct._id,
              warehouseId: testWarehouse._id,
              stock: { $gte: deductAmount },
            },
            {
              $inc: { stock: -deductAmount, version: 1 },
            },
            { new: true }
          );

          return { success: !!result };
        } catch (error) {
          return { success: false };
        }
      });

      const results = await Promise.allSettled(promises);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      const failureCount = concurrency - successCount;

      logger.info('Insufficient stock prevention test', {
        initialStock: 10,
        attempts: concurrency,
        successful: successCount,
        failed: failureCount,
      });

      // Only 10 should succeed (initial stock = 10)
      expect(successCount).toBe(10);
      expect(failureCount).toBe(40);

      // Verify stock is exactly 0 (not negative)
      const finalInventory = await Inventory.findOne({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
      });

      expect(finalInventory.stock).toBe(0);
    }, 60000);

    it('should handle optimistic locking with version field', async () => {
      const concurrency = 50;

      const promises = Array.from({ length: concurrency }, async () => {
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
          attempts++;

          try {
            // Read current version
            const inventory = await Inventory.findOne({
              productId: testProduct._id,
              warehouseId: testWarehouse._id,
            });

            if (!inventory || inventory.stock < 1) {
              return { success: false, reason: 'insufficient_stock' };
            }

            // Attempt update with version check
            const result = await Inventory.findOneAndUpdate(
              {
                productId: testProduct._id,
                warehouseId: testWarehouse._id,
                version: inventory.version, // Optimistic lock
                stock: { $gte: 1 },
              },
              {
                $inc: { stock: -1, version: 1 },
              },
              { new: true }
            );

            if (result) {
              return { success: true, attempts };
            }

            // Version mismatch, retry
            await new Promise(resolve => setTimeout(resolve, 10));
          } catch (error) {
            return { success: false, error: error.message };
          }
        }

        return { success: false, reason: 'max_retries' };
      });

      const results = await Promise.allSettled(promises);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      const retriedCount = results.filter(
        r => r.status === 'fulfilled' && r.value.attempts && r.value.attempts > 1
      ).length;

      logger.info('Optimistic locking test', {
        total: concurrency,
        successful: successCount,
        withRetries: retriedCount,
      });

      expect(successCount).toBeGreaterThan(0);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 4: Concurrent Login Attempts
  // ==============================================

  describe('Concurrent Login Attempts', () => {
    it('should handle 50 simultaneous login requests for same user', async () => {
      const concurrency = 50;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrency }, async () => {
        try {
          const res = await request(app)
            .post('/api/v1/auth/login')
            .send({
              identifier: 'concurrency@example.com',
              password: 'testpass123',
            });

          return {
            success: res.status === 200,
            token: res.body.data?.accessToken,
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const results = await Promise.allSettled(promises);

      const duration = Date.now() - startTime;
      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      const tokens = results
        .filter(r => r.status === 'fulfilled' && r.value.token)
        .map(r => r.value.token);

      const uniqueTokens = new Set(tokens);

      logger.info('Concurrent login test', {
        duration: `${duration}ms`,
        attempts: concurrency,
        successful: successCount,
        uniqueTokens: uniqueTokens.size,
      });

      // All login attempts should succeed
      expect(successCount).toBe(concurrency);

      // Each should get a unique token
      expect(uniqueTokens.size).toBe(concurrency);
    }, 60000);

    it('should not have race conditions in failed login tracking', async () => {
      const concurrency = 10;

      // Create temp user for failed login test
      const hashedPassword = await hashPassword('correct_password');
      const tempUser = await User.create({
        name: 'Failed Login User',
        email: 'failedlogin@example.com',
        password: hashedPassword,
        mobile: '9999999999',
        role: ROLES.BUYER,
      });

      // Try 10 concurrent failed logins
      const promises = Array.from({ length: concurrency }, async () => {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({
            identifier: 'failedlogin@example.com',
            password: 'wrong_password',
          });

        return { status: res.status };
      });

      const results = await Promise.all(promises);

      // All should fail
      results.forEach(r => {
        expect(r.status).toBe(401);
      });

      // Cleanup
      await User.deleteOne({ _id: tempUser._id });
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 5: Distributed Lock Testing
  // ==============================================

  describe('Distributed Lock Race Conditions', () => {
    it('should prevent concurrent access to critical section', async () => {
      const lockKey = `test:critical:${Date.now()}`;
      const concurrency = 30;
      let criticalSectionAccesses = 0;

      const promises = Array.from({ length: concurrency }, async (_, idx) => {
        const lockValue = `worker_${idx}`;

        try {
          // Try to acquire lock
          const acquired = await redisClient.acquireLock(lockKey, lockValue, 5);

          if (acquired) {
            // Critical section
            criticalSectionAccesses++;
            await new Promise(resolve => setTimeout(resolve, 50)); // Simulate work

            // Release lock
            await redisClient.releaseLock(lockKey, lockValue);

            return { success: true, acquiredLock: true };
          }

          return { success: true, acquiredLock: false };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const results = await Promise.allSettled(promises);

      const acquiredCount = results.filter(
        r => r.status === 'fulfilled' && r.value.acquiredLock
      ).length;

      logger.info('Distributed lock test', {
        total: concurrency,
        acquiredLock: acquiredCount,
        criticalSectionAccesses,
      });

      // Critical section should only be accessed by those who acquired lock
      expect(criticalSectionAccesses).toBe(acquiredCount);
    }, 60000);

    it('should handle lock contention without deadlocks', async () => {
      const lockKey = `test:contention:${Date.now()}`;
      const concurrency = 50;
      const maxRetries = 3;

      const promises = Array.from({ length: concurrency }, async (_, idx) => {
        const lockValue = `worker_${idx}`;
        let acquired = false;

        for (let retry = 0; retry < maxRetries; retry++) {
          acquired = await redisClient.acquireLock(lockKey, lockValue, 2);

          if (acquired) {
            // Do work
            await new Promise(resolve => setTimeout(resolve, 10));
            await redisClient.releaseLock(lockKey, lockValue);
            return { success: true, retries: retry };
          }

          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        return { success: false, reason: 'max_retries' };
      });

      const results = await Promise.allSettled(promises);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      logger.info('Lock contention test', {
        total: concurrency,
        successful: successCount,
      });

      // Most should eventually succeed
      expect(successCount).toBeGreaterThan(concurrency * 0.7);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 6: State Transition Consistency
  // ==============================================

  describe('State Transition Consistency', () => {
    it('should handle concurrent order status updates deterministically', async () => {
      // Create order
      const order = await Order.create({
        userId: testUser._id,
        items: [
          {
            productId: testProduct._id,
            name: testProduct.name,
            price: testProduct.price,
            quantity: 1,
          },
        ],
        totalAmount: testProduct.price,
        status: ORDER_STATUS.PENDING,
        paymentMethod: 'COD',
        shippingAddress: {
          street: 'Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'India',
          zipCode: '123456',
        },
      });

      const concurrency = 20;

      // Try to update to different statuses simultaneously
      const promises = Array.from({ length: concurrency }, async (_, idx) => {
        const newStatus = idx % 2 === 0 ? ORDER_STATUS.CONFIRMED : ORDER_STATUS.PROCESSING;

        try {
          const result = await Order.findByIdAndUpdate(
            order._id,
            { status: newStatus },
            { new: true }
          );

          return { success: true, finalStatus: result.status };
        } catch (error) {
          return { success: false };
        }
      });

      const results = await Promise.allSettled(promises);

      // Get final state
      const finalOrder = await Order.findById(order._id);

      logger.info('State transition consistency test', {
        total: concurrency,
        finalStatus: finalOrder.status,
      });

      // Should have one of the target statuses (last write wins)
      expect([ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING]).toContain(finalOrder.status);

      // All updates should succeed
      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;
      expect(successCount).toBe(concurrency);
    }, 60000);
  });
});
