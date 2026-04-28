import * as repo from './logistics.repository.js';
import AppError from '../../errors/AppError.js';
import { optimizeRoute } from './routeOptimization.js';
import Order from '../order/order.model.js';
import { DELIVERY_STATUS } from '../../constants/deliveryStatus.js';
import { ORDER_STATUS } from '../../constants/orderStatus.js';
import mongoose from 'mongoose';
import { logger } from '../../config/logger.js';

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

export const autoAssignDelivery = async (orderId) => {
  logger.info('Auto-assigning delivery for order:', orderId);
  
  const order = await Order.findById(orderId).populate('userId');
  if (!order) return;

  const User = mongoose.model('User');
  const Shipment = mongoose.model('Logistics');

  // 1. Find all active delivery partners
  const activePartners = await User.find({ 
    role: 'DELIVERY_PARTNER', 
    status: 'ACTIVE' 
  });

  if (!activePartners || activePartners.length === 0) {
    logger.warn('No active delivery partners found for auto-assignment');
    return;
  }

  // 2. Count active orders for each partner
  const partnerWorkload = await Promise.all(activePartners.map(async (partner) => {
    const activeOrdersCount = await Shipment.countDocuments({
      deliveryPartnerId: partner._id,
      status: { $in: ['ASSIGNED', 'PICKED', 'OUT_FOR_DELIVERY'] }
    });
    return { partner, activeOrdersCount };
  }));

  // 3. Choose partner with least active orders
  const chosenPartner = partnerWorkload.sort((a, b) => a.activeOrdersCount - b.activeOrdersCount)[0].partner;

  // 4. Create or update shipment
  let shipment = await repo.findByOrder(orderId);
  
  if (shipment) {
    shipment.deliveryPartnerId = chosenPartner._id;
    shipment.status = 'ASSIGNED';
    await shipment.save();
  } else {
    const user = order.userId;
    const defaultAddress = order.address || user?.addresses?.find(a => a.isDefault) || user?.addresses?.[0] || {};
    const fullAddress = order.address 
      ? `${order.address.addressLine}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}`
      : `${defaultAddress.addressLine || ''}, ${defaultAddress.city || ''}, ${defaultAddress.state || ''} - ${defaultAddress.pincode || ''}`;

    shipment = await repo.createShipment({
      orderId: order._id,
      deliveryPartnerId: chosenPartner._id,
      trackingNumber: `TRK-${Date.now()}`,
      status: 'ASSIGNED',
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      address: fullAddress || 'Address not provided',
      customerName: user?.name || 'Customer',
      phone: order.address?.phone || defaultAddress.phone || user?.mobile || 'N/A'
    });
  }

  // 5. Emit socket event
  if (global.io) {
    global.io.emit('delivery:assigned', {
      orderId: order._id,
      deliveryPartnerId: chosenPartner._id,
      shipmentId: shipment._id
    });
  }

  logger.info(`Order ${orderId} auto-assigned to ${chosenPartner.name}`);
  return shipment;
};

export const getDeliveryQueue = async (user) => {
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return repo.findAllActive();
  }
  return repo.findByPartner(user._id, ['PENDING', 'ASSIGNED', 'ACCEPTED', 'OUT_FOR_DELIVERY']);
};

export const getDeliveryHistory = async (user) => {
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return repo.findAllDelivered();
  }
  return repo.findByPartner(user._id, ['DELIVERED', 'CANCELLED']);
};

export const updateStatus = async (id, status, userId) => {
  const update = { status };
  if (status === 'ACCEPTED') {
    update.deliveryPartnerId = userId;
  }
  if (status === 'DELIVERED') {
    update.deliveredAt = new Date();
  }
  
  const shipment = await repo.updateShipment(id, update);
  if (!shipment) throw new AppError('Shipment not found', 404);

  // Update order status as well
  if (status === 'OUT_FOR_DELIVERY') {
    await Order.findByIdAndUpdate(shipment.orderId, { status: ORDER_STATUS.SHIPPED });
  } else if (status === 'DELIVERED') {
    await Order.findByIdAndUpdate(shipment.orderId, { status: ORDER_STATUS.DELIVERED });
  }

  return shipment;
};

export const getShipments = async (user) => {
  const filter = {};
  if (user.role === 'DELIVERY_PARTNER') {
    filter.deliveryPartnerId = user._id;
  } else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    // Admin sees everything
  } else {
    // Other roles see nothing for now to prevent data leakage
    return [];
  }
  return repo.findAll(filter);
};

export const getShipmentById = async (id) => {
  const shipment = await repo.findById(id);
  if (!shipment) throw new AppError('Shipment not found', 404);
  return shipment;
};

export const getMyAssignments = async (deliveryBoyId) => {
  const filter = {
    deliveryPartnerId: deliveryBoyId,
    status: { $ne: 'DELIVERED' }
  };
  return await repo.findAll(filter);
};

export const updateLocation = async (id, location) => {
  const shipment = await repo.updateShipment(id, { currentLocation: location });
  if (!shipment) throw new AppError('Shipment not found', 404);
  return shipment;
};