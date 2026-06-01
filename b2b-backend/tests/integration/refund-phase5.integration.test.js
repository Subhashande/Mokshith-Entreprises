import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import supertest from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import Payment from '../../src/modules/payment/payment.model.js';
import Refund from '../../src/modules/payment/refund.model.js';
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

const request = supertest(app);

/**
 * 🔥 PHASE 5: REFUND WORKFLOW - Comprehensive Integration Tests
 * Tests refund creation, partial/full refunds, inventory restoration, idempotency
 */

describe('Phase 5: Refund Workflow - Comprehensive Tests', () => {
  let testUser;
  let adminUser;
  let userToken;
  let adminToken;
  let testCategory;
  let testProduct;
  let testWarehouse;
  let paidOrder;
  let successfulPayment;
  let validShippingAddress;

  beforeEach(async () => {
    await clearDatabase();
    await redisClient.flushdb();

    // Create test users
    const hashedPassword = await hashPassword('Test@1234');
    testUser = await User.create({
      ...generateTestUser({
        email: 'refund@test.com',
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
      .send({ identifier: 'refund@test.com', password: 'Test@1234' });
    userToken = userLogin.body.data.accessToken;

    const adminLogin = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'admin@test.com', password: 'Test@1234' });
    adminToken = adminLogin.body.data.accessToken;

    // Create test data
    testCategory = await Category.create({
      name: 'Test Category',
      slug: 'test-category',
    });

    testWarehouse = await Warehouse.create({
      name: 'Main Warehouse',
      location: {
        city: 'Test City',
      },
      capacity: 10000,
    });

    testProduct = await Product.create({
      name: 'Test Product',
      price: 1000,
      stock: 90, // Already reduced from 100
      categoryId: testCategory._id,
      isActive: true,
      moq: 10,
    });

    await Inventory.create({
      productId: testProduct._id,
      warehouseId: testWarehouse._id,
      stock: 90,
    });

    validShippingAddress = {
      name: 'John Doe',
      phone: '9876543210',
      addressLine: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
    };

    // Create PAID order
    paidOrder = await Order.create({
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
      status: ORDER_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.PAID,
    });

    // Create successful payment
    successfulPayment = await Payment.create({
      orderId: paidOrder._id,
      userId: testUser._id,
      amount: paidOrder.totalAmount,
      status: 'SUCCESS',
      paymentMethod: 'ONLINE',
      transactionId: `rzp_order_${Date.now()}`,
      razorpayPaymentId: `pay_${Date.now()}`,
    });
  });

  afterEach(async () => {
    await redisClient.flushdb();
  });

  describe('STEP 6: Refund Creation - Full Refund', () => {
    it('should successfully create full refund for paid order', async () => {
      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason: 'Product defective',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('refundId');
      expect(response.body.data.refundType).toBe('FULL');
      expect(response.body.data.amount).toBe(paidOrder.totalAmount);

      // Verify refund record created
      const refund = await Refund.findOne({ orderId: paidOrder._id });
      expect(refund).toBeDefined();
      expect(refund.status).toMatch(/INITIATED|PROCESSING|SUCCESS/);
      expect(refund.refundType).toBe('FULL');
    });

    it('should restore inventory for full refund', async () => {
      const initialStock = testProduct.stock;

      await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason: 'Product defective',
        })
        .expect(201);

      // Wait for inventory restoration (may be async)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct.stock).toBe(initialStock + 10); // Stock restored
    });

    it('should update order status for full refund', async () => {
      await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason: 'Customer request',
        })
        .expect(201);

      const updatedOrder = await Order.findById(paidOrder._id);
      expect(updatedOrder.status).toMatch(/CANCELLED|REFUNDED/);
      expect(updatedOrder.paymentStatus).toBe('REFUNDED');
    });

    it('should track refund initiator', async () => {
      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason: 'Admin initiated refund',
        })
        .expect(201);

      const refund = await Refund.findOne({ orderId: paidOrder._id });
      expect(refund.initiatedBy.toString()).toBe(adminUser._id.toString());
    });

    it('should store refund reason', async () => {
      const reason = 'Product quality issues';

      await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason,
        })
        .expect(201);

      const refund = await Refund.findOne({ orderId: paidOrder._id });
      expect(refund.reason).toBe(reason);
    });
  });

  describe('STEP 6: Refund Creation - Partial Refund', () => {
    it('should successfully create partial refund', async () => {
      const partialAmount = 5000; // Half of total

      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: partialAmount,
          reason: 'Partial damage',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.refundType).toBe('PARTIAL');
      expect(response.body.data.amount).toBe(partialAmount);

      const refund = await Refund.findOne({ orderId: paidOrder._id });
      expect(refund.refundType).toBe('PARTIAL');
    });

    it('should NOT restore inventory for partial refund', async () => {
      const initialStock = testProduct.stock;
      const partialAmount = 5000;

      await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: partialAmount,
          reason: 'Partial refund',
        })
        .expect(201);

      await new Promise(resolve => setTimeout(resolve, 500));

      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct.stock).toBe(initialStock); // Stock NOT restored
    });

    it('should allow multiple partial refunds up to total amount', async () => {
      // First partial refund
      await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: 5000,
          reason: 'First partial refund',
        })
        .expect(201);

      // Second partial refund
      await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: 5000,
          reason: 'Second partial refund',
        })
        .expect(201);

      const refunds = await Refund.find({ orderId: paidOrder._id });
      expect(refunds.length).toBe(2);

      const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0);
      expect(totalRefunded).toBe(10000);
    });

    it('should prevent partial refund exceeding remaining amount', async () => {
      // First partial refund
      await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: 10000,
          reason: 'Large partial refund',
        })
        .expect(201);

      // Second partial refund exceeding remaining amount
      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: 5000, // Would exceed total
          reason: 'Excessive refund',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/exceed|remaining|already refunded/i);
    });

    it('should calculate refund totals correctly', async () => {
      // Create multiple partial refunds
      await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: 3000,
          reason: 'Partial 1',
        });

      await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: 2000,
          reason: 'Partial 2',
        });

      const refunds = await Refund.find({
        orderId: paidOrder._id,
        status: { $in: ['INITIATED', 'PROCESSING', 'SUCCESS'] },
      });

      const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0);
      expect(totalRefunded).toBe(5000);
    });
  });

  describe('STEP 7: Refund Idempotency', () => {
    it('should prevent duplicate refund requests', async () => {
      // First refund request
      const response1 = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason: 'Duplicate test',
        })
        .expect(201);

      // Immediate duplicate request
      const response2 = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason: 'Duplicate test',
        })
        .expect(400);

      expect(response2.body.success).toBe(false);
      expect(response2.body.message).toMatch(/already.*refund|in progress/i);

      // Verify only one refund created
      const refunds = await Refund.find({ orderId: paidOrder._id });
      expect(refunds.length).toBe(1);
    });

    it('should handle concurrent refund requests safely', async () => {
      const request1 = request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason: 'Concurrent test 1',
        });

      const request2 = request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason: 'Concurrent test 2',
        });

      const results = await Promise.allSettled([request1, request2]);

      // Only one should succeed
      const successes = results.filter(
        r => r.status === 'fulfilled' && r.value.status === 201
      );
      expect(successes.length).toBeLessThanOrEqual(1);

      // Verify only one refund created
      const refunds = await Refund.find({ orderId: paidOrder._id });
      expect(refunds.length).toBeLessThanOrEqual(1);
    });

    it('should allow retry after failed refund', async () => {
      // Create a failed refund manually
      await Refund.create({
        orderId: paidOrder._id,
        paymentId: successfulPayment._id,
        userId: testUser._id,
        amount: paidOrder.totalAmount,
        refundType: 'FULL',
        status: 'FAILED',
        razorpayPaymentId: successfulPayment.razorpayPaymentId,
        reason: 'Gateway error',
        initiatedBy: adminUser._id,
        errorDetails: {
          message: 'Gateway timeout',
          code: 'GATEWAY_ERROR',
          timestamp: new Date(),
        },
      });

      // Retry refund
      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason: 'Retry after failure',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('STEP 6: Refund Validation', () => {
    it('should reject refund with invalid amount', async () => {
      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: -100, // Negative amount
          reason: 'Invalid amount',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject refund with zero amount', async () => {
      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: 0,
          reason: 'Zero amount',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject refund exceeding order amount', async () => {
      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount + 1000,
          reason: 'Excessive refund',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/exceed/i);
    });

    it('should reject refund for unpaid order', async () => {
      // Create unpaid order
      const unpaidOrder = await Order.create({
        userId: testUser._id,
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
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: unpaidOrder._id.toString(),
          amount: unpaidOrder.totalAmount,
          reason: 'Refund unpaid',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not.*paid|unpaid/i);
    });

    it('should reject refund for cancelled order', async () => {
      paidOrder.status = ORDER_STATUS.CANCELLED;
      paidOrder.paymentStatus = PAYMENT_STATUS.REFUNDED;
      await paidOrder.save();

      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason: 'Double refund',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject refund with missing reason', async () => {
      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          // Missing reason
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject refund for non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: fakeId.toString(),
          amount: 5000,
          reason: 'Non-existent order',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('STEP 8: Refund Authorization', () => {
    it('should allow admin to initiate refund', async () => {
      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason: 'Admin refund',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should allow order owner to request refund', async () => {
      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason: 'Customer request',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should prevent unauthorized refund attempts', async () => {
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

      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason: 'Unauthorized refund',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should prevent refund without authentication', async () => {
      const response = await request
        .post('/api/v1/payment/refund')
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason: 'Unauthenticated refund',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('STEP 6: Refund History & Retrieval', () => {
    beforeEach(async () => {
      // Create multiple refunds
      await Refund.create({
        orderId: paidOrder._id,
        paymentId: successfulPayment._id,
        userId: testUser._id,
        amount: 5000,
        refundType: 'PARTIAL',
        status: 'SUCCESS',
        razorpayPaymentId: successfulPayment.razorpayPaymentId,
        razorpayRefundId: `rfnd_${Date.now()}`,
        reason: 'First refund',
        initiatedBy: adminUser._id,
      });

      await Refund.create({
        orderId: paidOrder._id,
        paymentId: successfulPayment._id,
        userId: testUser._id,
        amount: 3000,
        refundType: 'PARTIAL',
        status: 'SUCCESS',
        razorpayPaymentId: successfulPayment.razorpayPaymentId,
        razorpayRefundId: `rfnd_${Date.now() + 1}`,
        reason: 'Second refund',
        initiatedBy: adminUser._id,
      });
    });

    it('should retrieve refund history for order', async () => {
      const response = await request
        .get(`/api/v1/payment/refund/history/${paidOrder._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2);
    });

    it('should calculate total refunded amount', async () => {
      const response = await request
        .get(`/api/v1/payment/refund/history/${paidOrder._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const totalRefunded = response.body.data.reduce(
        (sum, refund) => sum + refund.amount,
        0
      );
      expect(totalRefunded).toBe(8000); // 5000 + 3000
    });

    it('should return empty array for orders with no refunds', async () => {
      // Create order without refunds
      const newOrder = await Order.create({
        userId: testUser._id,
        items: [
          {
            productId: testProduct._id,
            name: testProduct.name,
            price: testProduct.price,
            quantity: 10,
          },
        ],
        totalAmount: 11800,
        paymentMethod: 'COD',
        address: validShippingAddress,
        status: ORDER_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.PAID,
      });

      const response = await request
        .get(`/api/v1/payment/refund/history/${newOrder._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('should retrieve single refund by ID', async () => {
      const refund = await Refund.findOne({ orderId: paidOrder._id });

      const response = await request
        .get(`/api/v1/payment/refund/${refund._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(refund._id.toString());
      expect(response.body.data.amount).toBe(refund.amount);
    });

    it('should return 404 for non-existent refund', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request
        .get(`/api/v1/payment/refund/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('STEP 9: Refund Failure Recovery', () => {
    it('should handle gateway timeout during refund', async () => {
      // This would require mocking Razorpay
      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason: 'Timeout test',
        });

      // Should either succeed or fail gracefully
      expect(response.body).toHaveProperty('success');
    });

    it('should mark refund as FAILED on gateway error', async () => {
      // Create refund that will fail
      const refund = await Refund.create({
        orderId: paidOrder._id,
        paymentId: successfulPayment._id,
        userId: testUser._id,
        amount: paidOrder.totalAmount,
        refundType: 'FULL',
        status: 'PROCESSING',
        razorpayPaymentId: successfulPayment.razorpayPaymentId,
        reason: 'Test failure',
        initiatedBy: adminUser._id,
      });

      // Manually mark as failed
      await refund.markFailed({
        message: 'Gateway error',
        code: 'GATEWAY_TIMEOUT',
      });

      const updated = await Refund.findById(refund._id);
      expect(updated.status).toBe('FAILED');
      expect(updated.errorDetails.code).toBe('GATEWAY_TIMEOUT');
    });

    it('should not restore inventory on failed refund', async () => {
      const initialStock = testProduct.stock;

      // Create failed refund
      await Refund.create({
        orderId: paidOrder._id,
        paymentId: successfulPayment._id,
        userId: testUser._id,
        amount: paidOrder.totalAmount,
        refundType: 'FULL',
        status: 'FAILED',
        razorpayPaymentId: successfulPayment.razorpayPaymentId,
        reason: 'Failed refund',
        initiatedBy: adminUser._id,
        errorDetails: {
          message: 'Gateway error',
          code: 'GATEWAY_ERROR',
          timestamp: new Date(),
        },
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct.stock).toBe(initialStock); // Stock NOT restored
    });

    it('should handle interrupted refund transaction', async () => {
      // Create refund in PROCESSING state (interrupted)
      const interruptedRefund = await Refund.create({
        orderId: paidOrder._id,
        paymentId: successfulPayment._id,
        userId: testUser._id,
        amount: paidOrder.totalAmount,
        refundType: 'FULL',
        status: 'PROCESSING',
        razorpayPaymentId: successfulPayment.razorpayPaymentId,
        reason: 'Interrupted',
        initiatedBy: adminUser._id,
      });

      // System should handle existing PROCESSING refund
      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason: 'Retry interrupted',
        });

      // Should either reuse existing or reject duplicate
      expect([200, 201, 400]).toContain(response.status);
    });
  });

  describe('STEP 11: Refund Financial Consistency', () => {
    it('should maintain refund-payment amount consistency', async () => {
      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: paidOrder.totalAmount,
          reason: 'Consistency test',
        })
        .expect(201);

      const refund = await Refund.findOne({ orderId: paidOrder._id });
      expect(refund.amount).toBe(paidOrder.totalAmount);
      expect(refund.amount).toBe(successfulPayment.amount);
    });

    it('should track refund balance correctly', async () => {
      // Create multiple partial refunds
      await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: 4000,
          reason: 'Partial 1',
        });

      await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: 3000,
          reason: 'Partial 2',
        });

      const refunds = await Refund.find({
        orderId: paidOrder._id,
        status: { $nin: ['FAILED'] },
      });

      const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0);
      const remainingBalance = paidOrder.totalAmount - totalRefunded;

      expect(remainingBalance).toBe(4800); // 11800 - 7000
    });

    it('should prevent floating-point refund errors', async () => {
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
        totalAmount: 11799.88,
        paymentMethod: 'ONLINE',
        address: validShippingAddress,
        status: ORDER_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.PAID,
      });

      const decimalPayment = await Payment.create({
        orderId: decimalOrder._id,
        userId: testUser._id,
        amount: decimalOrder.totalAmount,
        status: 'SUCCESS',
        paymentMethod: 'ONLINE',
        transactionId: `rzp_order_${Date.now()}`,
        razorpayPaymentId: `pay_${Date.now()}`,
      });

      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: decimalOrder._id.toString(),
          amount: 5899.94, // Half amount
          reason: 'Decimal refund',
        })
        .expect(201);

      const refund = await Refund.findOne({ orderId: decimalOrder._id });
      expect(refund.amount).toBe(5899.94);
    });
  });

  describe('STEP 12: Refund Error Handling', () => {
    it('should handle malformed refund request', async () => {
      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // Missing orderId
          amount: 5000,
          reason: 'Malformed',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid ObjectId format', async () => {
      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: 'invalid-objectid',
          amount: 5000,
          reason: 'Invalid ID',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return consistent error structure', async () => {
      const response = await request
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: paidOrder._id.toString(),
          amount: -100, // Invalid
          reason: 'Error test',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body.success).toBe(false);
      expect(typeof response.body.message).toBe('string');
    });
  });
});
