import { describe, it, expect, jest, beforeAll, beforeEach, afterEach } from '@jest/globals';
import AppError from '../../src/errors/AppError.js';
import { ORDER_STATUS } from '../../src/constants/orderStatus.js';
import { PAYMENT_STATUS } from '../../src/constants/paymentStatus.js';
import mongoose from 'mongoose';

// ----- Mock functions (declared before SUT import) -----
const mockFindCartByUser = jest.fn();
const mockClearCart = jest.fn();

const mockRepoCreateOrder = jest.fn();
const mockFindOrders = jest.fn();
const mockRepoFindById = jest.fn();

const mockOrderFindOne = jest.fn();
const mockOrderFindById = jest.fn();
const mockOrderFindByIdAndUpdate = jest.fn();
const mockOrderFindByIdAndDelete = jest.fn();

const mockProductFind = jest.fn();
const mockUserFindById = jest.fn();

const mockCheckStock = jest.fn();
const mockReduceStock = jest.fn();
const mockReserveInventory = jest.fn();
const mockRestoreStock = jest.fn();

const mockGenerateInvoice = jest.fn();
const mockGetInvoiceByOrderId = jest.fn();
const mockSendNotification = jest.fn();
const mockFetchSetting = jest.fn();

// ----- Register module mocks before importing the SUT -----
jest.unstable_mockModule('../../src/modules/cart/cart.repository.js', () => ({
  __esModule: true,
  findCartByUser: mockFindCartByUser,
  clearCart: mockClearCart,
}));
jest.unstable_mockModule('../../src/modules/order/order.repository.js', () => ({
  __esModule: true,
  createOrder: mockRepoCreateOrder,
  findOrders: mockFindOrders,
  findById: mockRepoFindById,
}));
jest.unstable_mockModule('../../src/modules/order/order.model.js', () => ({
  __esModule: true,
  default: {
    findOne: mockOrderFindOne,
    findById: mockOrderFindById,
    findByIdAndUpdate: mockOrderFindByIdAndUpdate,
    findByIdAndDelete: mockOrderFindByIdAndDelete,
  },
}));
jest.unstable_mockModule('../../src/modules/product/product.model.js', () => ({
  __esModule: true,
  default: { find: mockProductFind, findById: jest.fn() },
}));
jest.unstable_mockModule('../../src/modules/user/user.model.js', () => ({
  __esModule: true,
  default: { findById: mockUserFindById },
}));
jest.unstable_mockModule('../../src/modules/inventory/inventory.service.js', () => ({
  __esModule: true,
  checkStock: mockCheckStock,
  reduceStock: mockReduceStock,
  reserveInventory: mockReserveInventory,
  restoreStock: mockRestoreStock,
}));
jest.unstable_mockModule('../../src/modules/invoice/invoice.service.js', () => ({
  __esModule: true,
  generateInvoice: mockGenerateInvoice,
  getInvoiceByOrderId: mockGetInvoiceByOrderId,
}));
jest.unstable_mockModule('../../src/modules/notification/notification.service.js', () => ({
  __esModule: true,
  sendNotification: mockSendNotification,
}));
jest.unstable_mockModule('../../src/modules/settings/settings.service.js', () => ({
  __esModule: true,
  fetchSetting: mockFetchSetting,
}));
jest.unstable_mockModule('../../src/modules/credit/credit.service.js', () => ({
  __esModule: true,
  useCredit: jest.fn(),
}));
jest.unstable_mockModule('../../src/modules/order/order.events.js', () => ({
  __esModule: true,
  onOrderCreated: jest.fn(),
}));
jest.unstable_mockModule('../../src/modules/analytics/analytics.events.js', () => ({
  __esModule: true,
  trackOrder: jest.fn(),
}));
jest.unstable_mockModule('../../src/modules/logistics/logistics.service.js', () => ({
  __esModule: true,
  createShipment: jest.fn(),
}));
jest.unstable_mockModule('../../src/services/deliveryAssignment.service.js', () => ({
  __esModule: true,
  assignDelivery: jest.fn(),
}));
jest.unstable_mockModule('../../src/services/queueManager.service.js', () => ({
  __esModule: true,
  queuePostOrderJobs: jest.fn(),
  queuePostPaymentJobs: jest.fn(),
}));
jest.unstable_mockModule('../../src/config/db.js', () => ({
  __esModule: true,
  getTransactionSupport: jest.fn(() => false),
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  __esModule: true,
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// ----- Aliases so existing test bodies keep working -----
const cartRepo = { findCartByUser: mockFindCartByUser, clearCart: mockClearCart };
const orderRepo = { createOrder: mockRepoCreateOrder, findOrders: mockFindOrders, findById: mockRepoFindById };
const inventoryService = {
  checkStock: mockCheckStock,
  reduceStock: mockReduceStock,
  reserveInventory: mockReserveInventory,
  restoreStock: mockRestoreStock,
};
const invoiceService = { generateInvoice: mockGenerateInvoice, getInvoiceByOrderId: mockGetInvoiceByOrderId };
const notificationService = { sendNotification: mockSendNotification };
const settingsService = { fetchSetting: mockFetchSetting };
const Product = { find: mockProductFind };
const Order = {
  findOne: mockOrderFindOne,
  findById: mockOrderFindById,
  findByIdAndUpdate: mockOrderFindByIdAndUpdate,
  findByIdAndDelete: mockOrderFindByIdAndDelete,
};

let orderService;

beforeAll(async () => {
  orderService = await import('../../src/modules/order/order.service.js');
});

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
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const buildValidOrderData = () => ({
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
        { productId: mockProductId, quantity: 2, price: 1000 },
      ],
    });

    it('should create order successfully with valid COD data', async () => {
      const validOrderData = buildValidOrderData();
      // null => no restrictions: COD allowed, no maintenance, no cutoff
      settingsService.fetchSetting.mockResolvedValue(null);

      Product.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { _id: mockProductId, name: 'Test Product', price: 1000, weight: 1, minOrderQty: 1 },
          ]),
        }),
      });

      inventoryService.checkStock.mockResolvedValue(true);
      inventoryService.reduceStock.mockResolvedValue(true);

      const createdOrder = {
        _id: mockOrderId,
        userId: mockUserId,
        items: validOrderData.items,
        totalAmount: 2360,
      };
      orderRepo.createOrder.mockResolvedValue(createdOrder);
      cartRepo.findCartByUser.mockResolvedValue(null);
      invoiceService.generateInvoice.mockResolvedValue({ invoiceId: 'INV-001' });
      notificationService.sendNotification.mockResolvedValue(true);

      const result = await orderService.createOrder(mockUserId, validOrderData);

      expect(result).toBeDefined();
      expect(result._id).toBe(mockOrderId);
      expect(inventoryService.reduceStock).toHaveBeenCalled();
      expect(orderRepo.createOrder).toHaveBeenCalled();
    });

    it('should throw error when shipping address is missing', async () => {
      const invalidData = { ...buildValidOrderData(), shippingAddress: null };

      await expect(orderService.createOrder(mockUserId, invalidData)).rejects.toThrow(
        'Shipping address is required'
      );
    });

    it('should throw error when user ID is invalid', async () => {
      await expect(orderService.createOrder('invalid-id', buildValidOrderData())).rejects.toThrow(
        'Invalid user ID'
      );
    });

    it('should throw error when system is in maintenance mode', async () => {
      settingsService.fetchSetting.mockImplementation((key) => {
        if (key === 'maintenanceMode') return Promise.resolve({ value: true });
        return Promise.resolve({ value: false });
      });

      await expect(orderService.createOrder(mockUserId, buildValidOrderData())).rejects.toThrow(
        'System under maintenance'
      );
    });

    it('should throw error when COD is disabled', async () => {
      settingsService.fetchSetting.mockImplementation((key) => {
        if (key === 'enableCOD') return Promise.resolve({ value: false });
        return Promise.resolve({ value: false });
      });

      await expect(orderService.createOrder(mockUserId, buildValidOrderData())).rejects.toThrow(
        'Cash on Delivery is currently unavailable'
      );
    });

    it('should throw error when order cutoff time has passed', async () => {
      settingsService.fetchSetting.mockImplementation((key) => {
        if (key === 'orderCutoffTime') return Promise.resolve({ value: '00:00' });
        return Promise.resolve({ value: false });
      });

      await expect(orderService.createOrder(mockUserId, buildValidOrderData())).rejects.toThrow(
        'Orders are closed for today'
      );
    });

    it('should throw error when cart is empty and no items provided', async () => {
      settingsService.fetchSetting.mockResolvedValue(null);
      cartRepo.findCartByUser.mockResolvedValue({ items: [] });

      await expect(
        orderService.createOrder(mockUserId, { ...buildValidOrderData(), items: [] })
      ).rejects.toThrow('Cart is empty');
    });

    it('should throw error when using CREDIT payment and credit system is disabled', async () => {
      settingsService.fetchSetting.mockImplementation((key) => {
        if (key === 'creditSystem') return Promise.resolve({ value: false });
        return Promise.resolve({ value: false });
      });

      const creditOrderData = { ...buildValidOrderData(), paymentMethod: 'CREDIT' };

      await expect(orderService.createOrder(mockUserId, creditOrderData)).rejects.toThrow(
        'Credit system is currently disabled'
      );
    });

    it('should handle idempotency correctly', async () => {
      const idempotencyKey = 'test-idem-key-123';
      const existingOrder = { _id: mockOrderId, idempotencyKey };

      Order.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(existingOrder),
      });

      const result = await orderService.createOrder(mockUserId, {
        ...buildValidOrderData(),
        idempotencyKey,
      });

      expect(result).toEqual(existingOrder);
      expect(Order.findOne).toHaveBeenCalledWith({ idempotencyKey });
    });
  });

  describe('getOrders', () => {
    it('should return filtered orders for regular user', async () => {
      const mockUser = { id: mockUserId, role: 'B2B_CUSTOMER' };
      const mockOrders = [{ _id: mockOrderId, userId: mockUserId, status: ORDER_STATUS.CONFIRMED }];

      orderRepo.findOrders.mockResolvedValue(mockOrders);

      const result = await orderService.getOrders(mockUser);

      expect(result).toEqual(mockOrders);
      expect(orderRepo.findOrders).toHaveBeenCalledWith(
        expect.objectContaining({ userId: mockUserId })
      );
    });

    it('should return all orders for admin user', async () => {
      const mockUser = { id: mockUserId, role: 'ADMIN' };
      const mockOrders = [
        { _id: mockOrderId, userId: mockUserId, status: ORDER_STATUS.PENDING },
      ];

      orderRepo.findOrders.mockResolvedValue(mockOrders);

      const result = await orderService.getOrders(mockUser);

      expect(result).toEqual(mockOrders);
      expect(orderRepo.findOrders).toHaveBeenCalledWith({});
    });
  });

  describe('getOrderById', () => {
    it('should return order by ID', async () => {
      const mockOrder = { _id: mockOrderId, userId: mockUserId, status: ORDER_STATUS.PENDING, items: [] };

      orderRepo.findById.mockResolvedValue(mockOrder);

      const result = await orderService.getOrderById(mockOrderId);

      expect(result).toEqual(mockOrder);
      expect(orderRepo.findById).toHaveBeenCalledWith(mockOrderId);
    });

    it('should throw error when order not found', async () => {
      orderRepo.findById.mockResolvedValue(null);

      await expect(orderService.getOrderById(mockOrderId)).rejects.toThrow('Order not found');
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully on a valid transition', async () => {
      const mockOrder = {
        _id: mockOrderId,
        status: ORDER_STATUS.PENDING,
        save: jest.fn().mockResolvedValue(true),
      };

      Order.findById.mockResolvedValue(mockOrder);

      await orderService.updateOrderStatus(mockOrderId, ORDER_STATUS.CONFIRMED);

      expect(mockOrder.status).toBe(ORDER_STATUS.CONFIRMED);
      expect(mockOrder.save).toHaveBeenCalled();
    });

    it('should throw error when order not found', async () => {
      Order.findById.mockResolvedValue(null);

      await expect(
        orderService.updateOrderStatus(mockOrderId, ORDER_STATUS.CONFIRMED)
      ).rejects.toThrow('Order not found');
    });

    it('should throw on an invalid status transition', async () => {
      const mockOrder = {
        _id: mockOrderId,
        status: ORDER_STATUS.PENDING,
        save: jest.fn().mockResolvedValue(true),
      };

      Order.findById.mockResolvedValue(mockOrder);

      await expect(
        orderService.updateOrderStatus(mockOrderId, ORDER_STATUS.DELIVERED)
      ).rejects.toThrow('Invalid status transition');
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

      Order.findById.mockResolvedValue(mockOrder);
      inventoryService.restoreStock.mockResolvedValue(true);

      await orderService.markOrderAsFailed(mockOrderId);

      expect(mockOrder.status).toBe(ORDER_STATUS.FAILED);
      expect(inventoryService.restoreStock).toHaveBeenCalledWith(
        mockProductId,
        2,
        expect.any(Object)
      );
      expect(mockOrder.save).toHaveBeenCalled();
    });

    it('should throw error for invalid order ID', async () => {
      await expect(orderService.markOrderAsFailed('invalid-id')).rejects.toThrow('Invalid order ID');
    });

    it('should throw error when order not found', async () => {
      Order.findById.mockResolvedValue(null);

      await expect(orderService.markOrderAsFailed(mockOrderId)).rejects.toThrow('Order not found');
    });
  });

  describe('downloadInvoice', () => {
    it('should generate invoice when existing invoice lacks a fileUrl', async () => {
      invoiceService.getInvoiceByOrderId.mockResolvedValue(null);
      // generated invoice still has no resolvable fileUrl on disk -> throws
      invoiceService.generateInvoice.mockResolvedValue({ _id: 'new-invoice-id', orderId: mockOrderId });

      await expect(orderService.downloadInvoice(mockOrderId)).rejects.toThrow(
        'Invoice could not be generated'
      );
      expect(invoiceService.generateInvoice).toHaveBeenCalledWith(mockOrderId);
    });
  });
});
