import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import Order from '../../src/modules/order/order.model.js';
import Payment from '../../src/modules/payment/payment.model.js';
import User from '../../src/modules/user/user.model.js';
import Credit from '../../src/modules/credit/credit.model.js';
import { verifyPayment, hybridPayment } from '../../src/modules/payment/payment.service.js';
import { clearDatabase, generateTestUser, generateTestOrder } from '../helpers/testUtils.js';
import { hashPassword } from '../../src/utils/hashPassword.js';
import { USER_STATUS } from '../../src/constants/userStatus.js';
import { ORDER_STATUS } from '../../src/constants/orderStatus.js';
import { PAYMENT_STATUS } from '../../src/constants/paymentStatus.js';
import { redisClient } from '../../src/config/redis.js';

/**
 * 🔒 Payment Concurrency & Race Condition Tests
 * Tests for concurrent payment verification, webhook processing, and hybrid payments
 */
describe('Payment Concurrency Tests', () => {
  let testUser;
  let testOrder;
  let testPayment;

  beforeEach(async () => {
    await clearDatabase();
    
    // Create test user
    const hashedPassword = await hashPassword('Test@1234');
    testUser = await User.create({
      ...generateTestUser({ email: 'concurrent@test.com' }),
      password: hashedPassword,
      status: USER_STATUS.ACTIVE,
    });

    // Create test order
    testOrder = await Order.create({
      ...generateTestOrder({
        userId: testUser._id,
        totalAmount: 10000,
      }),
      userId: testUser._id,
      status: ORDER_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.PENDING,
    });

    // Create test payment
    testPayment = await Payment.create({
      orderId: testOrder._id,
      userId: testUser._id,
      amount: 10000,
      razorpayOrderId: 'order_test123',
      status: PAYMENT_STATUS.PENDING,
      paymentMethod: 'ONLINE',
    });

    // Clear Redis before each test
    await redisClient.flushdb();
  });

  afterEach(async () => {
    await redisClient.flushdb();
  });

  describe('Concurrent Payment Verification', () => {
    it('should prevent duplicate payment verification from concurrent requests', async () => {
      const razorpay_order_id = testPayment.razorpayOrderId;
      const razorpay_payment_id = 'pay_concurrent123';
      const razorpay_signature = 'valid_signature';

      // Mock signature verification
      jest.spyOn(require('../../src/modules/payment/payment.gateway.js'), 'verifyPayment')
        .mockResolvedValue(true);

      // Simulate 5 concurrent verification requests
      const concurrentRequests = Array(5).fill(null).map(() =>
        verifyPayment({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        })
      );

      const results = await Promise.allSettled(concurrentRequests);

      // Count successful vs rejected
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const rejected = results.filter(r => r.status === 'rejected').length;

      // At most ONE should succeed due to Redis replay protection
      expect(successful).toBeLessThanOrEqual(1);
      expect(rejected).toBeGreaterThanOrEqual(4);

      // Verify payment marked as processed in Redis
      const redisKey = `payment:processed:${razorpay_payment_id}`;
      const isProcessed = await redisClient.get(redisKey);
      expect(isProcessed).toBe('1');

      // Verify only ONE payment record updated
      const updatedPayment = await Payment.findById(testPayment._id);
      expect(updatedPayment.status).toBe(PAYMENT_STATUS.SUCCESS);
      expect(updatedPayment.razorpayPaymentId).toBe(razorpay_payment_id);

      // Verify order payment status updated only once
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.paymentStatus).toBe(PAYMENT_STATUS.PAID);
    });

    it('should handle concurrent verification with different payment IDs', async () => {
      const razorpay_order_id = testPayment.razorpayOrderId;
      
      // Mock signature verification
      jest.spyOn(require('../../src/modules/payment/payment.gateway.js'), 'verifyPayment')
        .mockResolvedValue(true);

      // Different payment IDs (simulating race from different users)
      const paymentIds = ['pay_user1', 'pay_user2', 'pay_user3'];
      
      const concurrentRequests = paymentIds.map(paymentId =>
        verifyPayment({
          razorpay_order_id,
          razorpay_payment_id: paymentId,
          razorpay_signature: 'valid_sig',
        })
      );

      const results = await Promise.allSettled(concurrentRequests);

      // Only the FIRST payment should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBe(1);

      // Verify order is marked PAID
      const order = await Order.findById(testOrder._id);
      expect(order.paymentStatus).toBe(PAYMENT_STATUS.PAID);

      // Verify payment updated with first successful payment ID
      const payment = await Payment.findById(testPayment._id);
      expect(payment.razorpayPaymentId).toBeDefined();
      expect(paymentIds).toContain(payment.razorpayPaymentId);
    });

    it('should prevent replay attack with idempotency key', async () => {
      const razorpay_payment_id = 'pay_replay123';
      
      // First request succeeds
      await redisClient.setex(`payment:processed:${razorpay_payment_id}`, 86400, '1');

      // Mock signature verification
      jest.spyOn(require('../../src/modules/payment/payment.gateway.js'), 'verifyPayment')
        .mockResolvedValue(true);

      // Attempt to verify again (replay attack)
      await expect(
        verifyPayment({
          razorpay_order_id: testPayment.razorpayOrderId,
          razorpay_payment_id,
          razorpay_signature: 'valid_sig',
        })
      ).rejects.toThrow(/already processed|duplicate/i);
    });
  });

  describe('Concurrent Hybrid Payment Execution', () => {
    beforeEach(async () => {
      // Create credit for hybrid payment tests
      await Credit.create({
        userId: testUser._id,
        totalCredit: 5000,
        availableCredit: 5000,
        usedCredit: 0,
        status: 'ACTIVE',
      });
    });

    it('should prevent double credit deduction from concurrent hybrid payments', async () => {
      const orderId = testOrder._id.toString();
      const userId = testUser._id.toString();

      // Simulate 3 concurrent hybrid payment calls
      const concurrentPayments = Array(3).fill(null).map(() =>
        hybridPayment(orderId, userId, true, 10000, 'HYBRID')
      );

      const results = await Promise.allSettled(concurrentPayments);

      // Only ONE should succeed due to distributed lock
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const rejected = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBe(1);
      expect(rejected).toBe(2);

      // Verify credit deducted only ONCE
      const credit = await Credit.findOne({ userId: testUser._id });
      expect(credit.usedCredit).toBe(5000); // Only deducted once
      expect(credit.availableCredit).toBe(0);

      // Verify rejected requests got lock error
      const errors = results
        .filter(r => r.status === 'rejected')
        .map(r => r.reason.message);
      
      errors.forEach(error => {
        expect(error).toMatch(/already in progress|lock/i);
      });
    });

    it('should handle concurrent hybrid payments for different orders', async () => {
      // Create second order and user
      const hashedPassword = await hashPassword('Test@1234');
      const user2 = await User.create({
        ...generateTestUser({ email: 'user2@test.com' }),
        password: hashedPassword,
        status: USER_STATUS.ACTIVE,
      });

      const order2 = await Order.create({
        ...generateTestOrder({
          userId: user2._id,
          totalAmount: 8000,
        }),
        userId: user2._id,
        status: ORDER_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.PENDING,
      });

      await Credit.create({
        userId: user2._id,
        totalCredit: 3000,
        availableCredit: 3000,
        usedCredit: 0,
        status: 'ACTIVE',
      });

      // Concurrent payments for DIFFERENT orders should both succeed
      const [result1, result2] = await Promise.allSettled([
        hybridPayment(testOrder._id.toString(), testUser._id.toString(), true, 10000, 'HYBRID'),
        hybridPayment(order2._id.toString(), user2._id.toString(), true, 8000, 'HYBRID'),
      ]);

      // Both should succeed (different lock keys)
      expect(result1.status).toBe('fulfilled');
      expect(result2.status).toBe('fulfilled');

      // Verify both credits deducted correctly
      const credit1 = await Credit.findOne({ userId: testUser._id });
      expect(credit1.usedCredit).toBe(5000);

      const credit2 = await Credit.findOne({ userId: user2._id });
      expect(credit2.usedCredit).toBe(3000);
    });

    it('should prevent credit reversal race condition on Razorpay failure', async () => {
      // Mock Razorpay order creation to fail
      jest.spyOn(require('../../src/modules/payment/payment.gateway.js'), 'createPaymentOrder')
        .mockRejectedValue(new Error('Razorpay API failure'));

      const orderId = testOrder._id.toString();
      const userId = testUser._id.toString();

      // Attempt hybrid payment (should fail and revert credit)
      await expect(
        hybridPayment(orderId, userId, true, 10000, 'HYBRID')
      ).rejects.toThrow(/Razorpay/i);

      // Verify credit was NOT permanently deducted
      const credit = await Credit.findOne({ userId: testUser._id });
      expect(credit.availableCredit).toBe(5000); // Restored
      expect(credit.usedCredit).toBe(0); // Reverted

      // Verify no orphan payment record
      const payments = await Payment.find({ orderId: testOrder._id });
      expect(payments.length).toBe(1); // Only the test setup payment
    });
  });

  describe('Distributed Lock Behavior', () => {
    it('should release lock after successful payment', async () => {
      const orderId = testOrder._id.toString();
      const lockKey = `payment:lock:${orderId}`;

      // Execute payment
      await hybridPayment(orderId, testUser._id.toString(), false, 10000, 'COD');

      // Verify lock is released
      const lockExists = await redisClient.get(lockKey);
      expect(lockExists).toBeNull();
    });

    it('should release lock after payment failure', async () => {
      const orderId = testOrder._id.toString();
      const lockKey = `payment:lock:${orderId}`;

      // Mock failure
      jest.spyOn(Order, 'findById').mockRejectedValue(new Error('DB error'));

      await expect(
        hybridPayment(orderId, testUser._id.toString(), false, 10000)
      ).rejects.toThrow();

      // Verify lock is released even on error
      const lockExists = await redisClient.get(lockKey);
      expect(lockExists).toBeNull();
    });

    it('should handle lock timeout correctly', async () => {
      const orderId = testOrder._id.toString();
      const lockKey = `payment:lock:${orderId}`;
      const lockValue = `test-${Date.now()}`;

      // Manually acquire lock
      await redisClient.set(lockKey, lockValue, 'EX', 30);

      // Attempt payment (should fail due to lock)
      await expect(
        hybridPayment(orderId, testUser._id.toString(), false, 10000)
      ).rejects.toThrow(/already in progress/i);

      // Verify lock still exists
      const lockStillExists = await redisClient.get(lockKey);
      expect(lockStillExists).toBe(lockValue);
    });
  });
});
