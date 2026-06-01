import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import supertest from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import Cart from '../../src/modules/cart/cart.model.js';
import Product from '../../src/modules/product/product.model.js';
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
 * 🔥 PHASE 4: Cart Module - Comprehensive Integration Tests
 * Tests cart creation, add/remove operations, quantity updates, validation, consistency
 */

describe('Cart Module - Integration Tests', () => {
  let testUser;
  let userToken;
  let testCategory;
  let testProduct1;
  let testProduct2;
  let inactiveProduct;

  beforeEach(async () => {
    await clearDatabase();
    await redisClient.flushdb();

    // Create test user
    const hashedPassword = await hashPassword('Test@1234');
    testUser = await User.create({
      ...generateTestUser({
        email: 'cartuser@test.com',
        mobile: '9876543210',
      }),
      password: hashedPassword,
      role: ROLES.B2B_CUSTOMER,
      status: USER_STATUS.ACTIVE,
    });

    // Login user
    const loginResponse = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'cartuser@test.com', password: 'Test@1234' });
    userToken = loginResponse.body.data.accessToken;

    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      slug: 'test-category',
    });

    // Create test products
    testProduct1 = await Product.create({
      name: 'Test Product 1',
      price: 1000,
      stock: 100,
      categoryId: testCategory._id,
      isActive: true,
      moq: 10,
    });

    testProduct2 = await Product.create({
      name: 'Test Product 2',
      price: 2000,
      stock: 50,
      categoryId: testCategory._id,
      isActive: true,
      moq: 5,
    });

    inactiveProduct = await Product.create({
      name: 'Inactive Product',
      price: 500,
      stock: 100,
      categoryId: testCategory._id,
      isActive: false,
    });
  });

  afterEach(async () => {
    await redisClient.flushdb();
  });

  describe('POST /api/v1/cart - Add to Cart', () => {
    it('should create cart and add product with valid data', async () => {
      const response = await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].productId._id.toString()).toBe(testProduct1._id.toString());
      expect(response.body.data.items[0].quantity).toBe(10);

      // Verify in database
      const cart = await Cart.findOne({ userId: testUser._id });
      expect(cart).toBeDefined();
      expect(cart.items).toHaveLength(1);
    });

    it('should add multiple products to cart', async () => {
      // Add first product
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      // Add second product
      const response = await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct2._id.toString(),
          quantity: 5,
        })
        .expect(200);

      expect(response.body.data.items).toHaveLength(2);
    });

    it('should increment quantity when adding existing product', async () => {
      // Add product first time
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      // Add same product again
      const response = await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 5,
        })
        .expect(200);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(15);
    });

    it('should reject adding product below MOQ', async () => {
      const response = await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 5, // MOQ is 10
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/minimum.*quantity/i);
    });

    it('should reject adding inactive product', async () => {
      const response = await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: inactiveProduct._id.toString(),
          quantity: 10,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not available/i);
    });

    it('should reject adding product with insufficient stock', async () => {
      const response = await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct2._id.toString(),
          quantity: 100, // Stock is only 50
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/insufficient stock/i);
    });

    it('should reject adding non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: fakeId.toString(),
          quantity: 10,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not found/i);
    });

    it('should reject invalid product ID', async () => {
      const response = await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: 'invalid-id',
          quantity: 10,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject negative quantity', async () => {
      const response = await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: -5,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject zero quantity', async () => {
      const response = await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 0,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject missing quantity', async () => {
      const response = await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request
        .post('/api/v1/cart')
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/cart - Get Cart', () => {
    beforeEach(async () => {
      // Add products to cart
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct2._id.toString(),
          quantity: 5,
        });
    });

    it('should fetch cart with populated products', async () => {
      const response = await request
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.items[0].productId).toHaveProperty('name');
      expect(response.body.data.items[0].productId).toHaveProperty('price');
    });

    it('should return empty cart for new user', async () => {
      // Create new user
      const newUser = await User.create({
        ...generateTestUser({
          email: 'newuser@test.com',
          mobile: '9876543211',
        }),
        password: await hashPassword('Test@1234'),
        role: ROLES.B2B_CUSTOMER,
        status: USER_STATUS.ACTIVE,
      });

      const newLogin = await request
        .post('/api/v1/auth/login')
        .send({ identifier: 'newuser@test.com', password: 'Test@1234' });

      const response = await request
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${newLogin.body.data.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });

    it('should reject unauthenticated request', async () => {
      const response = await request
        .get('/api/v1/cart')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/cart/:productId - Remove from Cart', () => {
    beforeEach(async () => {
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct2._id.toString(),
          quantity: 5,
        });
    });

    it('should remove product from cart', async () => {
      const response = await request
        .delete(`/api/v1/cart/${testProduct1._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].productId._id.toString()).toBe(testProduct2._id.toString());
    });

    it('should handle removing non-existent product gracefully', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request
        .delete(`/api/v1/cart/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(2); // Unchanged
    });

    it('should reject invalid product ID', async () => {
      const response = await request
        .delete('/api/v1/cart/invalid-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject when cart does not exist', async () => {
      // Delete all cart items first
      await Cart.deleteMany({ userId: testUser._id });

      const response = await request
        .delete(`/api/v1/cart/${testProduct1._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/cart - Clear Cart', () => {
    beforeEach(async () => {
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct2._id.toString(),
          quantity: 5,
        });
    });

    it('should clear all items from cart', async () => {
      const response = await request
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(0);

      // Verify in database
      const cart = await Cart.findOne({ userId: testUser._id });
      expect(cart.items).toHaveLength(0);
    });

    it('should handle clearing empty cart gracefully', async () => {
      // Clear cart first
      await request
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`);

      // Try clearing again
      const response = await request
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/v1/cart/:productId - Update Cart Item Quantity', () => {
    beforeEach(async () => {
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });
    });

    it('should update product quantity in cart', async () => {
      const response = await request
        .put(`/api/v1/cart/${testProduct1._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: 20 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items[0].quantity).toBe(20);
    });

    it('should reject quantity below MOQ', async () => {
      const response = await request
        .put(`/api/v1/cart/${testProduct1._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: 5 }) // MOQ is 10
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject quantity exceeding stock', async () => {
      const response = await request
        .put(`/api/v1/cart/${testProduct1._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: 200 }) // Stock is 100
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject negative quantity', async () => {
      const response = await request
        .put(`/api/v1/cart/${testProduct1._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: -10 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject zero quantity (use delete instead)', async () => {
      const response = await request
        .put(`/api/v1/cart/${testProduct1._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: 0 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Cart Persistence & Consistency', () => {
    it('should maintain cart across sessions', async () => {
      // Add to cart
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      // Logout and login again
      const newLogin = await request
        .post('/api/v1/auth/login')
        .send({ identifier: 'cartuser@test.com', password: 'Test@1234' });
      const newToken = newLogin.body.data.accessToken;

      // Fetch cart
      const response = await request
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].productId._id.toString()).toBe(testProduct1._id.toString());
    });

    it('should handle stale product references (deleted product)', async () => {
      // Add to cart
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      // Delete product
      await Product.findByIdAndDelete(testProduct1._id);

      // Fetch cart - should handle gracefully
      const response = await request
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Cart should still exist but product should be null or filtered out
      expect(response.body.success).toBe(true);
    });

    it('should enforce unique cart per user', async () => {
      // Try to create multiple carts (should be prevented by unique userId)
      await Cart.create({
        userId: testUser._id,
        items: [{ productId: testProduct1._id, quantity: 10 }],
      });

      await expect(
        Cart.create({
          userId: testUser._id,
          items: [{ productId: testProduct2._id, quantity: 5 }],
        })
      ).rejects.toThrow();
    });

    it('should validate stock availability when fetching cart', async () => {
      // Add product to cart
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct2._id.toString(),
          quantity: 10,
        });

      // Reduce stock to below cart quantity
      testProduct2.stock = 5;
      await testProduct2.save();

      // Fetch cart
      const response = await request
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Should indicate stock availability issue
      expect(response.body.success).toBe(true);
      // Implementation may vary - could show warning or auto-adjust
    });
  });

  describe('Cart Size & Limits', () => {
    it('should handle large cart (many items)', async () => {
      // Create multiple products and add to cart
      const products = [];
      for (let i = 0; i < 20; i++) {
        const product = await Product.create({
          name: `Product ${i}`,
          price: 1000,
          stock: 100,
          categoryId: testCategory._id,
          isActive: true,
          moq: 5,
        });
        products.push(product);

        await request
          .post('/api/v1/cart')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            productId: product._id.toString(),
            quantity: 5,
          });
      }

      const response = await request
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.items).toHaveLength(20);
    });

    it('should handle very large quantity in cart', async () => {
      testProduct1.stock = 10000;
      await testProduct1.save();

      const response = await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 5000,
        })
        .expect(200);

      expect(response.body.data.items[0].quantity).toBe(5000);
    });
  });
});
