import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import { env } from '../../src/config/env.js';
import User from '../../src/modules/user/user.model.js';
import Order from '../../src/modules/order/order.model.js';

describe('Payment API - Integration Tests', () => {
  let authToken;
  let testUser;
  let testOrder;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGO_URI || 'mongodb://localhost:27017/b2b-test');
    }

    // Create test user
    testUser = await User.create({
      name: 'Test Payment User',
      email: 'payment-test@test.com',
      password: 'Test123!',
      role: 'B2C_CUSTOMER',
      status: 'active'
    });

    // Generate token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'payment-test@test.com',
        password: 'Test123!'
      });
    
    authToken = response.body.token;

    // Create test order
    testOrder = await Order.create({
      userId: testUser._id,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: 'Test Product',
          quantity: 2,
          price: 100
        }
      ],
      totalAmount: 200,
      paymentStatus: 'PENDING',
      status: 'PENDING'
    });
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteOne({ email: 'payment-test@test.com' });
    await Order.deleteMany({ userId: testUser._id });
    await mongoose.connection.close();
  });

  describe('POST /api/payment/create-order', () => {
    it('should create Razorpay order successfully', async () => {
      const response = await request(app)
        .post('/api/payment/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 200
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('gatewayOrderId');
      expect(response.body.data.amount).toBe(200);
    });

    it('should reject amount below minimum', async () => {
      const response = await request(app)
        .post('/api/payment/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 0.5
        });

      expect(response.status).toBe(400);
    });

    it('should reject unauthorized request', async () => {
      const response = await request(app)
        .post('/api/payment/create-order')
        .send({
          amount: 200
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/payment/verify', () => {
    it('should reject invalid signature', async () => {
      const response = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id,
          razorpay_order_id: 'invalid',
          razorpay_payment_id: 'invalid',
          razorpay_signature: 'invalid'
        });

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/payment/verify')
        .send({
          orderId: testOrder._id
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce payment rate limiting', async () => {
      const requests = [];
      
      // Make 12 requests (limit is 10)
      for (let i = 0; i < 12; i++) {
        requests.push(
          request(app)
            .post('/api/payment/create-order')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ amount: 100 })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    }, 30000);
  });
});
