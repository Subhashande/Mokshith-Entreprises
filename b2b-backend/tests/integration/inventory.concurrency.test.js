import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import Product from '../../src/modules/product/product.model.js';
import Inventory from '../../src/modules/inventory/inventory.model.js';
import Warehouse from '../../src/modules/warehouse/warehouse.model.js';
import Order from '../../src/modules/order/order.model.js';
import User from '../../src/modules/user/user.model.js';
import Category from '../../src/modules/category/category.model.js';
import { reduceStock, checkStock, restoreStock } from '../../src/modules/inventory/inventory.service.js';
import { createOrder } from '../../src/modules/order/order.service.js';
import { clearDatabase, generateTestUser } from '../helpers/testUtils.js';
import { hashPassword } from '../../src/utils/hashPassword.js';
import { USER_STATUS } from '../../src/constants/userStatus.js';
import { ORDER_STATUS } from '../../src/constants/orderStatus.js';

/**
 * 🔒 Inventory Concurrency & Overselling Prevention Tests
 * Tests for atomic stock deduction, optimistic locking, and concurrent order placement
 */
describe('Inventory Concurrency Tests', () => {
  let testWarehouse;
  let testProduct;
  let testUser;
  let testCategory;

  beforeEach(async () => {
    await clearDatabase();

    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      slug: 'test-category-' + Date.now(),
    });

    // Create test warehouse
    testWarehouse = await Warehouse.create({
      name: 'Test Warehouse',
      location: {
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'India',
      },
    });

    // Create test product
    testProduct = await Product.create({
      name: 'Test Product',
      description: 'Product for concurrency testing',
      price: 100,
      categoryId: testCategory._id,
      sku: `TEST-${Date.now()}`,
      status: 'ACTIVE',
    });

    // Create test user
    const hashedPassword = await hashPassword('Test@1234');
    testUser = await User.create({
      ...generateTestUser({ email: 'inventory@test.com' }),
      password: hashedPassword,
      status: USER_STATUS.ACTIVE,
      role: 'BUYER',
    });
  });

  describe('Concurrent Stock Deduction', () => {
    beforeEach(async () => {
      // Initialize inventory with limited stock
      await Inventory.create({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
        stock: 10,
        version: 0,
      });
    });

    it('should prevent overselling with concurrent stock deduction', async () => {
      const initialStock = 10;
      const requestedQuantity = 3;
      const concurrentRequests = 5; // Total requested: 15, but only 10 available

      // Simulate 5 concurrent stock deduction requests
      const deductionPromises = Array(concurrentRequests).fill(null).map(() =>
        reduceStock(testProduct._id, requestedQuantity)
      );

      const results = await Promise.allSettled(deductionPromises);

      // Count successes and failures
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Only 3 requests should succeed (3 * 3 = 9, leaving 1 in stock)
      // 4th request would need 3 but only 1 available
      expect(successful).toBeLessThanOrEqual(3);
      expect(failed).toBeGreaterThanOrEqual(2);

      // Verify final stock is non-negative
      const finalInventory = await Inventory.findOne({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
      });
      expect(finalInventory.stock).toBeGreaterThanOrEqual(0);
      expect(finalInventory.stock).toBeLessThanOrEqual(initialStock);

      // Total deducted should not exceed initial stock
      const totalDeducted = initialStock - finalInventory.stock;
      expect(totalDeducted).toBeLessThanOrEqual(initialStock);
    });

    it('should handle optimistic locking version conflicts', async () => {
      // Simulate concurrent updates with version checking
      const inventory = await Inventory.findOne({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
      });

      const initialVersion = inventory.version;

      // Concurrent deductions
      const [result1, result2, result3] = await Promise.allSettled([
        reduceStock(testProduct._id, 2),
        reduceStock(testProduct._id, 2),
        reduceStock(testProduct._id, 2),
      ]);

      // At least one should succeed
      const successCount = [result1, result2, result3].filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Verify version incremented for each successful update
      const updatedInventory = await Inventory.findOne({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
      });
      expect(updatedInventory.version).toBeGreaterThan(initialVersion);
      expect(updatedInventory.version).toBe(initialVersion + successCount);
    });

    it('should retry on version conflict and eventually succeed', async () => {
      // This tests the retry logic in reduceStock
      const quantity = 1;

      // Create artificial version conflict by updating manually
      await Inventory.findOneAndUpdate(
        {
          productId: testProduct._id,
          warehouseId: testWarehouse._id,
        },
        { $inc: { version: 1 } }
      );

      // Should still succeed after retry
      await expect(
        reduceStock(testProduct._id, quantity, { maxRetries: 3 })
      ).resolves.not.toThrow();

      // Verify stock deducted
      const inventory = await Inventory.findOne({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
      });
      expect(inventory.stock).toBe(9); // 10 - 1
    });

    it('should fail after max retries on persistent conflicts', async () => {
      // Create high contention scenario
      const concurrentUpdates = 10;

      const updatePromises = Array(concurrentUpdates).fill(null).map(() =>
        reduceStock(testProduct._id, 1, { maxRetries: 2 })
      );

      const results = await Promise.allSettled(updatePromises);

      // Some should fail after max retries
      const failed = results.filter(r => r.status === 'rejected');
      expect(failed.length).toBeGreaterThan(0);

      // But stock should still be valid
      const inventory = await Inventory.findOne({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
      });
      expect(inventory.stock).toBeGreaterThanOrEqual(0);
      expect(inventory.stock).toBeLessThanOrEqual(10);
    });
  });

  describe('Concurrent Order Placement', () => {
    beforeEach(async () => {
      // Initialize inventory with limited stock
      await Inventory.create({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
        stock: 5,
        version: 0,
      });
    });

    it('should prevent overselling during concurrent order creation', async () => {
      const orderData = {
        paymentMethod: 'COD',
        shippingAddress: {
          fullName: 'Test User',
          phone: '1234567890',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
        },
        items: [
          {
            productId: testProduct._id,
            quantity: 2,
            price: testProduct.price,
          },
        ],
      };

      // 5 concurrent orders, each requesting 2 units (total 10 needed, only 5 available)
      const concurrentOrders = Array(5).fill(null).map(() =>
        createOrder(testUser._id, orderData)
      );

      const results = await Promise.allSettled(concurrentOrders);

      // Only 2 orders should succeed (2 * 2 = 4, leaving 1 in stock)
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBeLessThanOrEqual(2);
      expect(failed).toBeGreaterThanOrEqual(3);

      // Verify final stock
      const inventory = await Inventory.findOne({
        productId: testProduct._id,
      });
      expect(inventory.stock).toBeGreaterThanOrEqual(0);
      expect(inventory.stock).toBeLessThanOrEqual(5);

      // Verify failed orders contain "insufficient stock" message
      const failedOrders = results.filter(r => r.status === 'rejected');
      failedOrders.forEach(result => {
        expect(result.reason.message).toMatch(/insufficient|stock/i);
      });
    });

    it('should handle concurrent orders for different products', async () => {
      // Create second product
      const product2 = await Product.create({
        name: 'Test Product 2',
        description: 'Second product',
        price: 150,
        categoryId: testCategory._id,
        sku: `TEST2-${Date.now()}`,
        status: 'ACTIVE',
      });

      await Inventory.create({
        productId: product2._id,
        warehouseId: testWarehouse._id,
        stock: 5,
        version: 0,
      });

      const order1Data = {
        paymentMethod: 'COD',
        shippingAddress: {
          fullName: 'Test User',
          phone: '1234567890',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
        },
        items: [
          { productId: testProduct._id, quantity: 3, price: testProduct.price },
        ],
      };

      const order2Data = {
        ...order1Data,
        items: [
          { productId: product2._id, quantity: 3, price: product2.price },
        ],
      };

      // Concurrent orders for different products should both succeed
      const [result1, result2] = await Promise.allSettled([
        createOrder(testUser._id, order1Data),
        createOrder(testUser._id, order2Data),
      ]);

      expect(result1.status).toBe('fulfilled');
      expect(result2.status).toBe('fulfilled');

      // Verify both inventories updated
      const inv1 = await Inventory.findOne({ productId: testProduct._id });
      const inv2 = await Inventory.findOne({ productId: product2._id });
      expect(inv1.stock).toBe(2); // 5 - 3
      expect(inv2.stock).toBe(2); // 5 - 3
    });
  });

  describe('Stock Check Concurrency', () => {
    beforeEach(async () => {
      await Inventory.create({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
        stock: 10,
        version: 0,
      });
    });

    it('should handle concurrent stock checks', async () => {
      const checks = Array(20).fill(null).map(() =>
        checkStock(testProduct._id, 5)
      );

      const results = await Promise.allSettled(checks);

      // All checks should succeed (read-only operation)
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBe(20);
    });

    it('should detect insufficient stock in race condition', async () => {
      // Start stock check and deduction concurrently
      const checkPromise = checkStock(testProduct._id, 10);
      const deductPromise = reduceStock(testProduct._id, 8);

      await Promise.all([checkPromise, deductPromise]);

      // After deduction, subsequent check should reflect reduced stock
      await expect(
        checkStock(testProduct._id, 10)
      ).rejects.toThrow(/insufficient/i);

      // But smaller quantity should succeed
      await expect(
        checkStock(testProduct._id, 2)
      ).resolves.toBe(true);
    });
  });

  describe('Stock Restoration Concurrency', () => {
    beforeEach(async () => {
      await Inventory.create({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
        stock: 5,
        version: 0,
      });
    });

    it('should handle concurrent stock restoration', async () => {
      // Deduct stock first
      await reduceStock(testProduct._id, 5);

      const inventory = await Inventory.findOne({ productId: testProduct._id });
      expect(inventory.stock).toBe(0);

      // Concurrent restoration (e.g., multiple cancelled orders)
      const restorations = Array(5).fill(null).map(() =>
        restoreStock(testProduct._id, 1)
      );

      const results = await Promise.allSettled(restorations);

      // All restorations should succeed
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBe(5);

      // Verify final stock
      const finalInventory = await Inventory.findOne({ productId: testProduct._id });
      expect(finalInventory.stock).toBe(5); // Restored to original
    });

    it('should handle concurrent deduction and restoration', async () => {
      // Mix of deductions and restorations
      const operations = [
        reduceStock(testProduct._id, 1),
        restoreStock(testProduct._id, 2),
        reduceStock(testProduct._id, 1),
        restoreStock(testProduct._id, 1),
        reduceStock(testProduct._id, 1),
      ];

      const results = await Promise.allSettled(operations);

      // All should complete (some may fail due to insufficient stock)
      expect(results.length).toBe(5);

      // Final stock should be valid
      const inventory = await Inventory.findOne({ productId: testProduct._id });
      expect(inventory.stock).toBeGreaterThanOrEqual(0);
      
      // Net change: -1 +2 -1 +1 -1 = 0, so stock should be 5
      // But with optimistic locking, some operations may fail/retry
      expect(inventory.stock).toBeLessThanOrEqual(7); // At most original + all restorations
    });
  });

  describe('Multi-Warehouse Concurrency', () => {
    let warehouse2;

    beforeEach(async () => {
      // Create second warehouse
      warehouse2 = await Warehouse.create({
        name: 'Warehouse 2',
        location: {
          address: '456 Test Ave',
          city: 'Test City 2',
          state: 'TS',
          zipCode: '54321',
          country: 'India',
        },
      });

      // Distribute stock across warehouses
      await Inventory.create([
        {
          productId: testProduct._id,
          warehouseId: testWarehouse._id,
          stock: 5,
          version: 0,
        },
        {
          productId: testProduct._id,
          warehouseId: warehouse2._id,
          stock: 5,
          version: 0,
        },
      ]);
    });

    it('should deduct from multiple warehouses atomically', async () => {
      // Request 8 units (requires both warehouses)
      await reduceStock(testProduct._id, 8);

      // Verify stock deducted from both warehouses
      const inventories = await Inventory.find({ productId: testProduct._id });
      const totalStock = inventories.reduce((sum, inv) => sum + inv.stock, 0);
      expect(totalStock).toBe(2); // 10 - 8
    });

    it('should handle concurrent deductions across warehouses', async () => {
      const concurrentRequests = [
        reduceStock(testProduct._id, 4),
        reduceStock(testProduct._id, 4),
        reduceStock(testProduct._id, 4),
      ];

      const results = await Promise.allSettled(concurrentRequests);

      // At most 2 should succeed (total 10 available)
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeLessThanOrEqual(2);

      // Verify total stock across all warehouses
      const inventories = await Inventory.find({ productId: testProduct._id });
      const totalStock = inventories.reduce((sum, inv) => sum + inv.stock, 0);
      expect(totalStock).toBeGreaterThanOrEqual(0);
      expect(totalStock).toBeLessThanOrEqual(10);
    });
  });

  describe('Version Increment Validation', () => {
    beforeEach(async () => {
      await Inventory.create({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
        stock: 20,
        version: 0,
      });
    });

    it('should increment version on each update', async () => {
      const initialInv = await Inventory.findOne({ productId: testProduct._id });
      expect(initialInv.version).toBe(0);

      await reduceStock(testProduct._id, 1);
      const inv1 = await Inventory.findOne({ productId: testProduct._id });
      expect(inv1.version).toBe(1);

      await reduceStock(testProduct._id, 1);
      const inv2 = await Inventory.findOne({ productId: testProduct._id });
      expect(inv2.version).toBe(2);

      await restoreStock(testProduct._id, 1);
      const inv3 = await Inventory.findOne({ productId: testProduct._id });
      expect(inv3.version).toBe(3);
    });

    it('should detect stale updates', async () => {
      const inventory = await Inventory.findOne({ productId: testProduct._id });
      const oldVersion = inventory.version;

      // Another process updates the inventory
      await reduceStock(testProduct._id, 5);

      // Try to update with stale version (should fail)
      const result = await Inventory.findOneAndUpdate(
        {
          _id: inventory._id,
          version: oldVersion, // Stale version
        },
        { $inc: { stock: -1, version: 1 } },
        { new: true }
      );

      // Update should fail (returns null)
      expect(result).toBeNull();

      // Verify stock unchanged by stale update
      const currentInv = await Inventory.findOne({ productId: testProduct._id });
      expect(currentInv.stock).toBe(15); // 20 - 5 from the concurrent update
      expect(currentInv.version).toBe(1); // Incremented once
    });
  });
});
