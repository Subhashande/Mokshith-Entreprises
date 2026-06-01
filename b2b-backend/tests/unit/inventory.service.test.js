import { describe, it, expect, jest, beforeAll, beforeEach, afterEach } from '@jest/globals';
import AppError from '../../src/errors/AppError.js';
import mongoose from 'mongoose';

// ESM-compatible mocking: declare mocks before importing the SUT
const mockFindInventory = jest.fn();
const mockCreateInventory = jest.fn();
const mockUpdateInventory = jest.fn();
const mockFindAll = jest.fn();
const mockFindByProduct = jest.fn();
const mockFindLowStock = jest.fn();
const mockGetStats = jest.fn();

const mockSetex = jest.fn();
const mockGet = jest.fn();
const mockDel = jest.fn();

// mongoose.model('Inventory').findOneAndUpdate is used directly by the service
const mockFindOneAndUpdate = jest.fn();

jest.unstable_mockModule('../../src/modules/inventory/inventory.repository.js', () => ({
  __esModule: true,
  findInventory: mockFindInventory,
  createInventory: mockCreateInventory,
  updateInventory: mockUpdateInventory,
  findAll: mockFindAll,
  findByProduct: mockFindByProduct,
  findLowStock: mockFindLowStock,
  getStats: mockGetStats,
}));

