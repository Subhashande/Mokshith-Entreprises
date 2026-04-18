import * as repo from './shipment.repository.js';
import Order from '../order/order.model.js';
import AppError from '../../errors/AppError.js';

export const createShipment = async (orderId, warehouseId) => {
  const order = await Order.findById(orderId);

  if (!order) throw new AppError('Order not found', 404);

  return repo.createShipment({
    orderId,
    warehouseId,
    trackingNumber: `TRK-${Date.now()}`,
  });
};

export const updateShipmentStatus = async (id, status) => {
  return repo.updateShipment(id, { status });
};