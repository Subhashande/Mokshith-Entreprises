import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as inventoryService from '../../src/modules/inventory/inventory.service.js';
import Inventory from '../../src/modules/inventory/inventory.model.js';
import Product from '../../src/modules/product/product.model.js';
import Warehouse from '../../src/modules/warehouse/warehouse.model.js';
import { redisClient } from '../../src/config/redis.js';
import AppError from '../../src/errors/AppError.js';
import mongoose from 'mongoose';

jest.mock('../../src/modules/inventory/inventory.model.js', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    aggregate: jest.fn(),
    find: jest.fn(),
  },
}));
jest.mock('../../src/modules/product/product.model.js', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));
jest.mock('../../src/modules/warehouse/warehouse.model.js', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));
jest.mock('../../src/config/redis.js', () => ({
  redisClient: {
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  },
}));

describe('Inventory Service - Unit Tests', () => {
  let mockProductId;
  let mockWarehouseId;
  let mockOrderId;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockProductId = new mongoose.Types.ObjectId().toString();
    mockWarehouseId = new mongoose.Types.ObjectId().toString();
    mockOrderId = new mongoose.Types.ObjectId().toString();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('addStock', () => {
    it('should add stock successfully', async () => {
      const mockInventory = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 50,
        save: jest.fn().mockResolvedValue(true),
      };

      Inventory.findOne = jest.fn().mockResolvedValue(null);
      Inventory.prototype.save = jest.fn().mockResolvedValue(mockInventory);

      const result = await inventoryService.addStock({
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 50,
      });

      expect(result).toBeDefined();
      expect(Inventory.prototype.save).toHaveBeenCalled();
    });

    it('should update existing stock', async () => {
      const mockInventory = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 50,
        save: jest.fn().mockResolvedValue(true),
      };

      Inventory.findOne = jest.fn().mockResolvedValue(mockInventory);

      const result = await inventoryService.addStock({
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
      const mockInventory = [{ stock: 100 }];

      Inventory.find = jest.fn().mockResolvedValue(mockInventory);

      const result = await inventoryService.checkStock(mockProductId, 50);

      expect(result).toBe(true);
      expect(Inventory.find).toHaveBeenCalledWith({ productId: mockProductId });
    });

    it('should return false when insufficient stock', async () => {
      const mockInventory = [{ stock: 30 }];

      Inventory.find = jest.fn().mockResolvedValue(mockInventory);

      const result = await inventoryService.checkStock(mockProductId, 50);

      expect(result).toBe(false);
    });

    it('should return false when no inventory found', async () => {
      Inventory.find = jest.fn().mockResolvedValue([]);

      const result = await inventoryService.checkStock(mockProductId, 50);

      expect(result).toBe(false);
    });

    it('should calculate total stock across multiple warehouses', async () => {
      const mockInventory = [{ stock: 30 }, { stock: 40 }, { stock: 30 }];

      Inventory.find = jest.fn().mockResolvedValue(mockInventory);

      const result = await inventoryService.checkStock(mockProductId, 90);

      expect(result).toBe(true);
    });
  });

  describe('reduceStock', () => {
    it('should reduce stock successfully', async () => {
      const mockInventory = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 100,
        reserved: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      Inventory.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockInventory),
      });

      const result = await inventoryService.reduceStock(mockProductId, 30);

      expect(mockInventory.stock).toBe(70);
      expect(mockInventory.save).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should throw error when insufficient stock', async () => {
      const mockInventory = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 20,
        reserved: 0,
      };

      Inventory.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockInventory),
      });

      await expect(inventoryService.reduceStock(mockProductId, 30)).rejects.toThrow(
        'Insufficient stock'
      );
    });

    it('should throw error when no inventory found', async () => {
      Inventory.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

      await expect(inventoryService.reduceStock(mockProductId, 30)).rejects.toThrow(
        'No inventory found'
      );
    });

    it('should handle optimistic locking conflicts', async () => {
      const mockInventory = {
        productId: mockProductId,
        stock: 100,
        reserved: 0,
        __v: 1,
        save: jest.fn().mockRejectedValue({ name: 'VersionError' }),
      };

      Inventory.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockInventory),
      });

      await expect(inventoryService.reduceStock(mockProductId, 30)).rejects.toThrow();
    });
  });

  describe('restoreStock', () => {
    it('should restore stock successfully', async () => {
      const mockInventory = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 70,
        save: jest.fn().mockResolvedValue(true),
      };

      Inventory.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockInventory),
      });

      const result = await inventoryService.restoreStock(mockProductId, 30);

      expect(mockInventory.stock).toBe(100);
      expect(mockInventory.save).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should throw error when no inventory found', async () => {
      Inventory.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

      await expect(inventoryService.restoreStock(mockProductId, 30)).rejects.toThrow(
        'No inventory found'
      );
    });
  });

  describe('updateStock', () => {
    it('should set stock with SET type', async () => {
      const mockInventory = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 50,
        save: jest.fn().mockResolvedValue(true),
      };

      Inventory.findOne = jest.fn().mockResolvedValue(mockInventory);

      await inventoryService.updateStock({
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 100,
        type: 'SET',
      });

      expect(mockInventory.stock).toBe(100);
      expect(mockInventory.save).toHaveBeenCalled();
    });

    it('should increment stock with INCREMENT type', async () => {
      const mockInventory = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 50,
        save: jest.fn().mockResolvedValue(true),
      };

      Inventory.findOne = jest.fn().mockResolvedValue(mockInventory);

      await inventoryService.updateStock({
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 30,
        type: 'INCREMENT',
      });

      expect(mockInventory.stock).toBe(80);
      expect(mockInventory.save).toHaveBeenCalled();
    });

    it('should decrement stock with DECREMENT type', async () => {
      const mockInventory = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 50,
        save: jest.fn().mockResolvedValue(true),
      };

      Inventory.findOne = jest.fn().mockResolvedValue(mockInventory);

      await inventoryService.updateStock({
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        stock: 20,
        type: 'DECREMENT',
      });

      expect(mockInventory.stock).toBe(30);
      expect(mockInventory.save).toHaveBeenCalled();
    });

    it('should throw error when inventory not found', async () => {
      Inventory.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        inventoryService.updateStock({
          productId: mockProductId,
          warehouseId: mockWarehouseId,
          stock: 100,
        })
      ).rejects.toThrow('Inventory not found');
    });
  });

  describe('getLowStockItems', () => {
    it('should return products with low stock', async () => {
      const mockLowStockItems = [
        { productId: mockProductId, stock: 5 },
        { productId: new mongoose.Types.ObjectId(), stock: 3 },
      ];

      Inventory.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockLowStockItems),
      });

      const result = await inventoryService.getLowStockItems();

      expect(result).toEqual(mockLowStockItems);
      expect(Inventory.find).toHaveBeenCalled();
    });
  });

  describe('getInventoryStats', () => {
    it('should return inventory statistics', async () => {
      const mockStats = [
        { _id: null, totalStock: 1000, totalValue: 50000, totalProducts: 50 },
      ];

      Inventory.aggregate = jest.fn().mockResolvedValue(mockStats);

      const result = await inventoryService.getInventoryStats();

      expect(result).toBeDefined();
      expect(Inventory.aggregate).toHaveBeenCalled();
    });
  });

  describe('reserveInventory', () => {
    it('should reserve inventory successfully', async () => {
      const items = [
        { productId: mockProductId, quantity: 10 },
      ];

      redisClient.setex = jest.fn().mockResolvedValue('OK');
      Inventory.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue({
          productId: mockProductId,
          stock: 100,
          reserved: 0,
          save: jest.fn().mockResolvedValue(true),
        }),
      });

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

      Inventory.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue({
          productId: mockProductId,
          stock: 100,
          reserved: 0,
        }),
      });

      await expect(inventoryService.reserveInventory(mockOrderId, items, 900)).rejects.toThrow(
        'Insufficient stock'
      );
    });
  });

  describe('finalizeReservation', () => {
    it('should finalize reservation successfully', async () => {
      const mockReservationData = JSON.stringify([
        { productId: mockProductId, quantity: 10 },
      ]);

      redisClient.get = jest.fn().mockResolvedValue(mockReservationData);
      redisClient.del = jest.fn().mockResolvedValue(1);
      Inventory.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue({
          productId: mockProductId,
          stock: 100,
          reserved: 10,
          save: jest.fn().mockResolvedValue(true),
        }),
      });

      const result = await inventoryService.finalizeReservation(mockOrderId);

      expect(result).toBe(true);
      expect(redisClient.del).toHaveBeenCalled();
    });

    it('should throw error when reservation not found', async () => {
      redisClient.get = jest.fn().mockResolvedValue(null);

      await expect(inventoryService.finalizeReservation(mockOrderId)).rejects.toThrow(
        'Reservation not found or expired'
      );
    });

    it('should throw timeout error when finalization takes too long', async () => {
      const mockReservationData = JSON.stringify([
        { productId: mockProductId, quantity: 10 },
      ]);

      redisClient.get = jest.fn().mockResolvedValue(mockReservationData);

      const result = inventoryService.finalizeReservation(mockOrderId, {
        globalTimeoutMs: 1,
      });

      await expect(result).rejects.toThrow(/timeout|exceeded/i);
    }, 10000);
  });

  describe('releaseReservation', () => {
    it('should release reservation successfully', async () => {
      const mockReservationData = JSON.stringify([
        { productId: mockProductId, quantity: 10 },
      ]);

      redisClient.get = jest.fn().mockResolvedValue(mockReservationData);
      redisClient.del = jest.fn().mockResolvedValue(1);
      Inventory.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue({
          productId: mockProductId,
          stock: 100,
          reserved: 10,
          save: jest.fn().mockResolvedValue(true),
        }),
      });

      const result = await inventoryService.releaseReservation(mockOrderId);

      expect(result).toBe(true);
      expect(redisClient.del).toHaveBeenCalled();
    });

    it('should handle missing reservation gracefully', async () => {
      redisClient.get = jest.fn().mockResolvedValue(null);
      redisClient.del = jest.fn().mockResolvedValue(0);

      const result = await inventoryService.releaseReservation(mockOrderId);

      expect(result).toBe(true);
    });
  });

  describe('getInventory', () => {
    it('should return all inventory items', async () => {
      const mockInventory = [
        { productId: mockProductId, stock: 100, warehouseId: mockWarehouseId },
        { productId: new mongoose.Types.ObjectId(), stock: 50, warehouseId: mockWarehouseId },
      ];

      Inventory.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockInventory),
        }),
      });

      const result = await inventoryService.getInventory();

      expect(result).toEqual(mockInventory);
      expect(Inventory.find).toHaveBeenCalled();
    });
  });
});
