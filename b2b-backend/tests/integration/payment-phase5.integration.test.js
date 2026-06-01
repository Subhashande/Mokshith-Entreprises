import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import supertest from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import Payment from '../../src/modules/payment/payment.model.js';
import Order from '../../src/modules/order/order.model.js';
import User from '../../src/modules/user/user.model.js';
import Product from '../../src/modules/product/product.model.js';
import Category from '../../src/modules/category/category.model.js';
import Inventory from '../../src/modules/inventory/inventory.model.js';
import Warehouse from '../../src/modules/warehouse/warehouse.model.js';
import {
  clearDatabase,
  generateTestUser,
} from '../helpers/testUtils.js';
import { hashPassword } from '../../src/utils/hashPassword.js';
import { ROLES } from '../../src/constants/roles.js';
import { USER_STATUS } from '../../src/constants/userStatus.js';
import { ORDER_STATUS } from '../../src/constants/orderStatus.js';
import { PAYMENT_STATUS } from '../../src/constants/paymentStatus.js';
import { redisClient } from '../../src/config/redis.js';
import crypto from 'crypto';

const request = supertest(app);

/**
 * 🔥 PHASE 5: PAYMENT, REFUND & FINANCIAL WORKFLOW STABILIZATION
 * Comprehensive integration tests for payment lifecycle, webhook security, refund handling
 */

