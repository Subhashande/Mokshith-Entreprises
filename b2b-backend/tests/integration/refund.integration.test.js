import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/modules/user/user.model.js';
import Order from '../../src/modules/order/order.model.js';
import Payment from '../../src/modules/payment/payment.model.js';
import Refund from '../../src/modules/payment/refund.model.js';
import Product from '../../src/modules/product/product.model.js';
import Inventory from '../../src/modules/inventory/inventory.model.js';
import { clearDatabase } from '../helpers/testUtils.js';
import { redisClient } from '../../src/config/redis.js';
import { ROLES } from '../../src/constants/roles.js';

/**
 * 🔒 CRITICAL: Refund System Integration Tests
 * Tests refund creation, idempotency, inventory restoration, partial/full refunds, authorization
 */

describe('Refund Integration Tests', () => {
  let testUser;
  let adminUser;
  let testOrder;
  let testPayment;
  let testProduct;
  let authToken;
  let adminToken;
  let warehouseId;

  beforeEach(async () => {
    await clearDatabase();
    await redisClient.flushdb();

    // Create users
    testUser = await User.create({
      name: 'Refund Test User',
      email: 'refund@test.com',
      password: 'Test@1234',
      role: ROLES.B2B_CUSTOMER,
      mobile: '9876543210',
      status: 'ACTIVE',
    });

    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'Admin@1234',
      role: ROLES.ADMIN,
      mobile: '9876543211',
      status: 'ACTIVE',
    });

    // Login
    const userLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'refund@test.com', password: 'Test@1234' });
    authToken = userLogin.body.data.token;

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin@1234' });
    adminToken = adminLogin.body.data.token;

    // Create product and inventory
    const Warehouse = mongoose.model('Warehouse');
    let warehouse = await Warehouse.findOne();
    if (!warehouse) {
      warehouse = await Warehouse.create({
        name: 'Test Warehouse',
        location: { city: 'Test City' },
      });
    }
    warehouseId = warehouse._id;

    testProduct = await Product.create({
      name: 'Refund Test Product',
      category: 'Test',
      basePrice: 1000,
      stock: 100,
      status: 'ACTIVE',
    });

    await Inventory.create({
      productId: testProduct._id,
      warehouseId,
      stock: 100,
    });

    // Create paid order
    testOrder = await Order.create({
      userId: testUser._id,
      items: [{ productId: testProduct._id, name: 'Refund Test Product', quantity: 5, price: 1000 }],
      totalAmount: 5000,
      paymentStatus: 'PAID',
      status: 'CONFIRMED',
      paymentMethod: 'ONLINE',
      address: {
        name: 'Refund Test User',
        phone: '9876543210',
        addressLine: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
      },
    });

    testPayment = await Payment.create({
      orderId: testOrder._id,
      userId: testUser._id,
      amount: 5000,
      status: 'SUCCESS',
      paymentMethod: 'ONLINE',
      razorpayPaymentId: 'pay_test123',
      razorpayOrderId: 'order_test123',
    });
  });

  afterEach(async () => {
    await redisClient.flushdb();
  });

  describe('POST /api/v1/payment/refund - Create Refund', () => {
    it('should create full refund for paid order', async () => {
      const res = await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 5000,
          reason: 'Customer request',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('refundId');
      expect(res.body.data.amount).toBe(5000);
      expect(res.body.data.status).toMatch(/SUCCESS|PROCESSING/);
    });

    it('should create partial refund', async () => {
      const res = await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 2500, // 50% refund
          reason: 'Partial cancellation',
        })
        .expect(200);

      expect(res.body.data.amount).toBe(2500);
      expect(res.body.data.refundType).toBe('PARTIAL');
    });

    it('should enforce idempotency for duplicate refund attempts', async () => {
      // First refund
      const res1 = await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 5000,
          reason: 'First attempt',
        })
        .expect(200);

      // Duplicate refund attempt
      const res2 = await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 5000,
          reason: 'Duplicate attempt',
        })
        .expect(409);

      expect(res2.body.message).toMatch(/already exists|duplicate|pending/i);

      // Verify only one refund created
      const refunds = await Refund.find({ orderId: testOrder._id });
      expect(refunds.length).toBe(1);
    });

    it('should reject refund exceeding order amount', async () => {
      const res = await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 10000, // More than order amount
          reason: 'Excessive refund',
        })
        .expect(400);

      expect(res.body.message).toMatch(/exceeds|invalid amount/i);
    });

    it('should reject refund for unpaid order', async () => {
      // Create unpaid order
      const unpaidOrder = await Order.create({
        userId: testUser._id,
        items: [{ productId: testProduct._id, name: 'Refund Test Product', quantity: 2, price: 1000 }],
        totalAmount: 2000,
        paymentStatus: 'PENDING',
        status: 'PENDING',
        address: {
          name: 'Refund Test User',
          phone: '9876543210',
          addressLine: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
        },
      });

      const res = await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: unpaidOrder._id.toString(),
          amount: 2000,
          reason: 'Refund unpaid order',
        })
        .expect(400);

      expect(res.body.message).toMatch(/not paid|payment status/i);
    });

    it('should require authorization (admin or order owner)', async () => {
      // Create another user
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@test.com',
        password: 'Test@1234',
        role: ROLES.B2B_CUSTOMER,
        mobile: '9876543212',
        status: 'ACTIVE',
      });

      const otherLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'other@test.com', password: 'Test@1234' });
      const otherToken = otherLogin.body.data.token;

      // Try to refund order belonging to different user
      const res = await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 5000,
          reason: 'Unauthorized refund',
        })
        .expect(403);

      expect(res.body.message).toMatch(/not authorized|forbidden/i);
    });

    it('should allow order owner to initiate refund', async () => {
      const res = await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 5000,
          reason: 'Owner initiated refund',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Inventory Restoration on Refund', () => {
    it('should restore inventory for full refund', async () => {
      // Get initial inventory
      const initialInventory = await Inventory.findOne({ productId: testProduct._id });
      const initialStock = initialInventory.stock;

      // Create full refund
      await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 5000,
          reason: 'Full refund test',
        })
        .expect(200);

      // Wait for refund processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify inventory restored
      const finalInventory = await Inventory.findOne({ productId: testProduct._id });
      expect(finalInventory.stock).toBe(initialStock + 5);

      // Verify refund marked as inventory restored
      const refund = await Refund.findOne({ orderId: testOrder._id });
      expect(refund.inventoryRestored).toBe(true);
      expect(refund.restoredItems).toHaveLength(1);
    }, 5000);

    it('should NOT restore inventory for partial refund', async () => {
      const initialInventory = await Inventory.findOne({ productId: testProduct._id });
      const initialStock = initialInventory.stock;

      // Create partial refund (50%)
      await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 2500,
          reason: 'Partial refund test',
        })
        .expect(200);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify inventory NOT restored
      const finalInventory = await Inventory.findOne({ productId: testProduct._id });
      expect(finalInventory.stock).toBe(initialStock);

      // Verify refund marked as no inventory restoration
      const refund = await Refund.findOne({ orderId: testOrder._id });
      expect(refund.inventoryRestored).toBe(false);
    }, 5000);

    it('should handle multi-item order inventory restoration', async () => {
      const product2 = await Product.create({
        name: 'Product 2',
        category: 'Test',
        basePrice: 500,
        stock: 50,
        status: 'ACTIVE',
      });

      await Inventory.create({
        productId: product2._id,
        warehouseId,
        stock: 50,
      });

      const multiItemOrder = await Order.create({
        userId: testUser._id,
        items: [
          { productId: testProduct._id, name: 'Refund Test Product', quantity: 3, price: 1000 },
          { productId: product2._id, name: 'Test Product 2', quantity: 2, price: 500 },
        ],
        totalAmount: 4000,
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        address: {
          name: 'Refund Test User',
          phone: '9876543210',
          addressLine: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
        },
      });

      await Payment.create({
        orderId: multiItemOrder._id,
        userId: testUser._id,
        amount: 4000,
        status: 'SUCCESS',
        paymentMethod: 'ONLINE',
        razorpayPaymentId: 'pay_multi123',
        razorpayOrderId: 'order_multi123',
      });

      // Refund
      await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: multiItemOrder._id.toString(),
          amount: 4000,
          reason: 'Multi-item refund',
        })
        .expect(200);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify both inventories restored
      const inv1 = await Inventory.findOne({ productId: testProduct._id });
      const inv2 = await Inventory.findOne({ productId: product2._id });

      expect(inv1.stock).toBeGreaterThan(100);
      expect(inv2.stock).toBeGreaterThan(50);
    }, 5000);
  });

  describe('GET /api/v1/payment/refund/history/:orderId - Refund History', () => {
    it('should retrieve refund history for order', async () => {
      // Create refund
      await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 5000,
          reason: 'Test refund',
        });

      // Get history
      const res = await request(app)
        .get(`/api/v1/payment/refund/history/${testOrder._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('amount');
      expect(res.body.data[0]).toHaveProperty('status');
      expect(res.body.data[0]).toHaveProperty('refundType');
    });

    it('should return empty array for orders with no refunds', async () => {
      const newOrder = await Order.create({
        userId: testUser._id,
        items: [{ productId: testProduct._id, name: 'Refund Test Product', quantity: 1, price: 1000 }],
        totalAmount: 1000,
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        address: {
          name: 'Refund Test User',
          phone: '9876543210',
          addressLine: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
        },
      });

      const res = await request(app)
        .get(`/api/v1/payment/refund/history/${newOrder._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('GET /api/v1/payment/refund/:refundId - Get Refund Details', () => {
    it('should retrieve refund details by ID', async () => {
      // Create refund
      const createRes = await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 5000,
          reason: 'Test refund',
        });

      const refundId = createRes.body.data.refundId;

      // Get details
      const res = await request(app)
        .get(`/api/v1/payment/refund/${refundId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveProperty('refundId');
      expect(res.body.data).toHaveProperty('orderId');
      expect(res.body.data).toHaveProperty('amount');
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('initiatedBy');
    });

    it('should return 404 for non-existent refund', async () => {
      const fakeRefundId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/v1/payment/refund/${fakeRefundId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.message).toMatch(/not found/i);
    });
  });

  describe('Refund Audit Trail', () => {
    it('should track refund initiator', async () => {
      await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 5000,
          reason: 'Audit test',
        });

      const refund = await Refund.findOne({ orderId: testOrder._id });
      expect(refund.initiatedBy).toEqual(adminUser._id);
    });

    it('should track refund timestamps', async () => {
      await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 5000,
          reason: 'Timestamp test',
        });

      const refund = await Refund.findOne({ orderId: testOrder._id });
      expect(refund.createdAt).toBeDefined();
      expect(refund.updatedAt).toBeDefined();
    });

    it('should track refund status changes', async () => {
      await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 5000,
          reason: 'Status test',
        });

      const refund = await Refund.findOne({ orderId: testOrder._id });
      expect(refund.status).toMatch(/INITIATED|PROCESSING|SUCCESS/);
    });
  });

  describe('Refund Error Handling', () => {
    it('should handle gateway timeout gracefully', async () => {
      // Mock Razorpay to timeout
      jest.mock('../../src/modules/payment/payment.gateway.js', () => ({
        createRefund: jest.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 20000));
          throw new Error('Gateway timeout');
        }),
      }));

      const res = await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 5000,
          reason: 'Timeout test',
        })
        .timeout(5000);

      // Should handle timeout
      expect([200, 500, 408]).toContain(res.status);

      jest.restoreAllMocks();
    }, 10000);

    it('should handle gateway failure with proper error message', async () => {
      // Mock Razorpay to fail
      jest.mock('../../src/modules/payment/payment.gateway.js', () => ({
        createRefund: jest.fn(async () => {
          throw new Error('Payment gateway error');
        }),
      }));

      const res = await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 5000,
          reason: 'Gateway error test',
        });

      // Should handle error gracefully
      expect([200, 500]).toContain(res.status);

      jest.restoreAllMocks();
    });

    it('should prevent refund for non-existent order', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: fakeOrderId.toString(),
          amount: 5000,
          reason: 'Non-existent order',
        })
        .expect(404);

      expect(res.body.message).toMatch(/order not found/i);
    });
  });

  describe('Concurrent Refund Scenarios', () => {
    it('should prevent duplicate refunds from concurrent requests', async () => {
      const promises = [];

      // 5 concurrent refund attempts
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/v1/payment/refund')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              orderId: testOrder._id.toString(),
              amount: 5000,
              reason: `Concurrent attempt ${i}`,
            })
        );
      }

      const results = await Promise.all(promises);

      // Only one should succeed
      const successes = results.filter(r => r.status === 200).length;
      const conflicts = results.filter(r => r.status === 409).length;

      expect(successes).toBe(1);
      expect(conflicts).toBe(4);

      // Verify only one refund created
      const refunds = await Refund.find({ orderId: testOrder._id });
      expect(refunds.length).toBe(1);
    });
  });
});
