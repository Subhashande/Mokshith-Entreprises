import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as orderService from '../../src/modules/order/order.service.js';
import * as cartRepo from '../../src/modules/cart/cart.repository.js';
import * as orderRepo from '../../src/modules/order/order.repository.js';
import * as creditRepo from '../../src/modules/credit/credit.repository.js';
import Order from '../../src/modules/order/order.model.js';
import Product from '../../src/modules/product/product.model.js';
import User from '../../src/modules/user/user.model.js';
import AppError from '../../src/errors/AppError.js';
import * as inventoryService from '../../src/modules/inventory/inventory.service.js';
import * as invoiceService from '../../src/modules/invoice/invoice.service.js';
import * as notificationService from '../../src/modules/notification/notification.service.js';
import * as settingsService from '../../src/modules/settings/settings.service.js';
import * as creditService from '../../src/modules/credit/credit.service.js';
import { ORDER_STATUS } from '../../src/constants/orderStatus.js';
import { PAYMENT_STATUS } from '../../src/constants/paymentStatus.js';
import mongoose from 'mongoose';

jest.mock('../../src/modules/cart/cart.repository.js', () => ({
  findCartByUser: jest.fn(),
  clearCart: jest.fn(),
}));
jest.mock('../../src/modules/order/order.repository.js', () => ({
  createOrder: jest.fn(),
  findOrderById: jest.fn(),
  findOrdersByUser: jest.fn(),
  updateOrderStatus: jest.fn(),
}));
jest.mock('../../src/modules/credit/credit.repository.js', () => ({
  getCreditStatus: jest.fn(),
  updateCredit: jest.fn(),
}));
jest.mock('../../src/modules/order/order.model.js', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));
jest.mock('../../src/modules/product/product.model.js', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));
jest.mock('../../src/modules/user/user.model.js', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));
jest.mock('../../src/modules/inventory/inventory.service.js', () => ({
  reduceStock: jest.fn(),
  restoreStock: jest.fn(),
}));
jest.mock('../../src/modules/invoice/invoice.service.js', () => ({
  generateInvoice: jest.fn(),
  getInvoiceUrl: jest.fn(),
}));
jest.mock('../../src/modules/notification/notification.service.js', () => ({
  sendNotification: jest.fn(),
}));
jest.mock('../../src/modules/settings/settings.service.js', () => ({
  fetchSetting: jest.fn(),
}));
jest.mock('../../src/modules/credit/credit.service.js', () => ({
  deductCredit: jest.fn(),
}));
jest.mock('../../src/modules/order/order.events.js');
jest.mock('../../src/modules/analytics/analytics.events.js');
jest.mock('../../src/modules/logistics/logistics.service.js');
jest.mock('../../src/services/deliveryAssignment.service.js');

