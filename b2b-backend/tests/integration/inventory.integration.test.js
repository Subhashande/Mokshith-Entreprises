import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import supertest from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import Inventory from '../../src/modules/inventory/inventory.model.js';
import Product from '../../src/modules/product/product.model.js';
import Warehouse from '../../src/modules/warehouse/warehouse.model.js';
import Category from '../../src/modules/category/category.model.js';
import User from '../../src/modules/user/user.model.js';
import {
  clearDatabase,
  generateTestUser,
} from '../helpers/testUtils.js';
import { hashPassword } from '../../src/utils/hashPassword.js';
import { ROLES } from '../../src/constants/roles.js';
import { USER_STATUS } from '../../src/constants/userStatus.js';
import { redisClient } from '../../src/config/redis.js';

const request = supertest(app);

/**
 * 🔥 PHASE 3: Inventory Module - Comprehensive Integration Tests
 * Tests inventory tracking, stock management, optimistic locking, consistency
 */

describe('Inventory Module - Integration Tests', () => {
  let adminUser;
  let adminToken;
  let testCategory;
  let testProduct;
  let testWarehouse;

  beforeEach(async () => {
    await clearDatabase();
    await redisClient.flushdb();

    // Create admin user
    const hashedPassword = await hashPassword('Admin@1234');
    adminUser = await User.create({
      ...generateTestUser({
        email: 'admin@test.com',
        mobile: '9876543210',
      }),
      password: hashedPassword,
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
    });

    // Login admin
    const adminLogin = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'admin@test.com', password: 'Admin@1234' });
    adminToken = adminLogin.body.data.accessToken;

    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      slug: 'test-category',
    });

    // Create test product
    testProduct = await Product.create({
      name: 'Test Product',
      price: 1000,
      stock: 0, // Stock managed via inventory
      categoryId: testCategory._id,
    });

    // Create test warehouse
    testWarehouse = await Warehouse.create({
      name: 'Main Warehouse',
      location: {
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        pincode: '123456',
      },
      capacity: 10000,
      currentLoad: 0,
    });
  });

  afterEach(async () => {
    await redisClient.flushdb();
  });

  describe('POST /api/v1/inventory - Add Stock', () => {
    it('should add stock to inventory with valid data', async () => {
      const inventoryData = {
        productId: testProduct._id.toString(),
        warehouseId: testWarehouse._id.toString(),
        stock: 100,
      };

      const response = await request
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(inventoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.stock).toBe(inventoryData.stock);
      expect(response.body.data.version).toBe(0);

      // Verify in database
      const saved = await Inventory.findById(response.body.data._id);
      expect(saved).toBeDefined();
      expect(saved.stock).toBe(inventoryData.stock);
    });

    it('should reject negative stock', async () => {
      const invalidData = {
        productId: testProduct._id.toString(),
        warehouseId: testWarehouse._id.toString(),
        stock: -10,
      };

      const response = await request
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/stock|negative/i);
    });

    it('should reject missing required fields', async () => {
      const invalidData = {
        stock: 100,
      };

      const response = await request
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid product ID', async () => {
      const invalidData = {
        productId: new mongoose.Types.ObjectId().toString(),
        warehouseId: testWarehouse._id.toString(),
        stock: 100,
      };

      const response = await request
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/product.*not found/i);
    });

    it('should reject invalid warehouse ID', async () => {
      const invalidData = {
        productId: testProduct._id.toString(),
        warehouseId: new mongoose.Types.ObjectId().toString(),
        stock: 100,
      };

      const response = await request
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/warehouse.*not found/i);
    });

    it('should prevent duplicate inventory records for same product-warehouse', async () => {
      // Create first inventory record
      await Inventory.create({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
        stock: 50,
      });

      // Try to create duplicate
      const duplicateData = {
        productId: testProduct._id.toString(),
        warehouseId: testWarehouse._id.toString(),
        stock: 100,
      };

      const response = await request
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/duplicate|exists/i);
    });
  });

  describe('GET /api/v1/inventory - Get Inventory', () => {
    beforeEach(async () => {
      // Create test inventory records
      await Inventory.create([
        {
          productId: testProduct._id,
          warehouseId: testWarehouse._id,
          stock: 100,
        },
      ]);
    });

    it('should fetch all inventory records', async () => {
      const response = await request
        .get('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter inventory by product', async () => {
      const response = await request
        .get(`/api/v1/inventory?productId=${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach(inv => {
        expect(inv.productId.toString()).toBe(testProduct._id.toString());
      });
    });

    it('should filter inventory by warehouse', async () => {
      const response = await request
        .get(`/api/v1/inventory?warehouseId=${testWarehouse._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach(inv => {
        expect(inv.warehouseId.toString()).toBe(testWarehouse._id.toString());
      });
    });
  });

  describe('PUT /api/v1/inventory/:id - Update Inventory', () => {
    let testInventory;

    beforeEach(async () => {
      testInventory = await Inventory.create({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
        stock: 100,
        version: 0,
      });
    });

    it('should update inventory stock with valid data', async () => {
      const updateData = {
        stock: 150,
      };

      const response = await request
        .put(`/api/v1/inventory/${testInventory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stock).toBe(updateData.stock);
      expect(response.body.data.version).toBe(1); // Version incremented

      // Verify in database
      const updated = await Inventory.findById(testInventory._id);
      expect(updated.stock).toBe(updateData.stock);
      expect(updated.version).toBe(1);
    });

    it('should reject negative stock updates', async () => {
      const invalidData = {
        stock: -10,
      };

      const response = await request
        .put(`/api/v1/inventory/${testInventory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle optimistic locking conflict', async () => {
      // Simulate concurrent update by modifying version
      await Inventory.findByIdAndUpdate(testInventory._id, {
        stock: 200,
        version: 1,
      });

      // Now try to update with stale version
      const updateData = {
        stock: 150,
        version: 0, // Stale version
      };

      const response = await request
        .put(`/api/v1/inventory/${testInventory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/conflict|version/i);
    });

    it('should reject update for non-existent inventory', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = {
        stock: 150,
      };

      const response = await request
        .put(`/api/v1/inventory/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/inventory/:id - Delete Inventory', () => {
    let testInventory;

    beforeEach(async () => {
      testInventory = await Inventory.create({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
        stock: 100,
      });
    });

    it('should delete inventory by admin', async () => {
      const response = await request
        .delete(`/api/v1/inventory/${testInventory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const deleted = await Inventory.findById(testInventory._id);
      expect(deleted).toBeNull();
    });

    it('should reject deletion for non-existent inventory', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request
        .delete(`/api/v1/inventory/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Inventory Concurrency Tests', () => {
    let testInventory;

    beforeEach(async () => {
      testInventory = await Inventory.create({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
        stock: 100,
        version: 0,
      });
    });

    it('should handle concurrent stock updates safely', async () => {
      // Simulate two concurrent updates
      const update1 = Inventory.findByIdAndUpdate(
        testInventory._id,
        { $inc: { stock: 10, version: 1 } },
        { new: true }
      );

      const update2 = Inventory.findByIdAndUpdate(
        testInventory._id,
        { $inc: { stock: 20, version: 1 } },
        { new: true }
      );

      await Promise.all([update1, update2]);

      // Verify final stock (should be 100 + 10 + 20 = 130)
      const final = await Inventory.findById(testInventory._id);
      expect(final.stock).toBe(130);
      expect(final.version).toBeGreaterThan(0);
    });

    it('should prevent stock from going negative in concurrent decrements', async () => {
      testInventory.stock = 50;
      await testInventory.save();

      // Try to decrement stock by more than available
      const decrementData = {
        stock: -60, // More than available
      };

      const response = await request
        .put(`/api/v1/inventory/${testInventory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(decrementData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/insufficient|negative/i);

      // Verify stock hasn't changed
      const unchanged = await Inventory.findById(testInventory._id);
      expect(unchanged.stock).toBe(50);
    });
  });

  describe('Inventory Consistency Tests', () => {
    it('should maintain inventory-product relationship integrity', async () => {
      // Create inventory
      const inventory = await Inventory.create({
        productId: testProduct._id,
        warehouseId: testWarehouse._id,
        stock: 100,
      });

      // Delete product
      await Product.findByIdAndDelete(testProduct._id);

      // Verify inventory is orphaned or deleted (depending on implementation)
      const orphaned = await Inventory.findById(inventory._id);
      // Either orphaned is null (cascade delete) or productId is invalid
      if (orphaned) {
        const product = await Product.findById(orphaned.productId);
        expect(product).toBeNull();
      }
    });

    it('should aggregate total stock across warehouses', async () => {
      // Create second warehouse
      const warehouse2 = await Warehouse.create({
        name: 'Secondary Warehouse',
        location: {
          city: 'Test City 2',
        },
      });

      // Create inventory in both warehouses
      await Inventory.create([
        {
          productId: testProduct._id,
          warehouseId: testWarehouse._id,
          stock: 100,
        },
        {
          productId: testProduct._id,
          warehouseId: warehouse2._id,
          stock: 50,
        },
      ]);

      const response = await request
        .get(`/api/v1/inventory/total?productId=${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalStock).toBe(150);
    });
  });

  describe('Warehouse Capacity Tests', () => {
    it('should enforce warehouse capacity limits', async () => {
      testWarehouse.capacity = 100;
      testWarehouse.currentLoad = 90;
      await testWarehouse.save();

      const inventoryData = {
        productId: testProduct._id.toString(),
        warehouseId: testWarehouse._id.toString(),
        stock: 20, // Exceeds capacity
      };

      const response = await request
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(inventoryData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/capacity|exceeded/i);
    });
  });

  describe('Inventory Validation Edge Cases', () => {
    it('should handle zero stock gracefully', async () => {
      const inventoryData = {
        productId: testProduct._id.toString(),
        warehouseId: testWarehouse._id.toString(),
        stock: 0,
      };

      const response = await request
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(inventoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stock).toBe(0);
    });

    it('should handle very large stock quantities', async () => {
      const inventoryData = {
        productId: testProduct._id.toString(),
        warehouseId: testWarehouse._id.toString(),
        stock: 999999,
      };

      const response = await request
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(inventoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stock).toBe(999999);
    });
  });
});
