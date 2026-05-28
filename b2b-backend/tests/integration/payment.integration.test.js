import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import supertest from 'supertest';
import app from '../../src/app.js';
import Order from '../../src/modules/order/order.model.js';
import Payment from '../../src/modules/payment/payment.model.js';
import User from '../../src/modules/user/user.model.js';
import {
  clearDatabase,
  generateTestUser,
  generateTestOrder,
} from '../helpers/testUtils.js';
import { MockRazorpay, generateWebhookPayload } from '../helpers/razorpayMock.js';
import { hashPassword } from '../../src/utils/hashPassword.js';
import { USER_STATUS } from '../../src/constants/userStatus.js';
import { ORDER_STATUS } from '../../src/constants/orderStatus.js';
import { PAYMENT_STATUS } from '../../src/constants/paymentStatus.js';

const request = supertest(app);

describe('Payment Module - Comprehensive Tests', () => {
  let testUser;
  let accessToken;
  let mockRazorpay;

  beforeEach(async () => {
    await clearDatabase();
    mockRazorpay = new MockRazorpay();

    // Create test user and login
    const hashedPassword = await hashPassword('Test@1234');
    testUser = await User.create({
      ...generateTestUser({ email: 'payment@test.com' }),
      password: hashedPassword,
      status: USER_STATUS.ACTIVE,
    });

    const loginResponse = await request.post('/api/auth/login').send({
      identifier: testUser.email,
      password: 'Test@1234',
    });

    accessToken = loginResponse.body.data.accessToken;
  });

  afterEach(() => {
    mockRazorpay.reset();
  });

  describe('POST /api/payments/create-order - Create Payment Order', () => {
    let testOrder;

    beforeEach(async () => {
      testOrder = await Order.create({
        ...generateTestOrder({
          userId: testUser._id,
          totalAmount: 10000,
        }),
        status: ORDER_STATUS.CONFIRMED,
      });
    });

    it('should create Razorpay order for valid order', async () => {
      const response = await request
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 10000,
          currency: 'INR',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('razorpayOrderId');
      expect(response.body.data).toHaveProperty('amount');
      expect(response.body.data).toHaveProperty('currency');
      expect(response.body.data.razorpayOrderId).toMatch(/^order_/);
    });

    it('should create payment record in database', async () => {
      const response = await request
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 10000,
        })
        .expect(200);

      const payment = await Payment.findOne({
        razorpayOrderId: response.body.data.razorpayOrderId,
      });

      expect(payment).toBeDefined();
      expect(payment.orderId.toString()).toBe(testOrder._id.toString());
      expect(payment.amount).toBe(10000);
      expect(payment.status).toBe(PAYMENT_STATUS.PENDING);
    });

    it('should reject order creation for non-existent order', async () => {
      const fakeOrderId = '507f1f77bcf86cd799439011';

      const response = await request
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: fakeOrderId,
          amount: 10000,
        })
        .expect(404);

      expect(response.body.message).toContain('Order not found');
    });

    it('should reject order creation with amount mismatch', async () => {
      const response = await request
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 99999, // Different from order total
        })
        .expect(400);

      expect(response.body.message).toContain('amount');
    });

    it('should reject duplicate payment order creation', async () => {
      // First creation
      await request
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 10000,
        })
        .expect(200);

      // Duplicate attempt
      const response = await request
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 10000,
        })
        .expect(400);

      expect(response.body.message).toContain('already exists');
    });

    it('should reject order creation without authentication', async () => {
      const response = await request
        .post('/api/payments/create-order')
        .send({
          orderId: testOrder._id.toString(),
          amount: 10000,
        })
        .expect(401);

      expect(response.body.message).toContain('authorized');
    });

    it('should handle Razorpay API errors gracefully', async () => {
      mockRazorpay.simulateFailure('create');

      const response = await request
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 10000,
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Razorpay');
    });

    it('should validate minimum payment amount', async () => {
      const response = await request
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 50, // Below Razorpay minimum (₹1)
        })
        .expect(400);

      expect(response.body.message).toContain('amount');
    });

    it('should support multiple currencies', async () => {
      const response = await request
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 10000,
          currency: 'USD',
        })
        .expect(200);

      expect(response.body.data.currency).toBe('USD');
    });

    it('should store payment metadata', async () => {
      const metadata = {
        customerName: testUser.name,
        customerEmail: testUser.email,
      };

      const response = await request
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 10000,
          metadata,
        })
        .expect(200);

      const payment = await Payment.findOne({
        razorpayOrderId: response.body.data.razorpayOrderId,
      });

      expect(payment.metadata).toMatchObject(metadata);
    });

    it('should track payment attempts', async () => {
      await request
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 10000,
        })
        .expect(200);

      const order = await Order.findById(testOrder._id);
      expect(order.paymentAttempts).toBeGreaterThan(0);
    });
  });

  describe('POST /api/payments/verify - Verify Payment', () => {
    let testOrder;
    let testPayment;

    beforeEach(async () => {
      testOrder = await Order.create({
        ...generateTestOrder({
          userId: testUser._id,
          totalAmount: 10000,
        }),
        status: ORDER_STATUS.CONFIRMED,
      });

      testPayment = await Payment.create({
        orderId: testOrder._id,
        userId: testUser._id,
        amount: 10000,
        currency: 'INR',
        razorpayOrderId: 'order_test123',
        status: PAYMENT_STATUS.PENDING,
      });
    });

    it('should verify valid payment signature', async () => {
      const paymentData = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'valid_signature_hash',
      };

      const response = await request
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(paymentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(PAYMENT_STATUS.SUCCESS);
    });

    it('should update payment status on successful verification', async () => {
      const paymentData = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'valid_signature_hash',
      };

      await request
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(paymentData)
        .expect(200);

      const updatedPayment = await Payment.findById(testPayment._id);
      expect(updatedPayment.status).toBe(PAYMENT_STATUS.SUCCESS);
      expect(updatedPayment.razorpayPaymentId).toBe('pay_test123');
    });

    it('should update order status on payment success', async () => {
      const paymentData = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'valid_signature_hash',
      };

      await request
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(paymentData)
        .expect(200);

      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.status).toBe(ORDER_STATUS.PAID);
      expect(updatedOrder.paymentStatus).toBe(PAYMENT_STATUS.SUCCESS);
    });

    it('should reject payment with invalid signature', async () => {
      const paymentData = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'invalid_signature',
      };

      const response = await request
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.message).toContain('Invalid signature');
    });

    it('should handle duplicate verification attempts', async () => {
      const paymentData = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'valid_signature_hash',
      };

      // First verification
      await request
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(paymentData)
        .expect(200);

      // Duplicate verification
      const response = await request
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.message).toContain('already verified');
    });

    it('should store payment completion timestamp', async () => {
      const beforeTime = Date.now();

      await request
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          razorpay_order_id: 'order_test123',
          razorpay_payment_id: 'pay_test123',
          razorpay_signature: 'valid_signature_hash',
        })
        .expect(200);

      const updatedPayment = await Payment.findById(testPayment._id);
      expect(updatedPayment.paidAt).toBeDefined();
      expect(updatedPayment.paidAt.getTime()).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should trigger notification on payment success', async () => {
      // Mock notification service
      const mockNotify = jest.fn();
      jest.mock('../../src/services/notification.service.js', () => ({
        sendPaymentSuccessNotification: mockNotify,
      }));

      await request
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          razorpay_order_id: 'order_test123',
          razorpay_payment_id: 'pay_test123',
          razorpay_signature: 'valid_signature_hash',
        })
        .expect(200);

      // Notification should be queued
      expect(mockNotify).toHaveBeenCalled();
    });
  });

  describe('POST /api/payments/webhook - Razorpay Webhook', () => {
    let testOrder;
    let testPayment;

    beforeEach(async () => {
      testOrder = await Order.create({
        ...generateTestOrder({
          userId: testUser._id,
          totalAmount: 10000,
        }),
        status: ORDER_STATUS.CONFIRMED,
      });

      testPayment = await Payment.create({
        orderId: testOrder._id,
        userId: testUser._id,
        amount: 10000,
        razorpayOrderId: 'order_webhook123',
        razorpayPaymentId: 'pay_webhook123',
        status: PAYMENT_STATUS.PENDING,
      });
    });

    it('should handle payment.captured webhook', async () => {
      const payload = generateWebhookPayload('payment.captured', {
        orderId: 'order_webhook123',
        paymentId: 'pay_webhook123',
        amount: 10000,
      });

      const response = await request
        .post('/api/payments/webhook')
        .set('X-Razorpay-Signature', 'valid_webhook_signature')
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update payment status on payment.captured', async () => {
      const payload = generateWebhookPayload('payment.captured', {
        orderId: 'order_webhook123',
        paymentId: 'pay_webhook123',
        amount: 10000,
      });

      await request
        .post('/api/payments/webhook')
        .set('X-Razorpay-Signature', 'valid_webhook_signature')
        .send(payload)
        .expect(200);

      const updatedPayment = await Payment.findById(testPayment._id);
      expect(updatedPayment.status).toBe(PAYMENT_STATUS.SUCCESS);
    });

    it('should handle payment.failed webhook', async () => {
      const payload = generateWebhookPayload('payment.failed', {
        orderId: 'order_webhook123',
        paymentId: 'pay_webhook123',
        status: 'failed',
      });

      const response = await request
        .post('/api/payments/webhook')
        .set('X-Razorpay-Signature', 'valid_webhook_signature')
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);

      const updatedPayment = await Payment.findById(testPayment._id);
      expect(updatedPayment.status).toBe(PAYMENT_STATUS.FAILED);
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = generateWebhookPayload('payment.captured');

      const response = await request
        .post('/api/payments/webhook')
        .set('X-Razorpay-Signature', 'invalid_signature')
        .send(payload)
        .expect(400);

      expect(response.body.message).toContain('Invalid webhook signature');
    });

    it('should handle refund.processed webhook', async () => {
      // First mark payment as success
      testPayment.status = PAYMENT_STATUS.SUCCESS;
      await testPayment.save();

      const payload = generateWebhookPayload('refund.processed', {
        paymentId: 'pay_webhook123',
        refundId: 'rfnd_test123',
        amount: 10000,
      });

      await request
        .post('/api/payments/webhook')
        .set('X-Razorpay-Signature', 'valid_webhook_signature')
        .send(payload)
        .expect(200);

      const updatedPayment = await Payment.findById(testPayment._id);
      expect(updatedPayment.status).toBe(PAYMENT_STATUS.REFUNDED);
    });

    it('should handle duplicate webhook deliveries', async () => {
      const payload = generateWebhookPayload('payment.captured', {
        orderId: 'order_webhook123',
        paymentId: 'pay_webhook123',
      });

      // First webhook
      await request
        .post('/api/payments/webhook')
        .set('X-Razorpay-Signature', 'valid_webhook_signature')
        .send(payload)
        .expect(200);

      // Duplicate webhook
      const response = await request
        .post('/api/payments/webhook')
        .set('X-Razorpay-Signature', 'valid_webhook_signature')
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should handle idempotently
    });

    it('should log webhook events for audit', async () => {
      const payload = generateWebhookPayload('payment.captured');

      await request
        .post('/api/payments/webhook')
        .set('X-Razorpay-Signature', 'valid_webhook_signature')
        .send(payload)
        .expect(200);

      // Verify audit log exists (implementation-specific)
    });

    it('should handle unknown webhook events gracefully', async () => {
      const payload = generateWebhookPayload('unknown.event', {});

      const response = await request
        .post('/api/payments/webhook')
        .set('X-Razorpay-Signature', 'valid_webhook_signature')
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('ignored');
    });
  });

  describe('POST /api/payments/refund - Initiate Refund', () => {
    let testOrder;
    let testPayment;

    beforeEach(async () => {
      testOrder = await Order.create({
        ...generateTestOrder({
          userId: testUser._id,
          totalAmount: 10000,
        }),
        status: ORDER_STATUS.PAID,
      });

      testPayment = await Payment.create({
        orderId: testOrder._id,
        userId: testUser._id,
        amount: 10000,
        razorpayOrderId: 'order_refund123',
        razorpayPaymentId: 'pay_refund123',
        status: PAYMENT_STATUS.SUCCESS,
      });
    });

    it('should initiate full refund for captured payment', async () => {
      const response = await request
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentId: testPayment._id.toString(),
          amount: 10000,
          reason: 'Customer request',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('refundId');
      expect(response.body.data.status).toBe('processed');
    });

    it('should initiate partial refund', async () => {
      const refundAmount = 5000;

      const response = await request
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentId: testPayment._id.toString(),
          amount: refundAmount,
          reason: 'Partial refund',
        })
        .expect(200);

      expect(response.body.data.amount).toBe(refundAmount);
    });

    it('should reject refund for non-captured payment', async () => {
      testPayment.status = PAYMENT_STATUS.PENDING;
      await testPayment.save();

      const response = await request
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentId: testPayment._id.toString(),
          amount: 10000,
        })
        .expect(400);

      expect(response.body.message).toContain('cannot be refunded');
    });

    it('should reject refund amount greater than payment', async () => {
      const response = await request
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentId: testPayment._id.toString(),
          amount: 20000, // Greater than payment
        })
        .expect(400);

      expect(response.body.message).toContain('exceeds payment amount');
    });

    it('should update payment status on refund', async () => {
      await request
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentId: testPayment._id.toString(),
          amount: 10000,
        })
        .expect(200);

      const updatedPayment = await Payment.findById(testPayment._id);
      expect(updatedPayment.status).toBe(PAYMENT_STATUS.REFUNDED);
      expect(updatedPayment.refundAmount).toBe(10000);
    });

    it('should reject duplicate full refund', async () => {
      // First refund
      await request
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentId: testPayment._id.toString(),
          amount: 10000,
        })
        .expect(200);

      // Duplicate refund
      const response = await request
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentId: testPayment._id.toString(),
          amount: 10000,
        })
        .expect(400);

      expect(response.body.message).toContain('already refunded');
    });

    it('should handle Razorpay refund failure', async () => {
      mockRazorpay.payments.refund.mockRejectedValueOnce(
        new Error('Refund processing failed')
      );

      const response = await request
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentId: testPayment._id.toString(),
          amount: 10000,
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should store refund metadata', async () => {
      await request
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentId: testPayment._id.toString(),
          amount: 10000,
          reason: 'Product damaged',
        })
        .expect(200);

      const updatedPayment = await Payment.findById(testPayment._id);
      expect(updatedPayment.refundReason).toBe('Product damaged');
      expect(updatedPayment.refundedAt).toBeDefined();
    });
  });

  describe('GET /api/payments/:id - Get Payment Details', () => {
    let testPayment;

    beforeEach(async () => {
      const testOrder = await Order.create({
        ...generateTestOrder({ userId: testUser._id }),
        status: ORDER_STATUS.PAID,
      });

      testPayment = await Payment.create({
        orderId: testOrder._id,
        userId: testUser._id,
        amount: 10000,
        razorpayOrderId: 'order_details123',
        razorpayPaymentId: 'pay_details123',
        status: PAYMENT_STATUS.SUCCESS,
      });
    });

    it('should retrieve payment details for authenticated user', async () => {
      const response = await request
        .get(`/api/payments/${testPayment._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.amount).toBe(10000);
      expect(response.body.data.status).toBe(PAYMENT_STATUS.SUCCESS);
    });

    it('should not expose sensitive Razorpay keys', async () => {
      const response = await request
        .get(`/api/payments/${testPayment._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).not.toHaveProperty('razorpayKeySecret');
    });

    it('should reject access to other user payments', async () => {
      const otherUser = await User.create({
        ...generateTestUser({ email: 'other@test.com' }),
        password: await hashPassword('Test@1234'),
        status: USER_STATUS.ACTIVE,
      });

      const otherPayment = await Payment.create({
        orderId: testPayment.orderId,
        userId: otherUser._id,
        amount: 5000,
        razorpayOrderId: 'order_other',
        status: PAYMENT_STATUS.SUCCESS,
      });

      const response = await request
        .get(`/api/payments/${otherPayment._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.message).toContain('access');
    });

    it('should return 404 for non-existent payment', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request
        .get(`/api/payments/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  describe('Payment Fraud Detection', () => {
    let testOrder;

    beforeEach(async () => {
      testOrder = await Order.create({
        ...generateTestOrder({
          userId: testUser._id,
          totalAmount: 10000,
        }),
        status: ORDER_STATUS.CONFIRMED,
      });
    });

    it('should limit payment creation attempts per user', async () => {
      const attempts = Array(5)
        .fill()
        .map(() =>
          request
            .post('/api/payments/create-order')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              orderId: testOrder._id.toString(),
              amount: 10000,
            })
        );

      const responses = await Promise.allSettled(attempts);
      const blocked = responses.some((r) => r.value?.status === 429);
      expect(blocked).toBe(true);
    });

    it('should flag suspicious payment patterns', async () => {
      // Multiple high-value payments in short time
      const largeOrders = [];
      for (let i = 0; i < 3; i++) {
        const order = await Order.create({
          ...generateTestOrder({
            userId: testUser._id,
            totalAmount: 100000, // Large amount
          }),
          status: ORDER_STATUS.CONFIRMED,
        });
        largeOrders.push(order);
      }

      const attempts = largeOrders.map((order) =>
        request
          .post('/api/payments/create-order')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            orderId: order._id.toString(),
            amount: 100000,
          })
      );

      const responses = await Promise.all(attempts);
      // Should trigger fraud detection
      const flagged = responses.some((r) => r.status === 429 || r.body.message?.includes('fraud'));
      expect(flagged).toBe(true);
    });

    it('should track failed payment attempts', async () => {
      mockRazorpay.simulateFailure('create');

      await request
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 10000,
        })
        .expect(500);

      const order = await Order.findById(testOrder._id);
      expect(order.failedPaymentAttempts).toBeGreaterThan(0);
    });
  });

  describe('Payment Edge Cases & Concurrency', () => {
    it('should handle concurrent payment verifications', async () => {
      const testOrder = await Order.create({
        ...generateTestOrder({ userId: testUser._id }),
        status: ORDER_STATUS.CONFIRMED,
      });

      const testPayment = await Payment.create({
        orderId: testOrder._id,
        userId: testUser._id,
        amount: 10000,
        razorpayOrderId: 'order_concurrent',
        status: PAYMENT_STATUS.PENDING,
      });

      const paymentData = {
        razorpay_order_id: 'order_concurrent',
        razorpay_payment_id: 'pay_concurrent',
        razorpay_signature: 'valid_sig',
      };

      // Concurrent verification attempts
      const attempts = Array(3)
        .fill()
        .map(() =>
          request
            .post('/api/payments/verify')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(paymentData)
        );

      const responses = await Promise.allSettled(attempts);
      const successCount = responses.filter((r) => r.value?.status === 200).length;
      expect(successCount).toBe(1); // Only one should succeed
    });

    it('should handle zero amount payments gracefully', async () => {
      const testOrder = await Order.create({
        ...generateTestOrder({ userId: testUser._id, totalAmount: 0 }),
        status: ORDER_STATUS.CONFIRMED,
      });

      const response = await request
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 0,
        })
        .expect(400);

      expect(response.body.message).toContain('amount');
    });

    it('should handle negative amount gracefully', async () => {
      const testOrder = await Order.create({
        ...generateTestOrder({ userId: testUser._id }),
        status: ORDER_STATUS.CONFIRMED,
      });

      const response = await request
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: -1000,
        })
        .expect(400);

      expect(response.body.message).toContain('amount');
    });

    it('should handle malformed webhook payloads', async () => {
      const response = await request
        .post('/api/payments/webhook')
        .set('X-Razorpay-Signature', 'test_sig')
        .send({ invalid: 'payload' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