describe('Order Service - Unit Tests', () => {
  let mockUserId;
  let mockOrderId;
  let mockProductId;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUserId = new mongoose.Types.ObjectId().toString();
    mockOrderId = new mongoose.Types.ObjectId().toString();
    mockProductId = new mongoose.Types.ObjectId().toString();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createOrder', () => {
    const validOrderData = {
      paymentMethod: 'COD',
      shippingAddress: {
        name: 'Test User',
        phone: '1234567890',
        addressLine: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
      },
      items: [
        {
          productId: new mongoose.Types.ObjectId().toString(),
          quantity: 2,
          price: 1000,
        },
      ],
    };

    it('should create order successfully with valid data', async () => {
      settingsService.fetchSetting.mockResolvedValue({ value: false });
      Product.find.mockResolvedValue([
        {
          _id: validOrderData.items[0].productId,
          name: 'Test Product',
          price: 1000,
          stock: 100,
          isActive: true,
        },
      ]);
      inventoryService.checkStock.mockResolvedValue(true);
      inventoryService.reduceStock.mockResolvedValue(true);
      Order.prototype.save = jest.fn().mockResolvedValue({
        _id: mockOrderId,
        userId: mockUserId,
        items: validOrderData.items,
        totalAmount: 2000,
        status: ORDER_STATUS.PENDING,
      });
      invoiceService.generateInvoice.mockResolvedValue({ invoiceId: 'INV-001' });

      const result = await orderService.createOrder(mockUserId, validOrderData);

      expect(result).toBeDefined();
      expect(result._id).toBe(mockOrderId);
      expect(inventoryService.reduceStock).toHaveBeenCalled();
      expect(invoiceService.generateInvoice).toHaveBeenCalled();
    });

    it('should throw error when shipping address is missing', async () => {
      const invalidData = { ...validOrderData, shippingAddress: null };

      await expect(orderService.createOrder(mockUserId, invalidData)).rejects.toThrow(
        'Shipping address is required'
      );
    });

    it('should throw error when user ID is invalid', async () => {
      await expect(orderService.createOrder('invalid-id', validOrderData)).rejects.toThrow(
        'Invalid user ID'
      );
    });

    it('should throw error when system is in maintenance mode', async () => {
      settingsService.fetchSetting.mockImplementation((key) => {
        if (key === 'maintenanceMode') return Promise.resolve({ value: true });
        return Promise.resolve({ value: false });
      });

      await expect(orderService.createOrder(mockUserId, validOrderData)).rejects.toThrow(
        'System under maintenance'
      );
    });

    it('should throw error when COD is disabled', async () => {
      settingsService.fetchSetting.mockImplementation((key) => {
        if (key === 'enableCOD') return Promise.resolve({ value: false });
        if (key === 'maintenanceMode') return Promise.resolve({ value: false });
        return Promise.resolve({ value: false });
      });

      await expect(orderService.createOrder(mockUserId, validOrderData)).rejects.toThrow(
        'Cash on Delivery is currently unavailable'
      );
    });

    it('should throw error when order cutoff time has passed', async () => {
      const pastCutoffTime = '00:00';
      settingsService.fetchSetting.mockImplementation((key) => {
        if (key === 'orderCutoffTime') return Promise.resolve({ value: pastCutoffTime });
        return Promise.resolve({ value: false });
      });

      await expect(orderService.createOrder(mockUserId, validOrderData)).rejects.toThrow(
        'Orders are closed for today'
      );
    });

    it('should throw error when cart is empty and no items provided', async () => {
      settingsService.fetchSetting.mockResolvedValue({ value: false });
      cartRepo.findCartByUser.mockResolvedValue({ items: [] });

      await expect(
        orderService.createOrder(mockUserId, { ...validOrderData, items: [] })
      ).rejects.toThrow('Cart is empty');
    });

    it('should throw error when items array is empty', async () => {
      settingsService.fetchSetting.mockResolvedValue({ value: false });

      await expect(
        orderService.createOrder(mockUserId, { ...validOrderData, items: [] })
      ).rejects.toThrow('No items to order');
    });

    it('should handle idempotency correctly', async () => {
      const idempotencyKey = 'test-idem-key-123';
      const existingOrder = { _id: mockOrderId, idempotencyKey };

      Order.findOne = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(existingOrder),
      });

      const result = await orderService.createOrder(mockUserId, {
        ...validOrderData,
        idempotencyKey,
      });

      expect(result).toEqual(existingOrder);
      expect(Order.findOne).toHaveBeenCalledWith({ idempotencyKey });
    });

    it('should throw error when using CREDIT payment and credit system is disabled', async () => {
      settingsService.fetchSetting.mockImplementation((key) => {
        if (key === 'creditSystem') return Promise.resolve({ value: false });
        return Promise.resolve({ value: false });
      });

      const creditOrderData = { ...validOrderData, paymentMethod: 'CREDIT' };

      await expect(orderService.createOrder(mockUserId, creditOrderData)).rejects.toThrow(
        'Credit system is currently disabled'
      );
    });
  });

  describe('getOrders', () => {
    it('should return orders for regular user', async () => {
      const mockUser = { _id: mockUserId, role: 'B2B_CUSTOMER' };
      const mockOrders = [
        { _id: mockOrderId, userId: mockUserId, status: ORDER_STATUS.PENDING },
      ];

      orderRepo.findOrdersByUserId = jest.fn().mockResolvedValue(mockOrders);

      const result = await orderService.getOrders(mockUser);

      expect(result).toEqual(mockOrders);
      expect(orderRepo.findOrdersByUserId).toHaveBeenCalledWith(mockUserId);
    });

    it('should return all orders for admin user', async () => {
      const mockUser = { _id: mockUserId, role: 'ADMIN' };
      const mockOrders = [
        { _id: mockOrderId, userId: mockUserId, status: ORDER_STATUS.PENDING },
        { _id: new mongoose.Types.ObjectId(), userId: 'other-user', status: ORDER_STATUS.SHIPPED },
      ];

      orderRepo.findAllOrders = jest.fn().mockResolvedValue(mockOrders);

      const result = await orderService.getOrders(mockUser);

      expect(result).toEqual(mockOrders);
      expect(orderRepo.findAllOrders).toHaveBeenCalled();
    });
  });

  describe('getOrderById', () => {
    it('should return order by ID', async () => {
      const mockOrder = {
        _id: mockOrderId,
        userId: mockUserId,
        status: ORDER_STATUS.PENDING,
        items: [],
      };

      Order.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockOrder),
        }),
      });

      const result = await orderService.getOrderById(mockOrderId);

      expect(result).toEqual(mockOrder);
      expect(Order.findById).toHaveBeenCalledWith(mockOrderId);
    });

    it('should throw error when order not found', async () => {
      Order.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(orderService.getOrderById(mockOrderId)).rejects.toThrow('Order not found');
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully', async () => {
      const mockOrder = {
        _id: mockOrderId,
        status: ORDER_STATUS.PENDING,
        save: jest.fn().mockResolvedValue(true),
      };

      Order.findById = jest.fn().mockResolvedValue(mockOrder);

      const result = await orderService.updateOrderStatus(mockOrderId, ORDER_STATUS.CONFIRMED);

      expect(mockOrder.status).toBe(ORDER_STATUS.CONFIRMED);
      expect(mockOrder.save).toHaveBeenCalled();
    });

    it('should throw error when order not found', async () => {
      Order.findById = jest.fn().mockResolvedValue(null);

      await expect(
        orderService.updateOrderStatus(mockOrderId, ORDER_STATUS.CONFIRMED)
      ).rejects.toThrow('Order not found');
    });

    it('should send notification after status update', async () => {
      const mockOrder = {
        _id: mockOrderId,
        userId: mockUserId,
        status: ORDER_STATUS.PENDING,
        save: jest.fn().mockResolvedValue(true),
      };

      Order.findById = jest.fn().mockResolvedValue(mockOrder);
      notificationService.sendNotification = jest.fn().mockResolvedValue(true);

      await orderService.updateOrderStatus(mockOrderId, ORDER_STATUS.SHIPPED);

      expect(notificationService.sendNotification).toHaveBeenCalled();
    });
  });

  describe('markOrderAsFailed', () => {
    it('should mark order as failed and restore inventory', async () => {
      const mockOrder = {
        _id: mockOrderId,
        status: ORDER_STATUS.PENDING,
        items: [{ productId: mockProductId, quantity: 2 }],
        save: jest.fn().mockResolvedValue(true),
      };

      Order.findById = jest.fn().mockResolvedValue(mockOrder);
      inventoryService.restoreStock = jest.fn().mockResolvedValue(true);

      const result = await orderService.markOrderAsFailed(mockOrderId);

      expect(mockOrder.status).toBe(ORDER_STATUS.FAILED);
      expect(inventoryService.restoreStock).toHaveBeenCalledWith(mockProductId, 2, expect.any(Object));
      expect(mockOrder.save).toHaveBeenCalled();
    });

    it('should throw error when order not found', async () => {
      Order.findById = jest.fn().mockResolvedValue(null);

      await expect(orderService.markOrderAsFailed(mockOrderId)).rejects.toThrow('Order not found');
    });
  });

  describe('downloadInvoice', () => {
    it('should return invoice for order', async () => {
      const mockInvoice = { _id: 'invoice-id', orderId: mockOrderId, pdfPath: '/path/to/invoice.pdf' };

      invoiceService.getInvoiceByOrderId = jest.fn().mockResolvedValue(mockInvoice);

      const result = await orderService.downloadInvoice(mockOrderId);

      expect(result).toEqual(mockInvoice);
      expect(invoiceService.getInvoiceByOrderId).toHaveBeenCalledWith(mockOrderId);
    });

    it('should generate invoice if not found', async () => {
      const mockOrder = { _id: mockOrderId, userId: mockUserId };
      const mockGeneratedInvoice = { _id: 'new-invoice-id', orderId: mockOrderId };

      invoiceService.getInvoiceByOrderId = jest.fn().mockResolvedValue(null);
      Order.findById = jest.fn().mockResolvedValue(mockOrder);
      invoiceService.generateInvoice = jest.fn().mockResolvedValue(mockGeneratedInvoice);

      const result = await orderService.downloadInvoice(mockOrderId);

      expect(invoiceService.generateInvoice).toHaveBeenCalledWith(mockOrderId);
      expect(result).toEqual(mockGeneratedInvoice);
    });
  });
});
