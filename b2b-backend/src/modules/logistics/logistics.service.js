import * as repo from './logistics.repository.js';
import AppError from '../../errors/AppError.js';
import { optimizeRoute } from './routeOptimization.js';
import Order from '../order/order.model.js';
import { DELIVERY_STATUS } from '../../constants/deliveryStatus.js';
import { ORDER_STATUS } from '../../constants/orderStatus.js';

export const createShipment = async (order, warehouses) => {
  if (!order) throw new AppError('Order not found', 404);

  const existing = await repo.findByOrder(order._id);
  if (existing) return existing;

  const selectedWarehouse = optimizeRoute(warehouses);

  return repo.createShipment({
    orderId: order._id,
    warehouseId: selectedWarehouse?._id,
    trackingNumber: `TRK-${Date.now()}`,
    status: DELIVERY_STATUS.PENDING,
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  });
};

export const updateStatus = async (id, status) => {
  const shipment = await repo.updateShipment(id, { status });
  if (!shipment) throw new AppError('Shipment not found', 404);

  // 🔥 Sync with Order Status
  const order = await Order.findById(shipment.orderId);
  if (order) {
    if (status === DELIVERY_STATUS.PICKED) {
      order.status = ORDER_STATUS.PACKED;
    } else if (status === DELIVERY_STATUS.OUT_FOR_DELIVERY) {
      order.status = ORDER_STATUS.OUT_FOR_DELIVERY;
    } else if (status === DELIVERY_STATUS.DELIVERED) {
      order.status = ORDER_STATUS.DELIVERED;
      order.paymentStatus = 'PAID'; // If it was COD
    }
    await order.save();
  }

  return shipment;
};

export const assignDeliveryPartner = async (id, partnerId) => {
  return repo.updateShipment(id, { deliveryPartnerId: partnerId });
};

export const getShipments = async () => {
  return repo.findAll();
};