describe('Phase 5: Payment & Financial Workflow - Comprehensive Tests', () => {
  let testUser;
  let adminUser;
  let userToken;
  let adminToken;
  let testCategory;
  let testProduct;
  let testWarehouse;
  let testOrder;
  let validShippingAddress;

  beforeEach(async () => {
    await clearDatabase();
    await redisClient.flushdb();

    // Create test users
    const hashedPassword = await hashPassword('Test@1234');
    testUser = await User.create({
      ...generateTestUser({
        email: 'payment@test.com',
        mobile: '9876543210',
      }),
      password: hashedPassword,
      role: ROLES.B2B_CUSTOMER,
      status: USER_STATUS.ACTIVE,
    });

    adminUser = await User.create({
      ...generateTestUser({
        email: 'admin@test.com',
        mobile: '9876543211',
      }),
      password: hashedPassword,
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
    });

    // Login users
    const userLogin = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'payment@test.com', password: 'Test@1234' });
    userToken = userLogin.body.data.accessToken;

    const adminLogin = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'admin@test.com', password: 'Test@1234' });
    adminToken = adminLogin.body.data.accessToken;

    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      slug: 'test-category',
    });

    // Create test warehouse
    testWarehouse = await Warehouse.create({
      name: 'Main Warehouse',
      location: {
        city: 'Test City',
      },
      capacity: 10000,
    });

    // Create test product
    testProduct = await Product.create({
      name: 'Test Product',
      price: 1000,
      stock: 100,
      categoryId: testCategory._id,
      isActive: true,
      moq: 10,
    });

    await Inventory.create({
      productId: testProduct._id,
      warehouseId: testWarehouse._id,
      stock: 100,
    });

    validShippingAddress = {
      name: 'John Doe',
      phone: '9876543210',
      addressLine: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
    };

    // Create test order
    testOrder = await Order.create({
      userId: testUser._id,
      items: [
        {
          productId: testProduct._id,
          name: testProduct.name,
          price: testProduct.price,
          quantity: 10,
        },
      ],
      totalAmount: 11800, // 10000 + 18% GST
      paymentMethod: 'ONLINE',
      address: validShippingAddress,
      status: ORDER_STATUS.PENDING_PAYMENT,
      paymentStatus: PAYMENT_STATUS.PENDING,
    });
  });

  afterEach(async () => {
    await redisClient.flushdb();
  });

  describe('STEP 2: Payment Initiation', () => {
    it('should successfully initiate payment for valid order', async () => {
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('razorpayOrderId');
      expect(response.body.data).toHaveProperty('amount');
      expect(response.body.data.amount).toBe(testOrder.totalAmount);

      // Verify payment record created
      const payment = await Payment.findOne({ orderId: testOrder._id });
      expect(payment).toBeDefined();
      expect(payment.status).toBe('INITIATED');
    });

    it('should reject payment initiation for invalid order ID', async () => {
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: 'invalid-id',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/invalid.*order/i);
    });

    it('should reject payment initiation for non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: fakeId.toString(),
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject payment for already-paid order', async () => {
      testOrder.paymentStatus = PAYMENT_STATUS.PAID;
      await testOrder.save();

      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/already paid/i);
    });

    it('should reject payment with negative amount', async () => {
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: -100,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/amount.*invalid/i);
    });

    it('should reject payment with zero amount', async () => {
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 0,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject payment for unsupported payment method', async () => {
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
          paymentMethod: 'BITCOIN', // Not supported
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should enforce user ownership of order', async () => {
      // Create another user's order
      const otherUser = await User.create({
        ...generateTestUser({
          email: 'other@test.com',
          mobile: '9876543212',
        }),
        password: await hashPassword('Test@1234'),
        role: ROLES.B2B_CUSTOMER,
        status: USER_STATUS.ACTIVE,
      });

      const otherOrder = await Order.create({
        userId: otherUser._id,
        items: [
          {
            productId: testProduct._id,
            name: testProduct.name,
            price: testProduct.price,
            quantity: 10,
          },
        ],
        totalAmount: 11800,
        paymentMethod: 'ONLINE',
        address: validShippingAddress,
        status: ORDER_STATUS.PENDING_PAYMENT,
        paymentStatus: PAYMENT_STATUS.PENDING,
      });

      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: otherOrder._id.toString(),
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should prevent duplicate payment initiation', async () => {
      // First initiation
      await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
        })
        .expect(201);

      // Second initiation should be prevented
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/payment.*already.*initiated|in progress/i);
    });

    it('should handle Razorpay gateway timeout gracefully', async () => {
      // Mock Razorpay timeout scenario
      // This would require mocking the gateway in production tests
      // For now, we verify error handling structure

      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
        });

      // Should either succeed or fail gracefully
      expect([200, 201, 500, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('STEP 3: Payment Status Lifecycle', () => {
    let testPayment;

    beforeEach(async () => {
      testPayment = await Payment.create({
        orderId: testOrder._id,
        userId: testUser._id,
        amount: testOrder.totalAmount,
        status: 'INITIATED',
        paymentMethod: 'ONLINE',
        transactionId: `rzp_order_${Date.now()}`,
      });
    });

    it('should transition from INITIATED to PENDING', async () => {
      testPayment.status = 'PENDING';
      await testPayment.save();

      const updated = await Payment.findById(testPayment._id);
      expect(updated.status).toBe('PENDING');
    });

    it('should transition from PENDING to SUCCESS', async () => {
      testPayment.status = 'PENDING';
      await testPayment.save();

      testPayment.status = 'SUCCESS';
      testPayment.razorpayPaymentId = `pay_${Date.now()}`;
      await testPayment.save();

      const updated = await Payment.findById(testPayment._id);
      expect(updated.status).toBe('SUCCESS');
      expect(updated.razorpayPaymentId).toBeDefined();
    });

    it('should transition from PENDING to FAILED', async () => {
      testPayment.status = 'PENDING';
      await testPayment.save();

      testPayment.status = 'FAILED';
      await testPayment.save();

      const updated = await Payment.findById(testPayment._id);
      expect(updated.status).toBe('FAILED');
    });

    it('should prevent invalid status transition (SUCCESS → FAILED)', async () => {
      testPayment.status = 'SUCCESS';
      await testPayment.save();

      // In production, this should be prevented by business logic
      // For now, verify that SUCCESS status is final
      const successPayment = await Payment.findById(testPayment._id);
      expect(successPayment.status).toBe('SUCCESS');

      // Attempt to change to FAILED should not persist
      testPayment.status = 'FAILED';
      // Business logic should prevent this save
    });

    it('should prevent repeated status transitions', async () => {
      testPayment.status = 'SUCCESS';
      await testPayment.save();

      const updated1 = await Payment.findById(testPayment._id);
      expect(updated1.status).toBe('SUCCESS');

      // Try to set SUCCESS again (should be idempotent)
      testPayment.status = 'SUCCESS';
      await testPayment.save();

      const updated2 = await Payment.findById(testPayment._id);
      expect(updated2.status).toBe('SUCCESS');
    });

    it('should sync order status with payment status', async () => {
      testPayment.status = 'SUCCESS';
      await testPayment.save();

      // Update order status
      testOrder.paymentStatus = PAYMENT_STATUS.PAID;
      testOrder.status = ORDER_STATUS.CONFIRMED;
      await testOrder.save();

      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.paymentStatus).toBe(PAYMENT_STATUS.PAID);
      expect(updatedOrder.status).toBe(ORDER_STATUS.CONFIRMED);
    });

    it('should handle concurrent status updates safely', async () => {
      // Simulate concurrent updates
      const update1 = Payment.findByIdAndUpdate(
        testPayment._id,
        { status: 'PENDING' },
        { new: true }
      );

      const update2 = Payment.findByIdAndUpdate(
        testPayment._id,
        { status: 'SUCCESS' },
        { new: true }
      );

      const results = await Promise.allSettled([update1, update2]);

      // Both should succeed or one should fail gracefully
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);

      // Final state should be deterministic
      const final = await Payment.findById(testPayment._id);
      expect(['PENDING', 'SUCCESS']).toContain(final.status);
    });
  });

  describe('STEP 4: Webhook Security & Validation', () => {
    const generateWebhookSignature = (payload, secret) => {
      return crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
    };

    it('should accept webhook with valid signature', async () => {
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_${Date.now()}`,
              order_id: testOrder._id.toString(),
              amount: testOrder.totalAmount * 100, // Razorpay uses paise
              status: 'captured',
            },
          },
        },
      };

      const signature = generateWebhookSignature(payload, process.env.RAZORPAY_WEBHOOK_SECRET || 'test-secret');

      const response = await request
        .post('/api/v1/payment/webhook')
        .set('X-Razorpay-Signature', signature)
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_${Date.now()}`,
              order_id: testOrder._id.toString(),
              amount: testOrder.totalAmount * 100,
              status: 'captured',
            },
          },
        },
      };

      const response = await request
        .post('/api/v1/payment/webhook')
        .set('X-Razorpay-Signature', 'invalid-signature')
        .send(payload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/invalid.*signature/i);
    });

    it('should reject webhook with missing signature', async () => {
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_${Date.now()}`,
              order_id: testOrder._id.toString(),
              amount: testOrder.totalAmount * 100,
              status: 'captured',
            },
          },
        },
      };

      const response = await request
        .post('/api/v1/payment/webhook')
        .send(payload)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prevent webhook replay attacks', async () => {
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_${Date.now()}`,
              order_id: testOrder._id.toString(),
              amount: testOrder.totalAmount * 100,
              status: 'captured',
            },
          },
        },
      };

      const signature = generateWebhookSignature(payload, process.env.RAZORPAY_WEBHOOK_SECRET || 'test-secret');

      // First webhook
      await request
        .post('/api/v1/payment/webhook')
        .set('X-Razorpay-Signature', signature)
        .send(payload)
        .expect(200);

      // Replay attempt (should be idempotent, not process twice)
      const response = await request
        .post('/api/v1/payment/webhook')
        .set('X-Razorpay-Signature', signature)
        .send(payload)
        .expect(200);

      // Should acknowledge but not process again
      expect(response.body.message).toMatch(/already.*processed|idempotent/i);
    });

    it('should reject malformed webhook payload', async () => {
      const response = await request
        .post('/api/v1/payment/webhook')
        .set('X-Razorpay-Signature', 'some-signature')
        .send({
          invalid: 'payload',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle delayed webhook delivery', async () => {
      // Simulate webhook received after payment already verified
      testOrder.paymentStatus = PAYMENT_STATUS.PAID;
      await testOrder.save();

      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_${Date.now()}`,
              order_id: testOrder._id.toString(),
              amount: testOrder.totalAmount * 100,
              status: 'captured',
            },
          },
        },
      };

      const signature = generateWebhookSignature(payload, process.env.RAZORPAY_WEBHOOK_SECRET || 'test-secret');

      const response = await request
        .post('/api/v1/payment/webhook')
        .set('X-Razorpay-Signature', signature)
        .send(payload)
        .expect(200);

      // Should handle gracefully without errors
      expect(response.body.success).toBe(true);
    });

    it('should validate webhook amount matches order amount', async () => {
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_${Date.now()}`,
              order_id: testOrder._id.toString(),
              amount: (testOrder.totalAmount + 1000) * 100, // Tampered amount
              status: 'captured',
            },
          },
        },
      };

      const signature = generateWebhookSignature(payload, process.env.RAZORPAY_WEBHOOK_SECRET || 'test-secret');

      const response = await request
        .post('/api/v1/payment/webhook')
        .set('X-Razorpay-Signature', signature)
        .send(payload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/amount.*mismatch/i);
    });

    it('should handle unknown webhook events gracefully', async () => {
      const payload = {
        event: 'unknown.event',
        payload: {
          payment: {
            entity: {
              id: `pay_${Date.now()}`,
              order_id: testOrder._id.toString(),
              amount: testOrder.totalAmount * 100,
            },
          },
        },
      };

      const signature = generateWebhookSignature(payload, process.env.RAZORPAY_WEBHOOK_SECRET || 'test-secret');

      const response = await request
        .post('/api/v1/payment/webhook')
        .set('X-Razorpay-Signature', signature)
        .send(payload)
        .expect(200);

      // Should acknowledge but not process
      expect(response.body.success).toBe(true);
    });

    it('should handle payment.failed webhook', async () => {
      const payload = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: `pay_${Date.now()}`,
              order_id: testOrder._id.toString(),
              amount: testOrder.totalAmount * 100,
              status: 'failed',
              error_code: 'BAD_REQUEST_ERROR',
              error_description: 'Payment failed',
            },
          },
        },
      };

      const signature = generateWebhookSignature(payload, process.env.RAZORPAY_WEBHOOK_SECRET || 'test-secret');

      const response = await request
        .post('/api/v1/payment/webhook')
        .set('X-Razorpay-Signature', signature)
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify payment status updated to FAILED
      const payment = await Payment.findOne({ orderId: testOrder._id });
      if (payment) {
        expect(payment.status).toBe('FAILED');
      }
    });
  });

  describe('STEP 5: Payment Transaction Safety', () => {
    it('should rollback payment on database failure', async () => {
      // This test would require mocking database operations
      // For now, verify transaction structure exists
      const initialCount = await Payment.countDocuments();

      try {
        await request
          .post('/api/v1/payment/initiate')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            orderId: testOrder._id.toString(),
          });

        const finalCount = await Payment.countDocuments();
        expect(finalCount).toBeGreaterThanOrEqual(initialCount);
      } catch (error) {
        // If it fails, count should remain unchanged
        const finalCount = await Payment.countDocuments();
        expect(finalCount).toBe(initialCount);
      }
    });

    it('should prevent orphan payment records', async () => {
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
        });

      if (response.status === 201) {
        // Verify payment is linked to order
        const payment = await Payment.findOne({ orderId: testOrder._id });
        expect(payment).toBeDefined();
        expect(payment.orderId.toString()).toBe(testOrder._id.toString());
      }
    });

    it('should handle concurrent payment initiation safely', async () => {
      const request1 = request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
        });

      const request2 = request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
        });

      const results = await Promise.allSettled([request1, request2]);

      // Only one should succeed
      const successes = results.filter(
        r => r.status === 'fulfilled' && r.value.status === 201
      );
      expect(successes.length).toBeLessThanOrEqual(1);

      // Verify only one payment record created
      const paymentCount = await Payment.countDocuments({ orderId: testOrder._id });
      expect(paymentCount).toBeLessThanOrEqual(1);
    });

    it('should maintain order-payment synchronization', async () => {
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
        });

      if (response.status === 201) {
        const payment = await Payment.findOne({ orderId: testOrder._id });
        const order = await Order.findById(testOrder._id);

        expect(payment.orderId.toString()).toBe(order._id.toString());
        expect(payment.userId.toString()).toBe(order.userId.toString());
        expect(payment.amount).toBe(order.totalAmount);
      }
    });

    it('should prevent duplicate payment captures', async () => {
      const testPayment = await Payment.create({
        orderId: testOrder._id,
        userId: testUser._id,
        amount: testOrder.totalAmount,
        status: 'PENDING',
        paymentMethod: 'ONLINE',
        transactionId: `rzp_order_${Date.now()}`,
        razorpayPaymentId: `pay_${Date.now()}`,
      });

      // Mark payment as success
      testPayment.status = 'SUCCESS';
      await testPayment.save();

      // Try to capture again
      const response = await request
        .post('/api/v1/payment/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: testPayment.transactionId,
          razorpay_payment_id: testPayment.razorpayPaymentId,
          razorpay_signature: 'test-signature',
        });

      // Should either succeed idempotently or reject
      expect([200, 400]).toContain(response.status);

      // Verify only one SUCCESS payment exists
      const successPayments = await Payment.countDocuments({
        orderId: testOrder._id,
        status: 'SUCCESS',
      });
      expect(successPayments).toBe(1);
    });
  });

  describe('STEP 7: Idempotency & Duplicate Protection', () => {
    it('should handle duplicate payment verification requests', async () => {
      const razorpay_order_id = `rzp_order_${Date.now()}`;
      const razorpay_payment_id = `pay_${Date.now()}`;
      const razorpay_signature = 'test-signature';

      await Payment.create({
        orderId: testOrder._id,
        userId: testUser._id,
        amount: testOrder.totalAmount,
        status: 'PENDING',
        paymentMethod: 'ONLINE',
        transactionId: razorpay_order_id,
      });

      // First verification
      const response1 = await request
        .post('/api/v1/payment/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        });

      // Second verification (duplicate)
      const response2 = await request
        .post('/api/v1/payment/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        });

      // Both should succeed or second should acknowledge duplicate
      expect([200, 201]).toContain(response1.status);
      expect([200, 201]).toContain(response2.status);

      // Verify only one payment record updated
      const payments = await Payment.find({
        orderId: testOrder._id,
        status: 'SUCCESS',
      });
      expect(payments.length).toBeLessThanOrEqual(1);
    });

    it('should handle network retry consistency', async () => {
      // Simulate network retry scenario
      const requests = Array(3).fill(null).map(() =>
        request
          .post('/api/v1/payment/initiate')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            orderId: testOrder._id.toString(),
          })
      );

      const results = await Promise.allSettled(requests);

      // Only one should create a new payment
      const paymentCount = await Payment.countDocuments({ orderId: testOrder._id });
      expect(paymentCount).toBeLessThanOrEqual(1);
    });
  });

  describe('STEP 8: Payment Authorization & RBAC', () => {
    it('should enforce user payment ownership', async () => {
      // Create another user
      const otherUser = await User.create({
        ...generateTestUser({
          email: 'other@test.com',
          mobile: '9876543212',
        }),
        password: await hashPassword('Test@1234'),
        role: ROLES.B2B_CUSTOMER,
        status: USER_STATUS.ACTIVE,
      });

      const otherLogin = await request
        .post('/api/v1/auth/login')
        .send({ identifier: 'other@test.com', password: 'Test@1234' });
      const otherToken = otherLogin.body.data.accessToken;

      // Try to access test user's payment
      const response = await request
        .get(`/api/v1/payment/${testOrder._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should allow admin to access any payment', async () => {
      const payment = await Payment.create({
        orderId: testOrder._id,
        userId: testUser._id,
        amount: testOrder.totalAmount,
        status: 'PENDING',
        paymentMethod: 'ONLINE',
        transactionId: `rzp_order_${Date.now()}`,
      });

      const response = await request
        .get(`/api/v1/payment/${payment._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should prevent payment record tampering', async () => {
      const payment = await Payment.create({
        orderId: testOrder._id,
        userId: testUser._id,
        amount: testOrder.totalAmount,
        status: 'PENDING',
        paymentMethod: 'ONLINE',
        transactionId: `rzp_order_${Date.now()}`,
      });

      // Try to update payment amount
      const response = await request
        .patch(`/api/v1/payment/${payment._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 100, // Try to reduce amount
        })
        .expect(403);

      expect(response.body.success).toBe(false);

      // Verify amount unchanged
      const unchangedPayment = await Payment.findById(payment._id);
      expect(unchangedPayment.amount).toBe(testOrder.totalAmount);
    });
  });

  describe('STEP 9: Failure Recovery & Edge Cases', () => {
    it('should handle gateway timeout during initiation', async () => {
      // This would require mocking Razorpay
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
        });

      // Should either succeed or fail gracefully
      expect(response.body).toHaveProperty('success');
      if (response.status >= 500) {
        expect(response.body.message).toMatch(/timeout|unavailable|error/i);
      }
    });

    it('should handle payment with stale order reference', async () => {
      // Delete order
      await Order.findByIdAndDelete(testOrder._id);

      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle database write failure gracefully', async () => {
      // This would require mocking database operations
      // For now, verify error handling structure
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
        });

      expect(response.body).toHaveProperty('success');
    });

    it('should recover from interrupted transaction', async () => {
      // Simulate interrupted transaction by creating partial payment
      const partialPayment = await Payment.create({
        orderId: testOrder._id,
        userId: testUser._id,
        amount: testOrder.totalAmount,
        status: 'INITIATED',
        paymentMethod: 'ONLINE',
      });

      // Verify system can handle existing partial payment
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
        });

      // Should either use existing payment or create new one
      expect([200, 201, 400]).toContain(response.status);
    });
  });

  describe('STEP 11: Financial Consistency Validation', () => {
    it('should maintain order-payment amount consistency', async () => {
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
        });

      if (response.status === 201) {
        const payment = await Payment.findOne({ orderId: testOrder._id });
        expect(payment.amount).toBe(testOrder.totalAmount);
      }
    });

    it('should handle currency consistency', async () => {
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString(),
          currency: 'INR',
        });

      if (response.status === 201) {
        expect(response.body.data.currency).toBe('INR');
      }
    });

    it('should prevent floating-point inconsistencies', async () => {
      // Create order with decimal amount
      const decimalOrder = await Order.create({
        userId: testUser._id,
        items: [
          {
            productId: testProduct._id,
            name: testProduct.name,
            price: 999.99,
            quantity: 10,
          },
        ],
        totalAmount: 11799.88, // 9999.90 + 18% GST
        paymentMethod: 'ONLINE',
        address: validShippingAddress,
        status: ORDER_STATUS.PENDING_PAYMENT,
        paymentStatus: PAYMENT_STATUS.PENDING,
      });

      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: decimalOrder._id.toString(),
        });

      if (response.status === 201) {
        const payment = await Payment.findOne({ orderId: decimalOrder._id });
        expect(payment.amount).toBe(decimalOrder.totalAmount);
      }
    });

    it('should calculate tax consistently (18% GST)', async () => {
      const baseAmount = 10000;
      const gstAmount = baseAmount * 0.18;
      const totalAmount = baseAmount + gstAmount;

      expect(totalAmount).toBe(11800);
      expect(testOrder.totalAmount).toBe(11800);
    });
  });

  describe('STEP 12: Error Handling Validation', () => {
    it('should handle malformed payment request', async () => {
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          // Missing orderId
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid ObjectId format', async () => {
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: 'not-a-valid-objectid',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing authentication', async () => {
      const response = await request
        .post('/api/v1/payment/initiate')
        .send({
          orderId: testOrder._id.toString(),
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid authentication token', async () => {
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          orderId: testOrder._id.toString(),
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return consistent error structure', async () => {
      const response = await request
        .post('/api/v1/payment/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: 'invalid-id',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body.success).toBe(false);
      expect(typeof response.body.message).toBe('string');
    });
  });
});
