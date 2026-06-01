import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import supertest from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import Category from '../../src/modules/category/category.model.js';
import Product from '../../src/modules/product/product.model.js';
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
 * 🔥 PHASE 3: Category Module - Comprehensive Integration Tests
 * Tests category CRUD, hierarchy, validation, and orphan handling
 */

describe('Category Module - Integration Tests', () => {
  let adminUser;
  let customerUser;
  let adminToken;
  let customerToken;

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

    // Create customer user
    customerUser = await User.create({
      ...generateTestUser({
        email: 'customer@test.com',
        mobile: '9876543211',
      }),
      password: hashedPassword,
      role: ROLES.B2B_CUSTOMER,
      status: USER_STATUS.ACTIVE,
    });

    // Login users
    const adminLogin = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'admin@test.com', password: 'Admin@1234' });
    adminToken = adminLogin.body.data.accessToken;

    const customerLogin = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'customer@test.com', password: 'Admin@1234' });
    customerToken = customerLogin.body.data.accessToken;
  });

  afterEach(async () => {
    await redisClient.flushdb();
  });

  describe('POST /api/v1/categories - Create Category', () => {
    it('should create a category with valid data (admin)', async () => {
      const categoryData = {
        name: 'Electronics',
      };

      const response = await request
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.name).toBe(categoryData.name);
      expect(response.body.data.isActive).toBe(true);

      // Verify in database
      const saved = await Category.findById(response.body.data._id);
      expect(saved).toBeDefined();
      expect(saved.name).toBe(categoryData.name);
    });

    it('should create nested category with valid parent', async () => {
      // Create parent category
      const parent = await Category.create({
        name: 'Electronics',
        slug: 'electronics',
      });

      const subcategoryData = {
        name: 'Laptops',
        parentId: parent._id.toString(),
      };

      const response = await request
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(subcategoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(subcategoryData.name);
      expect(response.body.data.parentId).toBe(parent._id.toString());
    });

    it('should reject category creation with missing name', async () => {
      const invalidData = {};

      const response = await request
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/required|validation/i);
    });

    it('should reject duplicate category name at same level', async () => {
      // Create first category
      await Category.create({
        name: 'Electronics',
        slug: 'electronics',
        parentId: null,
      });

      // Try to create duplicate
      const duplicateData = {
        name: 'Electronics',
      };

      const response = await request
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/duplicate|exists/i);
    });

    it('should reject category with invalid parent ID', async () => {
      const invalidData = {
        name: 'Subcategory',
        parentId: new mongoose.Types.ObjectId().toString(),
      };

      const response = await request
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject category creation by non-admin', async () => {
      const categoryData = {
        name: 'Unauthorized Category',
      };

      const response = await request
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(categoryData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should trim whitespace from category name', async () => {
      const categoryData = {
        name: '  Trimmed Category  ',
      };

      const response = await request
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData)
        .expect(201);

      expect(response.body.data.name).toBe('Trimmed Category');
    });
  });

  describe('GET /api/v1/categories - Get Categories', () => {
    beforeEach(async () => {
      // Create test categories
      await Category.create([
        { name: 'Electronics', slug: 'electronics', isActive: true },
        { name: 'Clothing', slug: 'clothing', isActive: true },
        { name: 'Inactive Category', slug: 'inactive', isActive: false },
      ]);
    });

    it('should fetch all categories', async () => {
      const response = await request
        .get('/api/v1/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should include inactive categories in results', async () => {
      const response = await request
        .get('/api/v1/categories')
        .expect(200);

      const categories = response.body.data;
      const inactiveCategory = categories.find(c => c.name === 'Inactive Category');
      expect(inactiveCategory).toBeDefined();
    });
  });

  describe('GET /api/v1/categories/:id - Get Category By ID', () => {
    let testCategory;

    beforeEach(async () => {
      testCategory = await Category.create({
        name: 'Single Category',
        slug: 'single-category',
      });
    });

    it('should fetch category by valid ID', async () => {
      const response = await request
        .get(`/api/v1/categories/${testCategory._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testCategory._id.toString());
      expect(response.body.data.name).toBe(testCategory.name);
    });

    it('should return 404 for non-existent category', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request
        .get(`/api/v1/categories/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not found/i);
    });

    it('should return 400 for invalid ObjectId', async () => {
      const response = await request
        .get('/api/v1/categories/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/categories/:id - Update Category', () => {
    let testCategory;

    beforeEach(async () => {
      testCategory = await Category.create({
        name: 'Original Category',
        slug: 'original-category',
      });
    });

    it('should update category with valid data (admin)', async () => {
      const updateData = {
        name: 'Updated Category',
      };

      const response = await request
        .put(`/api/v1/categories/${testCategory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);

      // Verify in database
      const updated = await Category.findById(testCategory._id);
      expect(updated.name).toBe(updateData.name);
    });

    it('should allow partial updates', async () => {
      const updateData = {
        isActive: false,
      };

      const response = await request
        .put(`/api/v1/categories/${testCategory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
      expect(response.body.data.name).toBe(testCategory.name); // Unchanged
    });

    it('should reject update for non-existent category', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = {
        name: 'Updated Name',
      };

      const response = await request
        .put(`/api/v1/categories/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should prevent unauthorized update', async () => {
      const updateData = {
        name: 'Unauthorized Update',
      };

      const response = await request
        .put(`/api/v1/categories/${testCategory._id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/categories/:id - Delete Category', () => {
    let testCategory;

    beforeEach(async () => {
      testCategory = await Category.create({
        name: 'To Be Deleted',
        slug: 'to-be-deleted',
      });
    });

    it('should delete category by admin', async () => {
      const response = await request
        .delete(`/api/v1/categories/${testCategory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const deleted = await Category.findById(testCategory._id);
      expect(deleted).toBeNull();
    });

    it('should handle deletion of category with products', async () => {
      // Create product linked to category
      await Product.create({
        name: 'Linked Product',
        price: 1000,
        categoryId: testCategory._id,
      });

      // Attempt to delete category
      const response = await request
        .delete(`/api/v1/categories/${testCategory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/products|linked/i);
    });

    it('should reject deletion for non-existent category', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request
        .delete(`/api/v1/categories/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should prevent unauthorized deletion', async () => {
      const response = await request
        .delete(`/api/v1/categories/${testCategory._id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);

      // Verify category still exists
      const stillExists = await Category.findById(testCategory._id);
      expect(stillExists).toBeDefined();
    });
  });

  describe('Category Hierarchy Tests', () => {
    let parentCategory;
    let childCategory;
    let grandchildCategory;

    beforeEach(async () => {
      // Create category hierarchy
      parentCategory = await Category.create({
        name: 'Electronics',
        slug: 'electronics',
        parentId: null,
      });

      childCategory = await Category.create({
        name: 'Computers',
        slug: 'computers',
        parentId: parentCategory._id,
      });

      grandchildCategory = await Category.create({
        name: 'Laptops',
        slug: 'laptops',
        parentId: childCategory._id,
      });
    });

    it('should fetch subcategories of parent category', async () => {
      const response = await request
        .get(`/api/v1/categories/${parentCategory._id}/subcategories`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should handle nested category deletion', async () => {
      // Delete child category
      await request
        .delete(`/api/v1/categories/${childCategory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify grandchild is orphaned or deleted
      const grandchild = await Category.findById(grandchildCategory._id);
      if (grandchild) {
        // If orphaned, parent should be null
        expect(grandchild.parentId).toBeNull();
      }
    });
  });

  describe('Category Slug Generation', () => {
    it('should auto-generate slug from name', async () => {
      const categoryData = {
        name: 'Home & Garden',
      };

      const response = await request
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData)
        .expect(201);

      expect(response.body.data.slug).toBeDefined();
      expect(response.body.data.slug).toMatch(/home.*garden/i);
    });
  });
});
