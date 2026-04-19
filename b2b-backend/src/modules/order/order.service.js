import * as cartRepo from '../cart/cart.repository.js';
import * as orderRepo from './order.repository.js';
import Product from '../product/product.model.js';
import Order from './order.model.js';

import AppError from '../../errors/AppError.js';
import { validateTransition } from './order.workflow.js';

import { generateInvoice } from '../invoice/invoice.service.js';
import { sendNotification } from '../notification/notification.service.js';

import { onOrderCreated } from './order.events.js';
import { trackOrder } from '../analytics/analytics.events.js';

// 🔥 NEW INTEGRATIONS
import { checkStock, reduceStock } from '../inventory/inventory.service.js';
import { useCredit } from '../credit/credit.service.js';
import { createShipment } from '../logistics/logistics.service.js';
import Warehouse from '../warehouse/warehouse.model.js';

export const createOrder = async (userId, paymentMethod = 'COD') => {
  const cart = await cartRepo.findCartByUser(userId);

  if (!cart || cart.items.length === 0) {
    throw new AppError('Cart is empty', 400);
  }

  let totalAmount = 0;
  const items = [];

  // 🔥 1. Validate + Prepare Items
  for (const item of cart.items) {
    const product = await Product.findById(item.productId);

    if (!product) throw new AppError('Product not found', 404);

    await checkStock(product._id, item.quantity);

    const itemTotal = product.price * item.quantity;
    totalAmount += itemTotal;

    items.push({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
    });
  }

  // 🔥 2. Credit Handling
  if (paymentMethod === 'CREDIT') {
    await useCredit(userId, totalAmount);
  }

  // 🔥 3. Create Order
  const order = await orderRepo.createOrder({
    userId,
    items,
    totalAmount,
    paymentMethod,
    status: 'PENDING',
  });

  // 🔥 4. Reduce Inventory (NEW)
  for (const item of items) {
    await reduceStock(item.productId, item.quantity);
  }

  // 🔥 5. Clear Cart
  cart.items = [];
  await cart.save();

  // 🔥 6. Shipment Creation (NEW)
  const warehouses = await Warehouse.find();
  const shipment = await createShipment(order, warehouses);

  order.shipmentId = shipment._id;
  await order.save();

  // 🔥 EXISTING LOGIC (UNCHANGED)
  await generateInvoice(order);

  await sendNotification({
    userId,
    title: 'Order Created',
    message: `Your order ${order._id} has been placed`,
  });

  // 🔥 EVENTS (UNCHANGED)
  try {
    await onOrderCreated(order);
    trackOrder(order);
  } catch (err) {
    console.error('Order event failed:', err.message);
  }

  return order;
};

export const getOrders = async (user) => {
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return orderRepo.findOrders({});
  }

  return orderRepo.findOrders({ userId: user.id });
};

export const getOrderById = async (id) => {
  const order = await orderRepo.findById(id);

  if (!order) throw new AppError('Order not found', 404);

  return order;
};

export const updateOrderStatus = async (orderId, newStatus) => {
  const order = await Order.findById(orderId);

  if (!order) throw new AppError('Order not found', 404);

  validateTransition(order.status, newStatus);

  order.status = newStatus;

  return order.save();
};