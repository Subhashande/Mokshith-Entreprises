import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './logistics.service.js';
import Order from '../order/order.model.js';
import Warehouse from '../warehouse/warehouse.model.js';
import { successResponse } from '../../utils/responseHandler.js';

export const createShipment = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  const warehouses = await Warehouse.find();

  const shipment = await service.createShipment(order, warehouses);

  successResponse(res, shipment, 'Shipment created');
});

export const updateStatus = asyncHandler(async (req, res) => {
  const shipment = await service.updateStatus(
    req.params.id,
    req.body.status
  );

  successResponse(res, shipment, 'Status updated');
});

export const getShipments = asyncHandler(async (req, res) => {
  const shipments = await service.getShipments();
  successResponse(res, shipments);
});