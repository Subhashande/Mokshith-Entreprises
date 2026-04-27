import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './inventory.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const addStock = asyncHandler(async (req, res) => {
  const data = await service.addStock(req.body);
  successResponse(res, data, 'Stock updated');
});

export const getInventory = asyncHandler(async (req, res) => {
  const data = await service.getInventory();
  successResponse(res, data);
});

export const getLowStockItems = asyncHandler(async (req, res) => {
  const data = await service.getLowStockItems();
  successResponse(res, data);
});

export const getInventoryStats = asyncHandler(async (req, res) => {
  const data = await service.getInventoryStats();
  successResponse(res, data);
});

export const updateStock = asyncHandler(async (req, res) => {
  const data = await service.updateStock(req.body);
  successResponse(res, data, 'Stock updated successfully');
});
