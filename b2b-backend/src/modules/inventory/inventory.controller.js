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