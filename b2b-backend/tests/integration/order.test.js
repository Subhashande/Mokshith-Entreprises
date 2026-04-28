import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import { env } from '../../src/config/env.js';
import User from '../../src/modules/user/user.model.js';
import Product from '../../src/modules/product/product.model.js';
import Order from '../../src/modules/order/order.model.js';

describe('Order API - Integration Tests', () => {
  let authToken;
  let testUser;
  let testProduct;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGO_URI || 'mongodb://localhost:27017/b2b-test');
    }

    // Create test user
    testUser = await User.create({
      name: 'Test Order User',
      email: 'order-test@test.com',
      password: 'Test123!',
      role: 'B2C_CUSTOMER',
      status: 'active'
    });

    // Login to get token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'order-test@test.com',
        password: 'Test123!'
      });
    
    authToken = response.body.token;

    // Create test product
    testProduct = await Product.create({
      name: 'Test Product',
      price: 100,
      stock: 50,
      category: new mongoose.Types.ObjectId(),
      description: 'Test product for orders',
      status: 'active'
    });
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteOne({ email: 'order-test@test.com' });
    await Product.deleteOne({ _id: testProduct._id });
    await Order.deleteMany({ userId: testUser._id });
    await mongoose.connection.close();
  });

  describe('POST /api/order', () => {
    it('should create order successfully', async () => {
      const response = await request(app)
        .post('/api/order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              productId: testProduct._id,
              quantity: 2,
              price: testProduct.price
            }
          ],
          shippingAddress: {
            name: 'Test User',
            phone: '1234567890',
            addressLine: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            pincode: '123456'
          },
          paymentMethod: 'ONLINE'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.status).toBe('PENDING');
    });

    it('should reject order with insufficient stock', async () => {
      const response = await request(app)
        .post('/api/order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              productId: testProduct._id,
              quantity: 1000, // More than available stock
              price: testProduct.price
            }
          ],
          shippingAddress: {
            name: 'Test User',
            phone: '1234567890',
            addressLine: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            pincode: '123456'
          }
        });

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/order')
        .send({
          items: []
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/order', () => {
    it('should get user orders', async () => {
      const response = await request(app)
        .get('/api/order')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/order');

      expect(response.status).toBe(401);
    });
  });
});
  });
});