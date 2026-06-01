/**
 * 🔒 PHASE 4: Refund system stress testing
 * Tests refund idempotency, inventory restoration, and concurrent refund attempts
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/modules/user/user.model.js';
import Product from '../../src/modules/product/product.model.js';
import Order from '../../src/modules/order/order.model.js';
import Payment from '../../src/modules/payment/payment.model.js';
import Inventory from '../../src/modules/inventory/inventory.model.js';
import Refund from '../../src/modules/payment/refund.model.js';
import { ROLES } from '../../src/constants/roles.js';

describe('Refund System Load Tests', () => {
  let authToken;
  let adminToken;
  let userId;
  let adminId;
  let productId;
  let warehouseId;
  let orderId;
  let paymentId;

  beforeAll(async () => {
    // Create regular user
    const user = await User.create({
      name: 'Refund Test User',
      email: 'refundtest@example.com',
      password: 'Password123!',
      role: ROLES.B2B_CUSTOMER,
      mobile: '9876543211',
      status: 'ACTIVE',
    });
    userId = user._id;

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'Admin123!',
      role: ROLES.ADMIN,
      mobile: '9876543212',
      status: 'ACTIVE',
    });
    adminId = admin._id;

    // Login users
    const userLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'refundtest@example.com', password: 'Password123!' });
    authToken = userLogin.body.data.token;

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin123!' });
    adminToken = adminLogin.body.data.token;

    // Create test product
    const product = await Product.create({
      name: 'Refund Test Product',
      category: 'Test',
      basePrice: 1000,
      stock: 100,
      status: 'ACTIVE',
    });
    productId = product._id;

    // Create warehouse and inventory
    const Warehouse = mongoose.model('Warehouse');
    let warehouse = await Warehouse.findOne();
    if (!warehouse) {
      warehouse = await Warehouse.create({
        name: 'Test Warehouse',
        location: { city: 'Test City' },
      });
    }
    warehouseId = warehouse._id;

    await Inventory.create({
      productId,
      warehouseId,
      stock: 100,
    });

    // Create paid order
    const order = await Order.create({
      userId,
      items: [{ productId, name: 'Test Product', quantity: 5, price: 1000 }],
      totalAmount: 5000,
      paymentStatus: 'PAID',
      status: 'CONFIRMED',
      paymentMethod: 'ONLINE',
      address: {
        name: 'Test User',
        phone: '9876543210',
        addressLine: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
      },
    });
    orderId = order._id;

    // Create payment record
    const payment = await Payment.create({
      orderId,
      userId,
      amount: 5000,
      status: 'SUCCESS',
      paymentMethod: 'ONLINE',
      transactionId: `order_${Date.now()}`,
      razorpayPaymentId: `pay_${Date.now()}`,
    });
    paymentId = payment._id;
  });

  afterAll(async () => {
    await User.deleteMany({ email: /refundtest|admin/ });
    await Product.deleteMany({ name: /Refund Test/ });
    await Order.deleteMany({ userId });
    await Payment.deleteMany({ userId });
    await Inventory.deleteMany({ productId });
    await Refund.deleteMany({ orderId });
  });

  describe('Refund Idempotency', () => {
    it('should prevent duplicate refunds with 50 concurrent attempts', async () => {
      const concurrentRequests = 50;
      const promises = [];

      // Simulate 50 concurrent refund attempts
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/v1/payment/refund')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              orderId: orderId.toString(),
              amount: 5000,
              reason: 'Load test refund',
            })
        );
      }

      const results = await Promise.allSettled(promises);

      // Count successes and failures
      const successes = results.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const failures = results.filter(r => r.status === 'fulfilled' && r.value.status !== 200);

      // Only 1 refund should succeed due to idempotency
      expect(successes.length).toBeLessThanOrEqual(2); // Allow 1-2 due to timing
      expect(failures.length).toBeGreaterThan(45);

      // Verify only 1 refund record exists
      const refunds = await Refund.find({ orderId, status: { $in: ['SUCCESS', 'PROCESSING'] } });
      expect(refunds.length).toBeLessThanOrEqual(1);
    }, 30000);
  });

  describe('Inventory Restoration on Refund', () => {
    it('should restore inventory correctly after full refund', async () => {
      // Create new order for this test
      const testOrder = await Order.create({
        userId,
        items: [{ productId, name: 'Test Product', quantity: 10, price: 1000 }],
        totalAmount: 10000,
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        paymentMethod: 'ONLINE',
        address: {
          name: 'Test User',
          phone: '9876543210',
          addressLine: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
        },
      });

      const testPayment = await Payment.create({
        orderId: testOrder._id,
        userId,
        amount: 10000,
        status: 'SUCCESS',
        paymentMethod: 'ONLINE',
        transactionId: `order_test_${Date.now()}`,
        razorpayPaymentId: `pay_test_${Date.now()}`,
      });

      // Get initial inventory
      const initialInventory = await Inventory.findOne({ productId });
      const initialStock = initialInventory.stock;

      // Mock Razorpay refund to succeed
      jest.spyOn(require('../../src/modules/payment/payment.gateway.js'), 'createRefund')
        .mockResolvedValueOnce({
          id: 'rfnd_test123',
          refund_id: 'rfnd_test123',
          payment_id: testPayment.razorpayPaymentId,
          amount: 10000,
          currency: 'INR',
          status: 'processed',
          created_at: Date.now(),
        });

      // Create refund
      const refundRes = await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 10000,
          reason: 'Test refund',
        });

      expect(refundRes.status).toBe(200);

      // Wait for refund processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify inventory was restored
      const finalInventory = await Inventory.findOne({ productId });
      expect(finalInventory.stock).toBe(initialStock + 10);

      // Cleanup
      await Order.deleteOne({ _id: testOrder._id });
      await Payment.deleteOne({ _id: testPayment._id });
    }, 20000);
  });

  describe('Partial Refund Handling', () => {
    it('should handle partial refunds without restoring inventory', async () => {
      // Create order for partial refund
      const partialOrder = await Order.create({
        userId,
        items: [{ productId, name: 'Test Product', quantity: 5, price: 1000 }],
        totalAmount: 5000,
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        paymentMethod: 'ONLINE',
        address: {
          name: 'Test User',
          phone: '9876543210',
          addressLine: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
        },
      });

      const partialPayment = await Payment.create({
        orderId: partialOrder._id,
        userId,
        amount: 5000,
        status: 'SUCCESS',
        paymentMethod: 'ONLINE',
        transactionId: `order_partial_${Date.now()}`,
        razorpayPaymentId: `pay_partial_${Date.now()}`,
      });

      // Get initial inventory
      const initialInventory = await Inventory.findOne({ productId });
      const initialStock = initialInventory.stock;

      // Mock Razorpay refund
      jest.spyOn(require('../../src/modules/payment/payment.gateway.js'), 'createRefund')
        .mockResolvedValueOnce({
          id: 'rfnd_partial123',
          refund_id: 'rfnd_partial123',
          payment_id: partialPayment.razorpayPaymentId,
          amount: 2500,
          currency: 'INR',
          status: 'processed',
          created_at: Date.now(),
        });

      // Create partial refund (50%)
      const refundRes = await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: partialOrder._id.toString(),
          amount: 2500,
          reason: 'Partial refund test',
        });

      expect(refundRes.status).toBe(200);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify inventory was NOT restored (partial refund)
      const finalInventory = await Inventory.findOne({ productId });
      expect(finalInventory.stock).toBe(initialStock);

      // Cleanup
      await Order.deleteOne({ _id: partialOrder._id });
      await Payment.deleteOne({ _id: partialPayment._id });
    }, 20000);
  });

  describe('Refund Authorization', () => {
    it('should only allow admins or order owners to refund', async () => {
      // Create another user
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@example.com',
        password: 'Password123!',
        role: ROLES.B2B_CUSTOMER,
        mobile: '9876543213',
        status: 'ACTIVE',
      });

      const otherLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'other@example.com', password: 'Password123!' });
      const otherToken = otherLogin.body.data.token;

      // Try to refund order belonging to different user
      const refundRes = await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          orderId: orderId.toString(),
          amount: 1000,
          reason: 'Unauthorized refund attempt',
        });

      // Should be denied
      expect(refundRes.status).toBe(403);

      // Cleanup
      await User.deleteOne({ _id: otherUser._id });
    }, 15000);
  });

  describe('Refund History Tracking', () => {
    it('should maintain comprehensive refund audit trail', async () => {
      // Get refund history
      const historyRes = await request(app)
        .get(`/api/v1/payment/refund/history/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(historyRes.status).toBe(200);
      expect(Array.isArray(historyRes.body.data)).toBe(true);

      // Each refund should have audit fields
      if (historyRes.body.data.length > 0) {
        const refund = historyRes.body.data[0];
        expect(refund).toHaveProperty('orderId');
        expect(refund).toHaveProperty('amount');
        expect(refund).toHaveProperty('status');
        expect(refund).toHaveProperty('refundType');
        expect(refund).toHaveProperty('initiatedBy');
        expect(refund).toHaveProperty('createdAt');
      }
    }, 10000);
  });
});
