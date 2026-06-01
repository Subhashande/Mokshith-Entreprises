import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import crypto from 'crypto';
import Order from '../../src/modules/order/order.model.js';
import Payment from '../../src/modules/payment/payment.model.js';
import User from '../../src/modules/user/user.model.js';
import { handleWebhook } from '../../src/modules/payment/payment.service.js';
import { verifyWebhookSignature } from '../../src/modules/payment/payment.gateway.js';
import { clearDatabase, generateTestUser, generateTestOrder } from '../helpers/testUtils.js';
import { hashPassword } from '../../src/utils/hashPassword.js';
import { USER_STATUS } from '../../src/constants/userStatus.js';
import { ORDER_STATUS } from '../../src/constants/orderStatus.js';
import { PAYMENT_STATUS } from '../../src/constants/paymentStatus.js';
import { redisClient } from '../../src/config/redis.js';

/**
 * 🔒 Webhook Replay Attack & Security Tests
 * Tests for webhook idempotency, replay prevention, and signature validation
 */
describe('Webhook Replay Attack Tests', () => {
  let testUser;
  let testOrder;
  let testPayment;
  let webhookSecret;

  beforeEach(async () => {
    await clearDatabase();
    
    webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';

    // Create test user
    const hashedPassword = await hashPassword('Test@1234');
    testUser = await User.create({
      ...generateTestUser({ email: 'webhook@test.com' }),
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
      razorpayOrderId: 'order_webhook123',
      status: PAYMENT_STATUS.PENDING,
      paymentMethod: 'ONLINE',
    });

    // Clear Redis
    await redisClient.flushdb();
  });

  afterEach(async () => {
    await redisClient.flushdb();
  });

  describe('Webhook Idempotency Protection', () => {
    const createWebhookPayload = (webhookId = `webhook_${Date.now()}`) => ({
      entity: 'event',
      account_id: 'acc_test123',
      event: 'payment.captured',
      contains: ['payment'],
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook123',
            entity: 'payment',
            amount: 10000,
            currency: 'INR',
            status: 'captured',
            order_id: testPayment.razorpayOrderId,
            invoice_id: null,
            international: false,
            method: 'card',
            amount_refunded: 0,
            captured: true,
            description: 'Test payment',
            created_at: Math.floor(Date.now() / 1000),
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
      webhook_id: webhookId,
    });

    const generateSignature = (payload, secret) => {
      return crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
    };

    it('should reject duplicate webhook with same webhook_id', async () => {
      const webhookId = 'webhook_duplicate_test';
      const payload = createWebhookPayload(webhookId);
      const rawBody = JSON.stringify(payload);
      const signature = generateSignature(payload, webhookSecret);

      // First webhook processing - should succeed
      const result1 = await handleWebhook(rawBody, signature);
      expect(result1.status).toBe('ok');

      // Verify Redis idempotency key set
      const redisKey = `webhook:processed:${webhookId}`;
      const isProcessed = await redisClient.get(redisKey);
      expect(isProcessed).toBe('1');

      // Second webhook with SAME webhook_id - should be rejected
      await expect(
        handleWebhook(rawBody, signature)
      ).rejects.toThrow(/already processed|duplicate/i);

      // Verify order status unchanged (not updated twice)
      const order = await Order.findById(testOrder._id);
      expect(order.paymentStatus).toBe(PAYMENT_STATUS.PAID);

      // Verify payment updated only once
      const payment = await Payment.findById(testPayment._id);
      expect(payment.status).toBe(PAYMENT_STATUS.SUCCESS);
    });

    it('should prevent concurrent duplicate webhook processing', async () => {
      const webhookId = 'webhook_concurrent';
      const payload = createWebhookPayload(webhookId);
      const rawBody = JSON.stringify(payload);
      const signature = generateSignature(payload, webhookSecret);

      // Simulate 5 concurrent webhook deliveries (Razorpay retries)
      const concurrentWebhooks = Array(5).fill(null).map(() =>
        handleWebhook(rawBody, signature)
      );

      const results = await Promise.allSettled(concurrentWebhooks);

      // Only ONE should succeed
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const rejected = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBe(1);
      expect(rejected).toBe(4);

      // Verify idempotency key exists in Redis
      const redisKey = `webhook:processed:${webhookId}`;
      const exists = await redisClient.get(redisKey);
      expect(exists).toBe('1');

      // Verify TTL is set (24 hours)
      const ttl = await redisClient.ttl(redisKey);
      expect(ttl).toBeGreaterThan(86000); // ~24 hours
      expect(ttl).toBeLessThanOrEqual(86400);
    });

    it('should allow webhook after idempotency key expires', async () => {
      const webhookId = 'webhook_expired';
      const payload = createWebhookPayload(webhookId);
      const rawBody = JSON.stringify(payload);
      const signature = generateSignature(payload, webhookSecret);

      // First processing
      await handleWebhook(rawBody, signature);

      // Manually expire the idempotency key (simulate 24h+ passing)
      const redisKey = `webhook:processed:${webhookId}`;
      await redisClient.del(redisKey);

      // Reset order/payment to PENDING for reprocessing
      await Order.findByIdAndUpdate(testOrder._id, {
        paymentStatus: PAYMENT_STATUS.PENDING,
        status: ORDER_STATUS.CONFIRMED,
      });
      await Payment.findByIdAndUpdate(testPayment._id, {
        status: PAYMENT_STATUS.PENDING,
      });

      // Webhook should process again after expiry
      const result = await handleWebhook(rawBody, signature);
      expect(result.status).toBe('ok');

      // Verify order updated
      const order = await Order.findById(testOrder._id);
      expect(order.paymentStatus).toBe(PAYMENT_STATUS.PAID);
    });
  });

  describe('Webhook Signature Validation', () => {
    it('should reject webhook with invalid signature', async () => {
      const payload = {
        event: 'payment.captured',
        webhook_id: 'webhook_invalid_sig',
        payload: {
          payment: {
            entity: {
              id: 'pay_test',
              order_id: testPayment.razorpayOrderId,
            },
          },
        },
      };
      const rawBody = JSON.stringify(payload);
      const invalidSignature = 'invalid_signature_string';

      await expect(
        handleWebhook(rawBody, invalidSignature)
      ).rejects.toThrow(/signature|invalid/i);

      // Verify order/payment unchanged
      const order = await Order.findById(testOrder._id);
      expect(order.paymentStatus).toBe(PAYMENT_STATUS.PENDING);
    });

    it('should reject webhook with missing signature', async () => {
      const payload = {
        event: 'payment.captured',
        webhook_id: 'webhook_no_sig',
      };
      const rawBody = JSON.stringify(payload);

      await expect(
        handleWebhook(rawBody, null)
      ).rejects.toThrow(/signature|missing/i);
    });

    it('should reject webhook with tampered payload', async () => {
      const originalPayload = {
        event: 'payment.captured',
        webhook_id: 'webhook_tampered',
        payload: {
          payment: {
            entity: {
              id: 'pay_original',
              amount: 10000,
              order_id: testPayment.razorpayOrderId,
            },
          },
        },
      };

      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(originalPayload))
        .digest('hex');

      // Tamper with payload after signature generation
      const tamperedPayload = {
        ...originalPayload,
        payload: {
          payment: {
            entity: {
              id: 'pay_tampered',
              amount: 100, // Changed amount
              order_id: testPayment.razorpayOrderId,
            },
          },
        },
      };
      const tamperedBody = JSON.stringify(tamperedPayload);

      await expect(
        handleWebhook(tamperedBody, signature)
      ).rejects.toThrow(/signature|invalid/i);
    });
  });

  describe('Modified Payload Replay Attacks', () => {
    const createValidWebhook = (overrides = {}) => {
      const payload = {
        entity: 'event',
        event: 'payment.captured',
        webhook_id: `webhook_${Date.now()}`,
        payload: {
          payment: {
            entity: {
              id: 'pay_replay_test',
              amount: 10000,
              order_id: testPayment.razorpayOrderId,
              status: 'captured',
              captured: true,
              ...overrides,
            },
          },
        },
        created_at: Math.floor(Date.now() / 1000),
      };

      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      return { payload, rawBody, signature };
    };

    it('should detect amount modification in replay', async () => {
      const { rawBody, signature } = createValidWebhook();

      // First webhook succeeds
      await handleWebhook(rawBody, signature);

      // Attacker tries to replay with MODIFIED amount
      const modifiedPayload = JSON.parse(rawBody);
      modifiedPayload.payload.payment.entity.amount = 999999; // Fraudulent amount
      modifiedPayload.webhook_id = `webhook_${Date.now()}`; // New webhook_id
      const modifiedBody = JSON.stringify(modifiedPayload);

      // Signature won't match modified payload
      await expect(
        handleWebhook(modifiedBody, signature)
      ).rejects.toThrow(/signature|invalid/i);

      // Even with correct signature for modified payload
      const newSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(modifiedBody)
        .digest('hex');

      // Should fail due to amount mismatch with order
      await expect(
        handleWebhook(modifiedBody, newSignature)
      ).rejects.toThrow(/amount|mismatch/i);
    });

    it('should reject replay with different order_id', async () => {
      // Create second order
      const order2 = await Order.create({
        ...generateTestOrder({
          userId: testUser._id,
          totalAmount: 5000,
        }),
        userId: testUser._id,
        status: ORDER_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.PENDING,
      });

      const { payload, signature } = createValidWebhook();

      // Process webhook for first order
      await handleWebhook(JSON.stringify(payload), signature);

      // Attacker tries to replay with different order_id
      const replayPayload = {
        ...payload,
        webhook_id: `webhook_${Date.now()}`, // New webhook_id
        payload: {
          payment: {
            entity: {
              ...payload.payload.payment.entity,
              order_id: 'order_different123', // Different order
            },
          },
        },
      };

      const replayBody = JSON.stringify(replayPayload);
      const replaySignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(replayBody)
        .digest('hex');

      await expect(
        handleWebhook(replayBody, replaySignature)
      ).rejects.toThrow(/order|not found/i);
    });
  });

  describe('Stale/Expired Webhook Replay', () => {
    it('should handle old webhook events gracefully', async () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 86400 * 7; // 7 days old
      
      const payload = {
        entity: 'event',
        event: 'payment.captured',
        webhook_id: `webhook_old_${Date.now()}`,
        payload: {
          payment: {
            entity: {
              id: 'pay_old_test',
              amount: 10000,
              order_id: testPayment.razorpayOrderId,
              status: 'captured',
              created_at: oldTimestamp,
            },
          },
        },
        created_at: oldTimestamp,
      };

      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      // Old webhook should still process if valid
      const result = await handleWebhook(rawBody, signature);
      expect(result.status).toBe('ok');

      // But duplicate should still be blocked
      await expect(
        handleWebhook(rawBody, signature)
      ).rejects.toThrow(/already processed/i);
    });

    it('should reject replay of already-paid order webhook', async () => {
      // Mark order as already paid
      await Order.findByIdAndUpdate(testOrder._id, {
        paymentStatus: PAYMENT_STATUS.PAID,
      });
      await Payment.findByIdAndUpdate(testPayment._id, {
        status: PAYMENT_STATUS.SUCCESS,
      });

      const payload = {
        entity: 'event',
        event: 'payment.captured',
        webhook_id: `webhook_already_paid_${Date.now()}`,
        payload: {
          payment: {
            entity: {
              id: 'pay_late_replay',
              amount: 10000,
              order_id: testPayment.razorpayOrderId,
              status: 'captured',
            },
          },
        },
        created_at: Math.floor(Date.now() / 1000),
      };

      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      // Should detect order already paid
      const result = await handleWebhook(rawBody, signature);
      
      // Should return ok but not double-process
      expect(result.status).toBe('ok');

      // Verify no duplicate payment capture
      const payments = await Payment.find({ 
        orderId: testOrder._id,
        status: PAYMENT_STATUS.SUCCESS,
      });
      expect(payments.length).toBe(1); // Only one success payment
    });
  });

  describe('Webhook Security Edge Cases', () => {
    it('should handle malformed JSON payload', async () => {
      const malformedBody = '{invalid json}';
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(malformedBody)
        .digest('hex');

      await expect(
        handleWebhook(malformedBody, signature)
      ).rejects.toThrow();
    });

    it('should reject webhook with missing required fields', async () => {
      const incompletePayload = {
        event: 'payment.captured',
        webhook_id: 'webhook_incomplete',
        // Missing payload.payment.entity
      };

      const rawBody = JSON.stringify(incompletePayload);
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      await expect(
        handleWebhook(rawBody, signature)
      ).rejects.toThrow();
    });

    it('should handle concurrent webhooks for different orders', async () => {
      // Create second order and payment
      const order2 = await Order.create({
        ...generateTestOrder({
          userId: testUser._id,
          totalAmount: 5000,
        }),
        userId: testUser._id,
        status: ORDER_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.PENDING,
      });

      const payment2 = await Payment.create({
        orderId: order2._id,
        userId: testUser._id,
        amount: 5000,
        razorpayOrderId: 'order_webhook456',
        status: PAYMENT_STATUS.PENDING,
        paymentMethod: 'ONLINE',
      });

      // Create webhooks for both orders
      const webhook1 = {
        entity: 'event',
        event: 'payment.captured',
        webhook_id: `webhook_order1_${Date.now()}`,
        payload: {
          payment: {
            entity: {
              id: 'pay_order1',
              amount: 10000,
              order_id: testPayment.razorpayOrderId,
              status: 'captured',
            },
          },
        },
        created_at: Math.floor(Date.now() / 1000),
      };

      const webhook2 = {
        entity: 'event',
        event: 'payment.captured',
        webhook_id: `webhook_order2_${Date.now()}`,
        payload: {
          payment: {
            entity: {
              id: 'pay_order2',
              amount: 5000,
              order_id: payment2.razorpayOrderId,
              status: 'captured',
            },
          },
        },
        created_at: Math.floor(Date.now() / 1000),
      };

      const body1 = JSON.stringify(webhook1);
      const body2 = JSON.stringify(webhook2);
      const sig1 = crypto.createHmac('sha256', webhookSecret).update(body1).digest('hex');
      const sig2 = crypto.createHmac('sha256', webhookSecret).update(body2).digest('hex');

      // Process webhooks concurrently
      const [result1, result2] = await Promise.allSettled([
        handleWebhook(body1, sig1),
        handleWebhook(body2, sig2),
      ]);

      // Both should succeed (different orders/webhooks)
      expect(result1.status).toBe('fulfilled');
      expect(result2.status).toBe('fulfilled');

      // Verify both orders updated
      const updatedOrder1 = await Order.findById(testOrder._id);
      const updatedOrder2 = await Order.findById(order2._id);
      expect(updatedOrder1.paymentStatus).toBe(PAYMENT_STATUS.PAID);
      expect(updatedOrder2.paymentStatus).toBe(PAYMENT_STATUS.PAID);
    });
  });
});
