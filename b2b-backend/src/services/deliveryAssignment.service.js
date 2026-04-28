import User from '../modules/user/user.model.js';
import Logistics from '../modules/logistics/logistics.model.js';
import { logger } from '../config/logger.js';

export const assignDelivery = async (order) => {
  try {
    // Find an available delivery partner (basic logic: find first active one)
    // Note: The user mentioned role: "DELIVERY", but in the project it's "DELIVERY_PARTNER"
    const deliveryPartner = await User.findOne({ 
      $or: [{ role: 'DELIVERY_PARTNER' }, { role: 'DELIVERY' }],
      status: 'active'
    });

    if (!deliveryPartner) {
      logger.warn(`No delivery partner available for order ${order._id}`);
      return null;
    }

    // Create Logistics assignment
    const logistics = await Logistics.create({
      orderId: order._id,
      deliveryBoyId: deliveryPartner._id, // User requested deliveryBoyId
      deliveryPartnerId: deliveryPartner._id, // Project uses deliveryPartnerId
      status: 'ASSIGNED',
      address: order.shippingAddress ? `${order.shippingAddress.addressLine}, ${order.shippingAddress.city}` : 'Address not provided',
      customerName: order.customerName || order.shippingAddress?.name || 'Customer',
      phone: order.phone || order.shippingAddress?.phone || '',
      trackingNumber: `TRK-${Date.now()}`
    });

    logger.info(`Order ${order._id} assigned to delivery partner ${deliveryPartner._id}`);
    return logistics;
  } catch (error) {
    logger.error('Delivery assignment failed:', error);
    return null;
  }
};
