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

export const getShipments = asyncHandler(async (req, res) => {
  const shipments = await service.getShipments(req.user);
  successResponse(res, shipments);
});

export const getMyAssignments = asyncHandler(async (req, res) => {
  const shipments = await service.getMyAssignments(req.user._id);
  successResponse(res, shipments || []);
});

export const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const shipment = await service.updateStatus(req.params.id, status);

  // Emit real-time update
  if (global.io) {
    global.io.emit('delivery:statusUpdated', shipment);
  } else if (req.app.get('io')) {
    req.app.get('io').emit('delivery:statusUpdated', shipment);
  }

  successResponse(res, shipment, 'Status updated');
});

export const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  const shipment = await service.updateLocation(req.params.id, { lat, lng });

  // Emit real-time location update
  if (global.io) {
    global.io.emit('delivery:locationUpdated', {
      id: req.params.id,
      location: { lat, lng }
    });
  } else if (req.app.get('io')) {
    req.app.get('io').emit('delivery:locationUpdated', {
      id: req.params.id,
      location: { lat, lng }
    });
  }

  successResponse(res, shipment, 'Location updated');
});

export const getShipmentDetails = asyncHandler(async (req, res) => {
  const shipment = await service.getShipmentById(req.params.id);
  successResponse(res, shipment);
});