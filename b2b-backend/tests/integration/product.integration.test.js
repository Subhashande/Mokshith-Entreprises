import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import supertest from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import Product from '../../src/modules/product/product.model.js';
import Category from '../../src/modules/category/category.model.js';
import User from '../../src/modules/user/user.model.js';
import {
  clearDatabase,
  generateTestProduct,
  generateTestUser,
} from '../helpers/testUtils.js';
import { hashPassword } from '../../src/utils/hashPassword.js';
import { ROLES } from '../../src/constants/roles.js';
import { USER_STATUS } from '../../src/constants/userStatus.js';
import { redisClient } from '../../src/config/redis.js';

const request = supertest(app);

/**
 * 🔥 PHASE 3: Product Module - Comprehensive Integration Tests
 * Tests product CRUD, validation, search, filtering, authorization
 */

describe('Product Module - Integration Tests', () => {
  let adminUser;
  let vendorUser;
  let customerUser;
  let adminToken;
  let vendorToken;
  let customerToken;
  let testCategory;

  beforeEach(async () => {
    await clearDatabase();
    await redisClient.flushdb();

    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      slug: 'test-category',
    });

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

    // Create vendor user
    vendorUser = await User.create({
      ...generateTestUser({
        email: 'vendor@test.com',
        mobile: '9876543211',
      }),
      password: hashedPassword,
      role: ROLES.VENDOR,
      status: USER_STATUS.ACTIVE,
    });

    // Create customer user
    customerUser = await User.create({
      ...generateTestUser({
        email: 'customer@test.com',
        mobile: '9876543212',
      }),
      password: hashedPassword,
      role: ROLES.B2B_CUSTOMER,
      status: USER_STATUS.ACTIVE,
    });

    // Login users to get tokens
    const adminLogin = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'admin@test.com', password: 'Admin@1234' });
    adminToken = adminLogin.body.data.accessToken;

    const vendorLogin = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'vendor@test.com', password: 'Admin@1234' });
    vendorToken = vendorLogin.body.data.accessToken;

    const customerLogin = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'customer@test.com', password: 'Admin@1234' });
    customerToken = customerLogin.body.data.accessToken;
  });

  afterEach(async () => {
    await redisClient.flushdb();
  });

  describe('POST /api/v1/products - Create Product', () => {
    it('should create a product with valid data (admin)', async () => {
      const productData = {
        name: 'New Test Product',
        description: 'A great test product',
        price: 1500,
        stock: 50,
        categoryId: testCategory._id.toString(),
        moq: 5,
      };

      const response = await request
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.name).toBe(productData.name);
      expect(response.body.data.price).toBe(productData.price);
      expect(response.body.data.stock).toBe(productData.stock);

      // Verify in database
      const savedProduct = await Product.findById(response.body.data._id);
      expect(savedProduct).toBeDefined();
      expect(savedProduct.name).toBe(productData.name);
    });

    it('should reject product creation with missing required fields', async () => {
      const invalidData = {
        description: 'Missing name and price',
      };

      const response = await request
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/required|validation/i);
    });

    it('should reject product with invalid price (zero)', async () => {
      const invalidData = {
        name: 'Invalid Price Product',
        price: 0,
        categoryId: testCategory._id.toString(),
      };

      const response = await request
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject product with negative price', async () => {
      const invalidData = {
        name: 'Negative Price Product',
        price: -100,
        categoryId: testCategory._id.toString(),
      };

      const response = await request
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject product with negative stock', async () => {
      const invalidData = {
        name: 'Negative Stock Product',
        price: 1000,
        stock: -10,
        categoryId: testCategory._id.toString(),
      };

      const response = await request
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject product with invalid category ID', async () => {
      const invalidData = {
        name: 'Invalid Category Product',
        price: 1000,
        categoryId: 'invalid-id',
      };

      const response = await request
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject product creation by non-admin user', async () => {
      const productData = {
        name: 'Unauthorized Product',
        price: 1000,
        categoryId: testCategory._id.toString(),
      };

      const response = await request
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(productData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should set default values for optional fields', async () => {
      const productData = {
        name: 'Product with Defaults',
        price: 1000,
        categoryId: testCategory._id.toString(),
      };

      const response = await request
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.data.stock).toBe(0); // Default stock
      expect(response.body.data.isActive).toBe(true); // Default active status
      expect(response.body.data.minOrderQty).toBe(1); // Default MOQ
    });
  });

  describe('GET /api/v1/products - Get Products', () => {
    beforeEach(async () => {
      // Create test products
      await Product.create([
        {
          name: 'Product 1',
          price: 100,
          stock: 10,
          categoryId: testCategory._id,
          isActive: true,
        },
        {
          name: 'Product 2',
          price: 200,
          stock: 20,
          categoryId: testCategory._id,
          isActive: true,
        },
        {
          name: 'Inactive Product',
          price: 300,
          stock: 30,
          categoryId: testCategory._id,
          isActive: false,
        },
      ]);
    });

    it('should fetch all products with pagination', async () => {
      const response = await request
        .get('/api/v1/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('products');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.products)).toBe(true);
      expect(response.body.data.products.length).toBeGreaterThan(0);
    });

    it('should filter products by category', async () => {
      const response = await request
        .get(`/api/v1/products?categoryId=${testCategory._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBeGreaterThan(0);
      response.body.data.products.forEach(product => {
        expect(product.categoryId).toBe(testCategory._id.toString());
      });
    });

    it('should search products by name', async () => {
      const response = await request
        .get('/api/v1/products?search=Product 1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBeGreaterThan(0);
      expect(response.body.data.products[0].name).toMatch(/Product 1/i);
    });

    it('should handle pagination with page and limit', async () => {
      const response = await request
        .get('/api/v1/products?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should return empty array for non-existent category', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request
        .get(`/api/v1/products?categoryId=${fakeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toEqual([]);
    });
  });

  describe('GET /api/v1/products/:id - Get Product By ID', () => {
    let testProduct;

    beforeEach(async () => {
      testProduct = await Product.create({
        name: 'Single Product',
        price: 500,
        stock: 15,
        categoryId: testCategory._id,
      });
    });

    it('should fetch a product by valid ID', async () => {
      const response = await request
        .get(`/api/v1/products/${testProduct._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testProduct._id.toString());
      expect(response.body.data.name).toBe(testProduct.name);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request
        .get(`/api/v1/products/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not found/i);
    });

    it('should return 400 for invalid ObjectId', async () => {
      const response = await request
        .get('/api/v1/products/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/products/:id - Update Product', () => {
    let testProduct;

    beforeEach(async () => {
      testProduct = await Product.create({
        name: 'Original Product',
        price: 1000,
        stock: 50,
        categoryId: testCategory._id,
        vendorId: vendorUser._id,
      });
    });

    it('should update product with valid data (admin)', async () => {
      const updateData = {
        name: 'Updated Product',
        price: 1500,
      };

      const response = await request
        .put(`/api/v1/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.price).toBe(updateData.price);

      // Verify in database
      const updated = await Product.findById(testProduct._id);
      expect(updated.name).toBe(updateData.name);
      expect(updated.price).toBe(updateData.price);
    });

    it('should allow partial updates', async () => {
      const updateData = {
        price: 2000,
      };

      const response = await request
        .put(`/api/v1/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.price).toBe(2000);
      expect(response.body.data.name).toBe(testProduct.name); // Unchanged
    });

    it('should reject update with invalid price', async () => {
      const updateData = {
        price: -100,
      };

      const response = await request
        .put(`/api/v1/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject update for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = {
        name: 'Updated Name',
      };

      const response = await request
        .put(`/api/v1/products/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should prevent unauthorized user from updating', async () => {
      const updateData = {
        name: 'Unauthorized Update',
      };

      const response = await request
        .put(`/api/v1/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/products/:id - Delete Product', () => {
    let testProduct;

    beforeEach(async () => {
      testProduct = await Product.create({
        name: 'To Be Deleted',
        price: 1000,
        stock: 50,
        categoryId: testCategory._id,
      });
    });

    it('should delete product by admin', async () => {
      const response = await request
        .delete(`/api/v1/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const deleted = await Product.findById(testProduct._id);
      expect(deleted).toBeNull();
    });

    it('should reject deletion for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request
        .delete(`/api/v1/products/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should prevent unauthorized user from deleting', async () => {
      const response = await request
        .delete(`/api/v1/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);

      // Verify product still exists
      const stillExists = await Product.findById(testProduct._id);
      expect(stillExists).toBeDefined();
    });
  });

  describe('Product Validation Edge Cases', () => {
    it('should sanitize product name (trim whitespace)', async () => {
      const productData = {
        name: '   Whitespace Product   ',
        price: 1000,
        categoryId: testCategory._id.toString(),
      };

      const response = await request
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.data.name).toBe('Whitespace Product');
    });

    it('should handle very long product descriptions', async () => {
      const longDescription = 'A'.repeat(5000);
      const productData = {
        name: 'Long Description Product',
        description: longDescription,
        price: 1000,
        categoryId: testCategory._id.toString(),
      };

      const response = await request
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.data.description).toBe(longDescription);
    });

    it('should handle bulk pricing arrays', async () => {
      const productData = {
        name: 'Bulk Pricing Product',
        price: 1000,
        categoryId: testCategory._id.toString(),
        bulkPricing: [
          { minQuantity: 10, price: 900 },
          { minQuantity: 50, price: 800 },
          { minQuantity: 100, price: 700 },
        ],
      };

      const response = await request
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.data.bulkPricing).toHaveLength(3);
      expect(response.body.data.bulkPricing[0].minQuantity).toBe(10);
    });

    it('should handle product variants', async () => {
      const productData = {
        name: 'Variant Product',
        price: 1000,
        categoryId: testCategory._id.toString(),
        variants: [
          { name: 'Size', value: 'Small', additionalPrice: 0, stock: 10 },
          { name: 'Size', value: 'Large', additionalPrice: 100, stock: 5 },
        ],
      };

      const response = await request
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.data.variants).toHaveLength(2);
    });
  });

  describe('Product Stock Management', () => {
    let testProduct;

    beforeEach(async () => {
      testProduct = await Product.create({
        name: 'Stock Test Product',
        price: 1000,
        stock: 100,
        categoryId: testCategory._id,
      });
    });

    it('should update stock via dedicated endpoint', async () => {
      const response = await request
        .patch(`/api/v1/products/${testProduct._id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stock: 150 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stock).toBe(150);
    });

    it('should reject negative stock updates', async () => {
      const response = await request
        .patch(`/api/v1/products/${testProduct._id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stock: -10 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Product Status Management', () => {
    let testProduct;

    beforeEach(async () => {
      testProduct = await Product.create({
        name: 'Status Test Product',
        price: 1000,
        stock: 100,
        categoryId: testCategory._id,
        isActive: true,
      });
    });

    it('should toggle product active status', async () => {
      const response = await request
        .patch(`/api/v1/products/${testProduct._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });
  });
});
