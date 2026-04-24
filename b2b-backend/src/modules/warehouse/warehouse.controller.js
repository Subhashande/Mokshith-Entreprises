import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './warehouse.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const createWarehouse = asyncHandler(async (req, res) => {
  const data = await service.createWarehouse(req.body);
  successResponse(res, data, 'Warehouse created');
});

export const getWarehouses = asyncHandler(async (req, res) => {
  const data = await service.getWarehouses();
  successResponse(res, data);
});

export const updateWarehouse = asyncHandler(async (req, res) => {
  const data = await service.updateWarehouse(req.params.id, req.body);
  successResponse(res, data, 'Warehouse updated');
});

export const deleteWarehouse = asyncHandler(async (req, res) => {
  await service.deleteWarehouse(req.params.id);
  successResponse(res, null, 'Warehouse deleted');
});