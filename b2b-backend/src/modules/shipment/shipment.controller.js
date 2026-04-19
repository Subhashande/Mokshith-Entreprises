import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './shipment.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const createShipment = asyncHandler(async (req, res) => {
  const data = await service.createShipment(
    req.body.orderId,
    req.body.warehouseId
  );

  successResponse(res, data, 'Shipment created');
});

export const updateShipmentStatus = asyncHandler(async (req, res) => {
  const data = await service.updateShipmentStatus(
    req.params.id,
    req.body.status
  );

  successResponse(res, data, 'Shipment updated');
});