jest.unstable_mockModule('../../src/modules/warehouse/warehouse.model.js', () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

jest.unstable_mockModule('../../src/config/redis.js', () => ({
  __esModule: true,
  redisClient: {
    setex: mockSetex,
    get: mockGet,
    del: mockDel,
  },
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({
  __esModule: true,
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Aliases so existing test bodies keep working
const repo = {
  findInventory: mockFindInventory,
  createInventory: mockCreateInventory,
  findByProduct: mockFindByProduct,
  findLowStock: mockFindLowStock,
  getStats: mockGetStats,
  findAll: mockFindAll,
};
const redisClient = { setex: mockSetex, get: mockGet, del: mockDel };

let inventoryService;

beforeAll(async () => {
  // Stub mongoose.model('Inventory') used directly inside the service
  jest.spyOn(mongoose, 'model').mockImplementation(() => ({
    findOneAndUpdate: mockFindOneAndUpdate,
  }));
  inventoryService = await import('../../src/modules/inventory/inventory.service.js');
});

describe('Inventory Service - Unit Tests', () => {
  let mockProductId;
  let mockWarehouseId;
  let mockOrderId;

  beforeEach(() => {
    jest.clearAllMocks();

    // Re-apply mongoose.model stub (clearAllMocks resets spy implementations)
    jest.spyOn(mongoose, 'model').mockImplementation(() => ({
      findOneAndUpdate: mockFindOneAndUpdate,
    }));

    mockProductId = new mongoose.Types.ObjectId().toString();
    mockWarehouseId = new mongoose.Types.ObjectId().toString();
    mockOrderId = new mongoose.Types.ObjectId().toString();
  });

  afterEach(() => {
    // do not restoreAllMocks: it would remove the mongoose.model spy set in beforeAll
    jest.clearAllMocks();
  });

  describe('addStock', () => {
    it('should create inventory when none exists', async () => {
      const created = { productId: mockProductId, warehouseId: mockWarehouseId, stock: 50 };
      repo.findInventory.mockResolvedValue(null);
      repo.createInventory.mockResolvedValue(created);

      const result = await inventoryService.addStock({
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 50,
      });

      expect(result).toEqual(created);
      expect(repo.createInventory).toHaveBeenCalled();
    });

    it('should update existing stock', async () => {
      const mockInventory = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 50,
        save: jest.fn().mockResolvedValue(true),
      };

      repo.findInventory.mockResolvedValue(mockInventory);

      await inventoryService.addStock({
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 30,
      });

      expect(mockInventory.stock).toBe(80);
      expect(mockInventory.save).toHaveBeenCalled();
    });
  });

  describe('checkStock', () => {
    it('should return true when sufficient stock available', async () => {
      repo.findByProduct.mockResolvedValue([{ stock: 100 }]);

      const result = await inventoryService.checkStock(mockProductId, 50);

      expect(result).toBe(true);
      expect(repo.findByProduct).toHaveBeenCalledWith(mockProductId);
    });

    it('should throw when insufficient stock', async () => {
      repo.findByProduct.mockResolvedValue([{ stock: 30 }]);

      await expect(inventoryService.checkStock(mockProductId, 50)).rejects.toThrow(
        'Insufficient stock'
      );
    });

    it('should throw when no inventory records found', async () => {
      repo.findByProduct.mockResolvedValue([]);

      await expect(inventoryService.checkStock(mockProductId, 50)).rejects.toThrow(
        'Product inventory not configured'
      );
    });

    it('should calculate total stock across multiple warehouses', async () => {
      repo.findByProduct.mockResolvedValue([{ stock: 30 }, { stock: 40 }, { stock: 30 }]);

      const result = await inventoryService.checkStock(mockProductId, 90);

      expect(result).toBe(true);
    });
  });

  describe('reduceStock', () => {
    it('should reduce stock successfully via atomic update', async () => {
      const item = { _id: new mongoose.Types.ObjectId(), stock: 100, version: 0 };
      repo.findByProduct.mockResolvedValue([item]);
      mockFindOneAndUpdate.mockResolvedValue({ ...item, stock: 70 });

      const result = await inventoryService.reduceStock(mockProductId, 30);

      expect(result).toBe(true);
      expect(mockFindOneAndUpdate).toHaveBeenCalled();
    });

    it('should throw error when insufficient stock', async () => {
      repo.findByProduct.mockResolvedValue([{ _id: new mongoose.Types.ObjectId(), stock: 20, version: 0 }]);

      await expect(inventoryService.reduceStock(mockProductId, 30)).rejects.toThrow(
        'Insufficient total stock'
      );
    });

    it('should throw error when no inventory found', async () => {
      repo.findByProduct.mockResolvedValue([]);

      await expect(inventoryService.reduceStock(mockProductId, 30)).rejects.toThrow(
        'No inventory found'
      );
    });

    it('should fail after retries on optimistic locking conflicts', async () => {
      repo.findByProduct.mockResolvedValue([{ _id: new mongoose.Types.ObjectId(), stock: 100, version: 0 }]);
      // findOneAndUpdate returns null -> INVENTORY_CONFLICT -> retry -> eventually fail
      mockFindOneAndUpdate.mockResolvedValue(null);

      await expect(inventoryService.reduceStock(mockProductId, 30)).rejects.toThrow();
    });
  });

  describe('restoreStock', () => {
    it('should restore stock successfully', async () => {
      const item = { _id: new mongoose.Types.ObjectId(), stock: 70 };
      repo.findByProduct.mockResolvedValue([item]);
      mockFindOneAndUpdate.mockResolvedValue({ ...item, stock: 100 });

      const result = await inventoryService.restoreStock(mockProductId, 30);

      expect(result).toBe(true);
      expect(mockFindOneAndUpdate).toHaveBeenCalled();
    });

    it('should return false when no inventory found', async () => {
      repo.findByProduct.mockResolvedValue([]);

      const result = await inventoryService.restoreStock(mockProductId, 30);

      expect(result).toBe(false);
    });
  });

  describe('updateStock', () => {
    it('should set stock with default SET type', async () => {
      const mockInventory = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 50,
        save: jest.fn().mockResolvedValue(true),
      };

      repo.findInventory.mockResolvedValue(mockInventory);

      await inventoryService.updateStock({
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 100,
        type: 'SET',
      });

      expect(mockInventory.stock).toBe(100);
      expect(mockInventory.save).toHaveBeenCalled();
    });

    it('should increment stock with ADD type', async () => {
      const mockInventory = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 50,
        save: jest.fn().mockResolvedValue(true),
      };

      repo.findInventory.mockResolvedValue(mockInventory);

      await inventoryService.updateStock({
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 30,
        type: 'ADD',
      });

      expect(mockInventory.stock).toBe(80);
      expect(mockInventory.save).toHaveBeenCalled();
    });

    it('should decrement stock with SUBTRACT type', async () => {
      const mockInventory = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 50,
        save: jest.fn().mockResolvedValue(true),
      };

      repo.findInventory.mockResolvedValue(mockInventory);

      await inventoryService.updateStock({
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 20,
        type: 'SUBTRACT',
      });

      expect(mockInventory.stock).toBe(30);
      expect(mockInventory.save).toHaveBeenCalled();
    });

    it('should create inventory when not found and type is SET', async () => {
      const created = { productId: mockProductId, warehouseId: mockWarehouseId, stock: 100 };
      repo.findInventory.mockResolvedValue(null);
      repo.createInventory.mockResolvedValue(created);

      const result = await inventoryService.updateStock({
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 100,
        type: 'SET',
      });

      expect(result).toEqual(created);
    });

    it('should throw error when inventory not found and type is not SET', async () => {
      repo.findInventory.mockResolvedValue(null);

      await expect(
        inventoryService.updateStock({
          productId: mockProductId,
          warehouseId: mockWarehouseId,
          stock: 100,
          type: 'ADD',
        })
      ).rejects.toThrow('Inventory record not found');
    });
  });

  describe('getLowStockItems', () => {
    it('should return products with low stock', async () => {
      const mockLowStockItems = [
        { productId: mockProductId, stock: 5 },
        { productId: new mongoose.Types.ObjectId(), stock: 3 },
      ];

      repo.findLowStock.mockResolvedValue(mockLowStockItems);

      const result = await inventoryService.getLowStockItems();

      expect(result).toEqual(mockLowStockItems);
      expect(repo.findLowStock).toHaveBeenCalled();
    });
  });

  describe('getInventoryStats', () => {
    it('should return inventory statistics with productCount', async () => {
      repo.getStats.mockResolvedValue({
        totalStock: 1000,
        totalValue: 50000,
        uniqueProducts: [mockProductId, new mongoose.Types.ObjectId()],
      });

      const result = await inventoryService.getInventoryStats();

      expect(result).toBeDefined();
      expect(result.productCount).toBe(2);
      expect(repo.getStats).toHaveBeenCalled();
    });
  });

  describe('reserveInventory', () => {
    it('should reserve inventory successfully', async () => {
      const items = [{ productId: mockProductId, quantity: 10 }];

      repo.findByProduct.mockResolvedValue([{ stock: 100 }]);
      redisClient.setex.mockResolvedValue('OK');

      await inventoryService.reserveInventory(mockOrderId, items, 900);

      expect(redisClient.setex).toHaveBeenCalled();
    });

    it('should throw error when items array is empty', async () => {
      await expect(inventoryService.reserveInventory(mockOrderId, [], 900)).rejects.toThrow(
        'No items provided for reservation'
      );
    });

    it('should throw error when items is null', async () => {
      await expect(inventoryService.reserveInventory(mockOrderId, null, 900)).rejects.toThrow(
        'No items provided for reservation'
      );
    });

    it('should throw error when insufficient stock for reservation', async () => {
      const items = [{ productId: mockProductId, quantity: 150 }];

      repo.findByProduct.mockResolvedValue([{ stock: 100 }]);

      await expect(inventoryService.reserveInventory(mockOrderId, items, 900)).rejects.toThrow(
        'Insufficient stock'
      );
    });
  });

  describe('finalizeReservation', () => {
    it('should finalize reservation successfully', async () => {
      const reservation = { orderId: mockOrderId, items: [{ productId: mockProductId, quantity: 10 }] };
      redisClient.get.mockResolvedValue(JSON.stringify(reservation));
      redisClient.del.mockResolvedValue(1);

      // reduceStock path
      repo.findByProduct.mockResolvedValue([{ _id: new mongoose.Types.ObjectId(), stock: 100, version: 0 }]);
      mockFindOneAndUpdate.mockResolvedValue({ stock: 90 });

      const result = await inventoryService.finalizeReservation(mockOrderId);

      expect(result).toBe(true);
      expect(redisClient.del).toHaveBeenCalled();
    });

    it('should throw error when reservation not found', async () => {
      redisClient.get.mockResolvedValue(null);

      await expect(inventoryService.finalizeReservation(mockOrderId)).rejects.toThrow(
        'Reservation expired'
      );
    });
  });

  describe('releaseReservation', () => {
    it('should release reservation successfully', async () => {
      redisClient.del.mockResolvedValue(1);

      const result = await inventoryService.releaseReservation(mockOrderId);

      expect(result).toBe(true);
      expect(redisClient.del).toHaveBeenCalled();
    });

    it('should handle missing reservation gracefully', async () => {
      redisClient.del.mockResolvedValue(0);

      const result = await inventoryService.releaseReservation(mockOrderId);

      expect(result).toBe(true);
    });
  });

  describe('getInventory', () => {
    it('should return all inventory items', async () => {
      const mockInventory = [
        { productId: mockProductId, stock: 100, warehouseId: mockWarehouseId },
      ];

      repo.findAll.mockResolvedValue(mockInventory);

      const result = await inventoryService.getInventory();

      expect(result).toEqual(mockInventory);
      expect(repo.findAll).toHaveBeenCalled();
    });
  });
});
