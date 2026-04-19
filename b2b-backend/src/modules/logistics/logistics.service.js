import * as repo from './logistics.repository.js';
import AppError from '../../errors/AppError.js';
import { optimizeRoute } from './routeOptimization.js';

export const createShipment = async (order, warehouses) => {
  if (!order) throw new AppError('Order not found', 404);

  const existing = await repo.findByOrder(order._id);
  if (existing) return existing;

  const selectedWarehouse = optimizeRoute(warehouses);

  return repo.createShipment({
    orderId: order._id,
    warehouseId: selectedWarehouse?._id,
    trackingNumber: `TRK-${Date.now()}`,
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  });
};

export const updateStatus = async (id, status) => {
  return repo.updateShipment(id, { status });
};

export const getShipments = async () => {
  return repo.findAll();
};