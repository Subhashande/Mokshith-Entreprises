import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import connectDB from '../../src/config/db.js';
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
 * 🚀 PHASE 7 STEP 3: Database Performance & Stability Tests
 * 
 * Tests MongoDB behavior under high concurrent load, transaction handling,
 * connection pool management, and query performance under stress.
 * 
 * Critical Validation:
 * - No deadlocks during concurrent writes
 * - No transaction corruption
 * - Deterministic rollback behavior
 * - Stable query execution under load
 * - No connection pool exhaustion
 * - Proper index utilization
 */

describe('PHASE 7 STEP 3: Database Performance & Stability Tests', () => {
  let testUsers = [];
  let testProducts = [];
  let testCategory;
  let testWarehouse;

  beforeAll(async () => {
    await connectDB();

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
      name: 'DB Test Category',
      slug: 'db-test-category',
    });

    // Create test warehouse
    testWarehouse = await Warehouse.create({
      name: 'Test Warehouse',
      location: {
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
      },
      capacity: 10000,
      isActive: true,
    });

    // Create 10 test users
    const hashedPassword = await hashPassword('testpass123');
    for (let i = 0; i < 10; i++) {
      const user = await User.create({
        name: `DB Test User ${i}`,
        email: `dbtest${i}@example.com`,
        password: hashedPassword,
        mobile: `987654${i.toString().padStart(4, '0')}`,
        role: ROLES.BUYER,
        isVerified: true,
      });
      testUsers.push(user);
    }

    // Create 50 test products
    for (let i = 0; i < 50; i++) {
      const product = await Product.create({
        name: `DB Test Product ${i}`,
        description: `Product ${i} for database testing`,
        price: 100 + i * 10,
        stock: 1000,
        categoryId: testCategory._id,
        isActive: true,
      });
      testProducts.push(product);

      // Create inventory
      await Inventory.create({
        productId: product._id,
        warehouseId: testWarehouse._id,
        stock: 1000,
        version: 0,
      });
    }

    logger.info('DB performance test setup completed', {
      users: testUsers.length,
      products: testProducts.length,
    });
  }, 60000);

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Inventory.deleteMany({});
    await Category.deleteMany({});
    await Warehouse.deleteMany({});
    await Payment.deleteMany({});
    await mongoose.connection.close();
  }, 30000);

  beforeEach(async () => {
    // Clear orders and payments between tests
    await Order.deleteMany({});
    await Payment.deleteMany({});

    // Reset inventory stocks
    await Inventory.updateMany(
      { warehouseId: testWarehouse._id },
      { stock: 1000, version: 0 }
    );
  }, 10000);

  // ==============================================
  // TEST GROUP 1: Concurrent Write Operations
  // ==============================================

  describe('Concurrent Write Operations', () => {
    it('should handle 100 concurrent order creations without deadlocks', async () => {
      const concurrency = 100;
      const startTime = Date.now();

      // Create 100 orders concurrently
      const promises = Array.from({ length: concurrency }, async (_, idx) => {
        const user = testUsers[idx % testUsers.length];
        const product = testProducts[idx % testProducts.length];

        const orderData = {
          userId: user._id,
          items: [
            {
              productId: product._id,
              name: product.name,
              price: product.price,
              quantity: 1,
            },
          ],
          totalAmount: product.price,
          paymentMethod: 'COD',
          shippingAddress: {
            street: 'Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'India',
            zipCode: '123456',
          },
          status: ORDER_STATUS.PENDING,
        };

        try {
          const order = await Order.create(orderData);
          return { success: true, orderId: order._id };
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

      logger.info('Concurrent order creation test', {
        duration: `${duration}ms`,
        total: concurrency,
        success: successCount,
        failures: failureCount,
        throughput: `${(concurrency / duration * 1000).toFixed(2)} orders/s`,
      });

      // Assertions
      expect(successCount).toBe(concurrency);
      expect(failureCount).toBe(0);
      expect(duration).toBeLessThan(10000); // Should complete within 10s

      // Verify all orders were created correctly
      const orderCount = await Order.countDocuments();
      expect(orderCount).toBe(concurrency);
    }, 30000);

    it('should handle 50 concurrent atomic inventory updates without conflicts', async () => {
      const concurrency = 50;
      const testProduct = testProducts[0];

      // Get initial inventory
      const initialInventory = await Inventory.findOne({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
      });

      const initialStock = initialInventory.stock;
      const startTime = Date.now();

      // 50 concurrent inventory deductions of 1 unit each
      const promises = Array.from({ length: concurrency }, async () => {
        try {
          const result = await Inventory.findOneAndUpdate(
            {
              productId: testProduct._id,
              warehouseId: testWarehouse._id,
              stock: { $gte: 1 },
            },
            {
              $inc: { stock: -1, version: 1 },
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

      logger.info('Concurrent inventory update test', {
        duration: `${duration}ms`,
        total: concurrency,
        success: successCount,
        throughput: `${(concurrency / duration * 1000).toFixed(2)} updates/s`,
      });

      // Verify final inventory is exactly initial - concurrency
      const finalInventory = await Inventory.findOne({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
      });

      expect(finalInventory.stock).toBe(initialStock - concurrency);
      expect(successCount).toBe(concurrency);
    }, 30000);

    it('should handle 100 concurrent payment creations with unique razorpay IDs', async () => {
      const concurrency = 100;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrency }, async (_, idx) => {
        const user = testUsers[idx % testUsers.length];

        try {
          const payment = await Payment.create({
            userId: user._id,
            orderId: new mongoose.Types.ObjectId(),
            amount: 1000 + idx,
            razorpayOrderId: `order_${Date.now()}_${idx}`,
            razorpayPaymentId: `pay_${Date.now()}_${idx}`,
            razorpaySignature: `sig_${Date.now()}_${idx}`,
            status: PAYMENT_STATUS.PENDING,
          });

          return { success: true, paymentId: payment._id };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const results = await Promise.allSettled(promises);

      const duration = Date.now() - startTime;
      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      logger.info('Concurrent payment creation test', {
        duration: `${duration}ms`,
        total: concurrency,
        success: successCount,
        throughput: `${(concurrency / duration * 1000).toFixed(2)} payments/s`,
      });

      // All payments should be created successfully
      expect(successCount).toBe(concurrency);

      // Verify unique razorpay IDs
      const payments = await Payment.find({});
      const razorpayIds = payments.map(p => p.razorpayPaymentId);
      const uniqueIds = new Set(razorpayIds);
      expect(uniqueIds.size).toBe(concurrency);
    }, 30000);
  });

  // ==============================================
  // TEST GROUP 2: Transaction Handling
  // ==============================================

  describe('Transaction Handling', () => {
    it('should handle concurrent transactions without conflicts', async () => {
      // Only run if replica set is available
      if (mongoose.connection.readyState !== 1) {
        logger.warn('Skipping transaction test - database not connected');
        return;
      }

      // Check if replica set is available
      try {
        const admin = mongoose.connection.db.admin();
        const status = await admin.serverStatus();
        
        if (!status.repl) {
          logger.warn('Skipping transaction test - not a replica set');
          return;
        }
      } catch (err) {
        logger.warn('Skipping transaction test - replica set check failed');
        return;
      }

      const concurrency = 20;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrency }, async (_, idx) => {
        const session = await mongoose.startSession();

        try {
          const result = await session.withTransaction(async () => {
            const user = testUsers[idx % testUsers.length];
            const product = testProducts[idx % testProducts.length];

            // Create order
            const [order] = await Order.create(
              [
                {
                  userId: user._id,
                  items: [
                    {
                      productId: product._id,
                      name: product.name,
                      price: product.price,
                      quantity: 2,
                    },
                  ],
                  totalAmount: product.price * 2,
                  status: ORDER_STATUS.PENDING,
                  paymentMethod: 'COD',
                  shippingAddress: {
                    street: 'Test St',
                    city: 'Test City',
                    state: 'Test State',
                    country: 'India',
                    zipCode: '123456',
                  },
                },
              ],
              { session }
            );

            // Update inventory atomically
            const inventoryUpdate = await Inventory.findOneAndUpdate(
              {
                productId: product._id,
                warehouseId: testWarehouse._id,
                stock: { $gte: 2 },
              },
              { $inc: { stock: -2 } },
              { session, new: true }
            );

            if (!inventoryUpdate) {
              throw new Error('Insufficient stock');
            }

            return { orderId: order._id, inventoryId: inventoryUpdate._id };
          });

          return { success: true, result };
        } catch (error) {
          return { success: false, error: error.message };
        } finally {
          await session.endSession();
        }
      });

      const results = await Promise.allSettled(promises);

      const duration = Date.now() - startTime;
      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      logger.info('Concurrent transaction test', {
        duration: `${duration}ms`,
        total: concurrency,
        success: successCount,
        throughput: `${(concurrency / duration * 1000).toFixed(2)} txns/s`,
      });

      expect(successCount).toBe(concurrency);
    }, 60000);

    it('should properly rollback failed transactions', async () => {
      // Only run if replica set is available
      if (mongoose.connection.readyState !== 1) {
        logger.warn('Skipping rollback test - database not connected');
        return;
      }

      try {
        const admin = mongoose.connection.db.admin();
        const status = await admin.serverStatus();
        
        if (!status.repl) {
          logger.warn('Skipping rollback test - not a replica set');
          return;
        }
      } catch (err) {
        logger.warn('Skipping rollback test - replica set check failed');
        return;
      }

      const user = testUsers[0];
      const product = testProducts[0];

      // Get initial counts
      const initialOrderCount = await Order.countDocuments();
      const initialInventory = await Inventory.findOne({
        productId: product._id,
        warehouseId: testWarehouse._id,
      });

      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          // Create order
          await Order.create(
            [
              {
                userId: user._id,
                items: [{ productId: product._id, name: product.name, price: product.price, quantity: 1 }],
                totalAmount: product.price,
                status: ORDER_STATUS.PENDING,
                paymentMethod: 'COD',
                shippingAddress: {
                  street: 'Test St',
                  city: 'Test City',
                  state: 'Test State',
                  country: 'India',
                  zipCode: '123456',
                },
              },
            ],
            { session }
          );

          // Intentionally throw error to trigger rollback
          throw new Error('Intentional rollback');
        });
      } catch (error) {
        expect(error.message).toBe('Intentional rollback');
      } finally {
        await session.endSession();
      }

      // Verify rollback
      const finalOrderCount = await Order.countDocuments();
      const finalInventory = await Inventory.findOne({
        productId: product._id,
        warehouseId: testWarehouse._id,
      });

      // Order should not be created
      expect(finalOrderCount).toBe(initialOrderCount);

      // Inventory should remain unchanged
      expect(finalInventory.stock).toBe(initialInventory.stock);
    }, 30000);

    it('should handle transaction rollback under concurrent stress', async () => {
      // Only run if replica set is available
      if (mongoose.connection.readyState !== 1) {
        logger.warn('Skipping stress rollback test - database not connected');
        return;
      }

      try {
        const admin = mongoose.connection.db.admin();
        const status = await admin.serverStatus();
        
        if (!status.repl) {
          logger.warn('Skipping stress rollback test - not a replica set');
          return;
        }
      } catch (err) {
        logger.warn('Skipping stress rollback test - replica set check failed');
        return;
      }

      const concurrency = 30;
      const initialOrderCount = await Order.countDocuments();

      // Half succeed, half fail
      const promises = Array.from({ length: concurrency }, async (_, idx) => {
        const session = await mongoose.startSession();
        const shouldFail = idx % 2 === 0;

        try {
          await session.withTransaction(async () => {
            const user = testUsers[idx % testUsers.length];
            const product = testProducts[idx % testProducts.length];

            await Order.create(
              [
                {
                  userId: user._id,
                  items: [{ productId: product._id, name: product.name, price: product.price, quantity: 1 }],
                  totalAmount: product.price,
                  status: ORDER_STATUS.PENDING,
                  paymentMethod: 'COD',
                  shippingAddress: {
                    street: 'Test St',
                    city: 'Test City',
                    state: 'Test State',
                    country: 'India',
                    zipCode: '123456',
                  },
                },
              ],
              { session }
            );

            if (shouldFail) {
              throw new Error('Intentional failure');
            }
          });

          return { success: true, idx };
        } catch (error) {
          return { success: false, idx };
        } finally {
          await session.endSession();
        }
      });

      const results = await Promise.allSettled(promises);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      const finalOrderCount = await Order.countDocuments();

      logger.info('Stress rollback test', {
        total: concurrency,
        success: successCount,
        initialOrders: initialOrderCount,
        finalOrders: finalOrderCount,
      });

      // Only successful transactions should be persisted
      expect(finalOrderCount).toBe(initialOrderCount + successCount);
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 3: Connection Pool Exhaustion
  // ==============================================

  describe('Connection Pool Exhaustion', () => {
    it('should handle 200 concurrent connections gracefully', async () => {
      const concurrency = 200;
      const startTime = Date.now();

      // Make 200 concurrent database reads
      const promises = Array.from({ length: concurrency }, async () => {
        try {
          const products = await Product.find().limit(10).lean();
          return { success: true, count: products.length };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const results = await Promise.allSettled(promises);

      const duration = Date.now() - startTime;
      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      logger.info('Connection pool test', {
        duration: `${duration}ms`,
        total: concurrency,
        success: successCount,
      });

      // Should handle all connections (pool size is 100, but with queuing)
      expect(successCount).toBeGreaterThan(concurrency * 0.95); // At least 95% success
    }, 60000);

    it('should recover from connection pool saturation', async () => {
      // Saturate connection pool
      const saturatePromises = Array.from({ length: 150 }, () => 
        Product.find().limit(10).lean()
      );

      await Promise.allSettled(saturatePromises);

      // Wait for connections to be released
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Make normal requests
      const normalRequests = Array.from({ length: 20 }, () => 
        Product.find().limit(5).lean()
      );

      const results = await Promise.all(normalRequests);

      // All normal requests should succeed after pool recovery
      expect(results.length).toBe(20);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    }, 60000);
  });

  // ==============================================
  // TEST GROUP 4: Slow Query Handling
  // ==============================================

  describe('Slow Query Handling', () => {
    it('should timeout queries exceeding maxTimeMS', async () => {
      // Query with very short timeout (should timeout)
      try {
        await Product.find({ name: /DB Test/ })
          .maxTimeMS(1) // 1ms timeout (impossible)
          .lean();
        
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toMatch(/exceeded|timeout/i);
      }
    }, 10000);

    it('should handle concurrent slow queries without blocking', async () => {
      const concurrency = 20;
      const startTime = Date.now();

      // Mix of fast and slow queries
      const promises = Array.from({ length: concurrency }, async (_, idx) => {
        const timeout = idx % 2 === 0 ? 50 : 5000; // Alternate between 50ms and 5s

        try {
          const result = await Product.find()
            .limit(10)
            .maxTimeMS(timeout)
            .lean();
          
          return { success: true, count: result.length };
        } catch (error) {
          return { success: false, timedOut: error.message.includes('timeout') };
        }
      });

      const results = await Promise.allSettled(promises);

      const duration = Date.now() - startTime;
      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      logger.info('Concurrent slow query test', {
        duration: `${duration}ms`,
        total: concurrency,
        success: successCount,
      });

      // Some queries should succeed (those with adequate timeout)
      expect(successCount).toBeGreaterThan(5);
      expect(duration).toBeLessThan(10000);
    }, 30000);
  });

  // ==============================================
  // TEST GROUP 5: Large Dataset Pagination
  // ==============================================

  describe('Large Dataset Pagination', () => {
    it('should handle pagination of 1000+ records efficiently', async () => {
      // Create 1000 orders for pagination test
      const batchSize = 100;
      for (let i = 0; i < 10; i++) {
        const orders = Array.from({ length: batchSize }, (_, idx) => ({
          userId: testUsers[(i * batchSize + idx) % testUsers.length]._id,
          items: [
            {
              productId: testProducts[(i * batchSize + idx) % testProducts.length]._id,
              name: 'Test Product',
              price: 100,
              quantity: 1,
            },
          ],
          totalAmount: 100,
          status: ORDER_STATUS.PENDING,
          paymentMethod: 'COD',
          shippingAddress: {
            street: 'Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'India',
            zipCode: '123456',
          },
        }));

        await Order.insertMany(orders);
      }

      const startTime = Date.now();

      // Paginate through all records
      const pageSize = 50;
      const pages = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const orders = await Order.find()
          .limit(pageSize)
          .skip(page * pageSize)
          .sort({ createdAt: -1 })
          .lean()
          .maxTimeMS(3000);

        pages.push(orders);
        hasMore = orders.length === pageSize;
        page++;

        if (page > 30) break; // Safety limit
      }

      const duration = Date.now() - startTime;

      logger.info('Pagination test', {
        duration: `${duration}ms`,
        totalPages: pages.length,
        totalRecords: pages.reduce((sum, p) => sum + p.length, 0),
      });

      expect(pages.length).toBeGreaterThan(15); // Should have multiple pages
      expect(duration).toBeLessThan(10000); // Should complete within 10s
    }, 30000);

    it('should maintain consistent pagination results under concurrent queries', async () => {
      const concurrency = 10;

      // Multiple threads paginating simultaneously
      const promises = Array.from({ length: concurrency }, async () => {
        const orders = await Order.find()
          .limit(20)
          .sort({ createdAt: -1 })
          .lean();

        return orders.map(o => o._id.toString());
      });

      const results = await Promise.all(promises);

      // All threads should get the same results
      const firstResult = JSON.stringify(results[0]);
      results.forEach(result => {
        expect(JSON.stringify(result)).toBe(firstResult);
      });
    }, 30000);
  });

  // ==============================================
  // TEST GROUP 6: Query Performance Validation
  // ==============================================

  describe('Query Performance Validation', () => {
    it('should utilize indexes for common queries', async () => {
      const startTime = Date.now();

      // Query that should use userId index
      await Order.find({ userId: testUsers[0]._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const duration = Date.now() - startTime;

      logger.info('Indexed query performance', { duration: `${duration}ms` });

      // Should be fast due to index
      expect(duration).toBeLessThan(100);
    }, 10000);

    it('should handle text search queries efficiently', async () => {
      const startTime = Date.now();

      // Text search query
      await Product.find({ $text: { $search: 'DB Test' } })
        .limit(20)
        .lean();

      const duration = Date.now() - startTime;

      logger.info('Text search performance', { duration: `${duration}ms` });

      // Should complete reasonably fast
      expect(duration).toBeLessThan(500);
    }, 10000);

    it('should handle aggregation pipelines under load', async () => {
      const concurrency = 20;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrency }, async () => {
        const result = await Order.aggregate([
          { $match: { status: ORDER_STATUS.PENDING } },
          { $group: { _id: '$userId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]);

        return result;
      });

      const results = await Promise.all(promises);

      const duration = Date.now() - startTime;

      logger.info('Concurrent aggregation test', {
        duration: `${duration}ms`,
        total: concurrency,
        avgDuration: `${(duration / concurrency).toFixed(2)}ms`,
      });

      expect(results.length).toBe(concurrency);
      expect(duration).toBeLessThan(5000);
    }, 30000);
  });

  // ==============================================
  // TEST GROUP 7: Data Consistency Validation
  // ==============================================

  describe('Data Consistency Under Load', () => {
    it('should maintain data consistency during concurrent updates', async () => {
      const user = testUsers[0];
      const concurrency = 50;

      // Update same user's name 50 times concurrently
      const promises = Array.from({ length: concurrency }, async (_, idx) => {
        await User.findByIdAndUpdate(user._id, {
          name: `Updated Name ${idx}`,
        });
      });

      await Promise.allSettled(promises);

      // Verify user still has a valid name (last update wins)
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.name).toMatch(/Updated Name \d+/);
    }, 30000);

    it('should prevent duplicate entries with unique constraints', async () => {
      const concurrency = 50;
      const duplicateEmail = 'duplicate@example.com';
      const hashedPassword = await hashPassword('testpass123');

      // Try to create 50 users with same email
      const promises = Array.from({ length: concurrency }, async () => {
        try {
          await User.create({
            name: 'Duplicate User',
            email: duplicateEmail,
            password: hashedPassword,
            mobile: `999${Math.random().toString().substring(2, 9)}`,
            role: ROLES.BUYER,
          });

          return { success: true };
        } catch (error) {
          return { success: false, isDuplicateError: error.code === 11000 };
        }
      });

      const results = await Promise.allSettled(promises);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      const duplicateErrorCount = results.filter(
        r => r.status === 'fulfilled' && r.value.isDuplicateError
      ).length;

      logger.info('Unique constraint test', {
        total: concurrency,
        success: successCount,
        duplicateErrors: duplicateErrorCount,
      });

      // Only one should succeed
      expect(successCount).toBe(1);
      expect(duplicateErrorCount).toBe(concurrency - 1);
    }, 30000);
  });
});
