import * as repo from './shipment.repository.js';
import Order from '../order/order.model.js';
import AppError from '../../errors/AppError.js';

const VALID_STATUS = ['CREATED', 'IN_TRANSIT', 'DELIVERED'];

export const createShipment = async (orderId, warehouseId) => {
  const order = await Order.findById(orderId);

  if (!order) throw new AppError('Order not found', 404);

  // 🔥 Prevent duplicate shipment
  const existing = await repo.findByOrderId(orderId);
  if (existing) return existing;

  return repo.createShipment({
    orderId,
    warehouseId,
    trackingNumber: `TRK-${Date.now()}`,
  });
};

export const updateShipmentStatus = async (id, status) => {
  if (!VALID_STATUS.includes(status)) {
    throw new AppError('Invalid shipment status', 400);
  }

  const shipment = await repo.findById(id);

  if (!shipment) throw new AppError('Shipment not found', 404);

  shipment.status = status;

  return shipment.save();
};

export const getShipmentById = async (id) => {
  const shipment = await repo.findById(id);
  if (!shipment) throw new AppError('Shipment not found', 404);
  return shipment;
};

export const getShipmentByOrderId = async (orderId) => {
  const shipment = await repo.findByOrderId(orderId);
  if (!shipment) throw new AppError('Shipment not found for this order', 404);
  return shipment;
};