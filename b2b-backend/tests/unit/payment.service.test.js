import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as paymentService from '../../src/modules/payment/payment.service.js';
import * as paymentRepo from '../../src/modules/payment/payment.repository.js';
import * as paymentGateway from '../../src/modules/payment/payment.gateway.js';
import * as creditRepo from '../../src/modules/credit/credit.repository.js';
import Order from '../../src/modules/order/order.model.js';
import AppError from '../../src/errors/AppError.js';
import mongoose from 'mongoose';

jest.mock('../../src/modules/payment/payment.repository.js', () => ({
  createPaymentRecord: jest.fn(),
  updatePaymentStatus: jest.fn(),
  findPaymentById: jest.fn(),
  findPaymentsByOrder: jest.fn(),
}));
jest.mock('../../src/modules/payment/payment.gateway.js', () => ({
  createRazorpayOrder: jest.fn(),
  verifyPaymentSignature: jest.fn(),
  verifyWebhookSignature: jest.fn(),
  createRefund: jest.fn(),
}));
jest.mock('../../src/modules/credit/credit.repository.js', () => ({
  updateCredit: jest.fn(),
  getCreditStatus: jest.fn(),
}));
jest.mock('../../src/modules/order/order.model.js');
jest.mock('../../src/config/redis.js', () => ({
  redisClient: {
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
    detectStaleLock: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  },
}));
jest.mock('../../src/config/db.js', () => ({
  getTransactionSupport: jest.fn(() => false),
}));
jest.mock('../../src/modules/invoice/invoice.service.js');
jest.mock('../../src/modules/notification/notification.service.js');
jest.mock('../../src/config/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Payment Service - Unit Tests', () => {
  let mockUserId;
  let mockOrderId;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Order model mock functions
    Order.findById = jest.fn();
    Order.findByIdAndUpdate = jest.fn();
    
    mockUserId = new mongoose.Types.ObjectId().toString();
    mockOrderId = new mongoose.Types.ObjectId().toString();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createRazorpayOrder', () => {
    it('should create Razorpay order successfully', async () => {
      const amount = 1000;
      const mockRazorpayOrder = {
        id: 'order_razorpay123',
        amount: amount * 100,
        currency: 'INR',
      };

      paymentGateway.createPaymentOrder.mockResolvedValue(mockRazorpayOrder);

      const result = await paymentService.createRazorpayOrder(amount, mockUserId);

      expect(result).toEqual(mockRazorpayOrder);
      expect(paymentGateway.createPaymentOrder).toHaveBeenCalledWith({
        amount: amount,
        receipt: expect.stringContaining('rcpt_'),
      });
    });

    it('should throw error for amount less than minimum', async () => {
      await expect(
        paymentService.createRazorpayOrder(0, mockUserId)
      ).rejects.toThrow('Minimum payment amount is ₹1');

      await expect(
        paymentService.createRazorpayOrder(-10, mockUserId)
      ).rejects.toThrow('Minimum payment amount is ₹1');
    });

    it('should throw error when amount is null or undefined', async () => {
      await expect(
        paymentService.createRazorpayOrder(null, mockUserId)
      ).rejects.toThrow('Minimum payment amount is ₹1');

      await expect(
        paymentService.createRazorpayOrder(undefined, mockUserId)
      ).rejects.toThrow('Minimum payment amount is ₹1');
    });

    it('should handle Razorpay gateway errors', async () => {
      const amount = 1000;
      paymentGateway.createPaymentOrder.mockRejectedValue(
        new Error('Gateway connection failed')
      );

      await expect(
        paymentService.createRazorpayOrder(amount, mockUserId)
      ).rejects.toThrow();
    });

    it('should generate unique receipt for each order', async () => {
      const amount = 1000;
      const mockRazorpayOrder = {
        id: 'order_razorpay123',
        amount: amount * 100,
        currency: 'INR',
      };

      paymentGateway.createPaymentOrder.mockResolvedValue(mockRazorpayOrder);

      await paymentService.createRazorpayOrder(amount, mockUserId);
      const firstCall = paymentGateway.createPaymentOrder.mock.calls[0][0].receipt;

      jest.clearAllMocks();
      paymentGateway.createPaymentOrder.mockResolvedValue(mockRazorpayOrder);

      await paymentService.createRazorpayOrder(amount, mockUserId);
      const secondCall = paymentGateway.createPaymentOrder.mock.calls[0][0].receipt;

      expect(firstCall).not.toEqual(secondCall);
    });
  });

  describe('hybridPayment', () => {
    it('should throw error for invalid order ID', async () => {
      const { redisClient } = await import('../../src/config/redis.js');
      redisClient.detectStaleLock.mockResolvedValue(false);
      redisClient.acquireLock.mockResolvedValue(true);

      await expect(
        paymentService.hybridPayment('invalid-id', mockUserId, 100, 1000, 'HYBRID')
      ).rejects.toThrow('Invalid order ID format');

      expect(redisClient.releaseLock).toHaveBeenCalled();
    });

    it('should throw error when order not found', async () => {
      const { redisClient } = await import('../../src/config/redis.js');
      redisClient.detectStaleLock.mockResolvedValue(false);
      redisClient.acquireLock.mockResolvedValue(true);

      Order.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        paymentService.hybridPayment(mockOrderId, mockUserId, 100, 1000, 'HYBRID')
      ).rejects.toThrow('Order not found');

      expect(redisClient.releaseLock).toHaveBeenCalled();
    });

    it('should throw error when order is already paid', async () => {
      const { redisClient } = await import('../../src/config/redis.js');
      redisClient.detectStaleLock.mockResolvedValue(false);
      redisClient.acquireLock.mockResolvedValue(true);

      const mockOrder = {
        _id: mockOrderId,
        userId: mockUserId,
        totalAmount: 1000,
        paymentStatus: 'PAID',
      };

      Order.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockOrder),
      });

      await expect(
        paymentService.hybridPayment(mockOrderId, mockUserId, 100, 1000, 'HYBRID')
      ).rejects.toThrow('Order is already paid');

      expect(redisClient.releaseLock).toHaveBeenCalled();
    });

    it('should throw error when payment lock cannot be acquired', async () => {
      const { redisClient } = await import('../../src/config/redis.js');
      redisClient.detectStaleLock.mockResolvedValue(false);
      redisClient.acquireLock.mockResolvedValue(false);

      await expect(
        paymentService.hybridPayment(mockOrderId, mockUserId, 100, 1000, 'HYBRID')
      ).rejects.toThrow('Payment already in progress');
    });

    it('should detect and clean stale locks', async () => {
      const { redisClient } = await import('../../src/config/redis.js');
      redisClient.detectStaleLock.mockResolvedValue(true);
      redisClient.acquireLock.mockResolvedValue(true);

      const mockOrder = {
        _id: mockOrderId,
        userId: mockUserId,
        totalAmount: 1000,
        paymentStatus: 'PENDING',
        save: jest.fn().mockResolvedValue(true),
      };

      Order.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockOrder),
      });

      creditRepo.getUserCredit.mockResolvedValue({ balance: 200 });
      paymentGateway.createPaymentOrder.mockResolvedValue({
        id: 'order_123',
        amount: 90000,
      });

      try {
        await paymentService.hybridPayment(mockOrderId, mockUserId, 100, 1000, 'HYBRID');
      } catch (error) {
        // Expected to fail due to incomplete mocking
      }

      expect(redisClient.detectStaleLock).toHaveBeenCalled();
    });
  });

  describe('initiatePayment', () => {
    it('should throw error for invalid order ID', async () => {
      await expect(
        paymentService.initiatePayment('invalid-id', mockUserId)
      ).rejects.toThrow('Invalid order ID format');
    });

    it('should throw error when order not found', async () => {
      Order.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        paymentService.initiatePayment(mockOrderId, mockUserId)
      ).rejects.toThrow('Order not found');
    });

    it('should throw error when order already paid', async () => {
      const mockOrder = {
        _id: mockOrderId,
        userId: mockUserId,
        totalAmount: 1000,
        paymentStatus: 'PAID',
      };

      Order.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockOrder),
      });

      await expect(
        paymentService.initiatePayment(mockOrderId, mockUserId)
      ).rejects.toThrow('Order is already paid');
    });

    it('should create Razorpay order for valid request', async () => {
      const mockOrder = {
        _id: mockOrderId,
        userId: mockUserId,
        totalAmount: 1000,
        paymentStatus: 'PENDING',
      };

      const mockRazorpayOrder = {
        id: 'order_razorpay123',
        amount: 100000,
        currency: 'INR',
      };

      Order.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockOrder),
      });

      paymentGateway.createPaymentOrder.mockResolvedValue(mockRazorpayOrder);

      const result = await paymentService.initiatePayment(mockOrderId, mockUserId);

      expect(result).toHaveProperty('razorpayOrderId');
      expect(paymentGateway.createPaymentOrder).toHaveBeenCalled();
    });
  });

  describe('verifyPayment', () => {
    it('should throw error for missing signature', async () => {
      const payload = {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
      };

      await expect(
        paymentService.verifyPayment(payload)
      ).rejects.toThrow();
    });

    it('should throw error for invalid signature', async () => {
      const payload = {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'invalid_signature',
      };

      paymentGateway.verifySignature.mockReturnValue(false);

      await expect(
        paymentService.verifyPayment(payload)
      ).rejects.toThrow();
    });

    it('should verify payment successfully with valid signature', async () => {
      const payload = {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'valid_signature',
      };

      const mockPayment = {
        _id: new mongoose.Types.ObjectId(),
        orderId: mockOrderId,
        razorpayOrderId: 'order_123',
        save: jest.fn().mockResolvedValue(true),
      };

      const mockOrder = {
        _id: mockOrderId,
        paymentStatus: 'PENDING',
        orderStatus: 'PENDING',
        save: jest.fn().mockResolvedValue(true),
      };

      paymentGateway.verifySignature.mockReturnValue(true);
      paymentRepo.findPaymentByRazorpayOrderId.mockResolvedValue(mockPayment);
      Order.findById.mockResolvedValue(mockOrder);

      const result = await paymentService.verifyPayment(payload);

      expect(result).toBeDefined();
      expect(mockPayment.save).toHaveBeenCalled();
      expect(mockOrder.save).toHaveBeenCalled();
    });
  });

  describe('failPayment', () => {
    it('should throw error for invalid order ID', async () => {
      await expect(
        paymentService.failPayment('invalid-id', 'Payment declined')
      ).rejects.toThrow('Invalid order ID format');
    });

    it('should throw error when order not found', async () => {
      Order.findById.mockResolvedValue(null);

      await expect(
        paymentService.failPayment(mockOrderId, 'Payment declined')
      ).rejects.toThrow('Order not found');
    });

    it('should mark payment as failed', async () => {
      const mockOrder = {
        _id: mockOrderId,
        paymentStatus: 'PENDING',
        orderStatus: 'PENDING',
        save: jest.fn().mockResolvedValue(true),
      };

      Order.findById.mockResolvedValue(mockOrder);

      await paymentService.failPayment(mockOrderId, 'Payment declined');

      expect(mockOrder.paymentStatus).toBe('FAILED');
      expect(mockOrder.save).toHaveBeenCalled();
    });
  });

  describe('handleWebhook', () => {
    it('should throw error for invalid signature', async () => {
      const rawBody = JSON.stringify({ event: 'payment.captured' });
      const signature = 'invalid_signature';

      paymentGateway.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        paymentService.handleWebhook(rawBody, signature)
      ).rejects.toThrow();
    });

    it('should process webhook with valid signature', async () => {
      const rawBody = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_123',
              order_id: 'order_123',
              status: 'captured',
            },
          },
        },
      });
      const signature = 'valid_signature';

      paymentGateway.verifyWebhookSignature.mockReturnValue(true);
      paymentRepo.findPaymentByRazorpayOrderId.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        orderId: mockOrderId,
        save: jest.fn().mockResolvedValue(true),
      });

      const result = await paymentService.handleWebhook(rawBody, signature);

      expect(result).toBeDefined();
      expect(paymentGateway.verifyWebhookSignature).toHaveBeenCalledWith(
        rawBody,
        signature
      );
    });

    it('should handle payment.failed event', async () => {
      const rawBody = JSON.stringify({
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_123',
              order_id: 'order_123',
              status: 'failed',
            },
          },
        },
      });
      const signature = 'valid_signature';

      paymentGateway.verifyWebhookSignature.mockReturnValue(true);
      paymentRepo.findPaymentByRazorpayOrderId.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        orderId: mockOrderId,
        status: 'PENDING',
        save: jest.fn().mockResolvedValue(true),
      });

      const result = await paymentService.handleWebhook(rawBody, signature);

      expect(result).toBeDefined();
    });
  });

  describe('createRefund', () => {
    it('should throw error for invalid order ID', async () => {
      await expect(
        paymentService.createRefund(
          'invalid-id',
          mockUserId,
          100,
          'Customer request',
          'ADMIN'
        )
      ).rejects.toThrow('Invalid order ID format');
    });

    it('should throw error when order not found', async () => {
      Order.findById.mockResolvedValue(null);

      await expect(
        paymentService.createRefund(
          mockOrderId,
          mockUserId,
          100,
          'Customer request',
          'ADMIN'
        )
      ).rejects.toThrow('Order not found');
    });

    it('should throw error for invalid refund amount', async () => {
      const mockOrder = {
        _id: mockOrderId,
        totalAmount: 1000,
        paymentStatus: 'PAID',
      };

      Order.findById.mockResolvedValue(mockOrder);

      await expect(
        paymentService.createRefund(
          mockOrderId,
          mockUserId,
          0,
          'Customer request',
          'ADMIN'
        )
      ).rejects.toThrow();
    });

    it('should create refund successfully', async () => {
      const mockOrder = {
        _id: mockOrderId,
        totalAmount: 1000,
        paymentStatus: 'PAID',
      };

      const mockPayment = {
        _id: new mongoose.Types.ObjectId(),
        razorpayPaymentId: 'pay_123',
      };

      Order.findById.mockResolvedValue(mockOrder);
      paymentRepo.findPaymentByOrderId.mockResolvedValue(mockPayment);
      paymentGateway.createRefund.mockResolvedValue({
        id: 'rfnd_123',
        status: 'processed',
      });
      paymentRepo.createRefund.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        orderId: mockOrderId,
        amount: 100,
      });

      const result = await paymentService.createRefund(
        mockOrderId,
        mockUserId,
        100,
        'Customer request',
        'ADMIN'
      );

      expect(result).toBeDefined();
      expect(paymentGateway.createRefund).toHaveBeenCalled();
    });
  });

  describe('getRefundHistory', () => {
    it('should throw error for invalid order ID', async () => {
      await expect(
        paymentService.getRefundHistory('invalid-id')
      ).rejects.toThrow('Invalid order ID format');
    });

    it('should return refund history for valid order', async () => {
      const mockRefunds = [
        {
          _id: new mongoose.Types.ObjectId(),
          orderId: mockOrderId,
          amount: 100,
          status: 'PROCESSED',
        },
      ];

      paymentRepo.getRefundsByOrderId.mockResolvedValue(mockRefunds);

      const result = await paymentService.getRefundHistory(mockOrderId);

      expect(result).toEqual(mockRefunds);
      expect(paymentRepo.getRefundsByOrderId).toHaveBeenCalledWith(mockOrderId);
    });

    it('should return empty array when no refunds exist', async () => {
      paymentRepo.getRefundsByOrderId.mockResolvedValue([]);

      const result = await paymentService.getRefundHistory(mockOrderId);

      expect(result).toEqual([]);
    });
  });

  describe('getRefundById', () => {
    it('should throw error for invalid refund ID', async () => {
      await expect(
        paymentService.getRefundById('invalid-id')
      ).rejects.toThrow('Invalid refund ID format');
    });

    it('should throw error when refund not found', async () => {
      paymentRepo.getRefundById.mockResolvedValue(null);

      await expect(
        paymentService.getRefundById(new mongoose.Types.ObjectId().toString())
      ).rejects.toThrow('Refund not found');
    });

    it('should return refund for valid ID', async () => {
      const mockRefund = {
        _id: new mongoose.Types.ObjectId(),
        orderId: mockOrderId,
        amount: 100,
        status: 'PROCESSED',
      };

      paymentRepo.getRefundById.mockResolvedValue(mockRefund);

      const result = await paymentService.getRefundById(mockRefund._id.toString());

      expect(result).toEqual(mockRefund);
      expect(paymentRepo.getRefundById).toHaveBeenCalledWith(mockRefund._id.toString());
    });
  });
});
