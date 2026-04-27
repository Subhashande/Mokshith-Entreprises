import * as cartRepo from '../cart/cart.repository.js';
import * as orderRepo from './order.repository.js';
import * as creditRepo from '../credit/credit.repository.js';
import Product from '../product/product.model.js';
import Order from './order.model.js';
import User from '../user/user.model.js';

import AppError from '../../errors/AppError.js';
import { validateTransition } from './order.workflow.js';

import { generateInvoice, getInvoiceByOrderId } from '../invoice/invoice.service.js';
import { sendNotification } from '../notification/notification.service.js';

import { onOrderCreated } from './order.events.js';
import { trackOrder } from '../analytics/analytics.events.js';

import { checkStock, reduceStock } from '../inventory/inventory.service.js';
import { useCredit } from '../credit/credit.service.js';
import { createShipment } from '../logistics/logistics.service.js';
import { assignDelivery } from '../../services/deliveryAssignment.service.js';
import Warehouse from '../warehouse/warehouse.model.js';
import { fetchSetting } from '../settings/settings.service.js';

import { ORDER_STATUS } from '../../constants/orderStatus.js';
import { PAYMENT_STATUS } from '../../constants/paymentStatus.js';

import mongoose from 'mongoose';
import { getTransactionSupport } from '../../config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createOrder = async (userId, data) => {
  const { paymentMethod = 'COD', shippingAddress, items: requestItems, idempotencyKey } = data;

  // 🔥 0. Idempotency Check
  if (idempotencyKey) {
    const existingOrder = await Order.findOne({ idempotencyKey });
    if (existingOrder) return existingOrder;
  }

  // 🔥 0. Validation
  if (!shippingAddress) throw new AppError('Shipping address is required', 400);
  
  // 🔥 Check Maintenance Mode
  const maintenance = await fetchSetting('maintenanceMode');
  const maintenanceOld = await fetchSetting('MAINTENANCE_MODE');
  if (maintenance?.value === true || maintenanceOld?.value === true) {
    throw new AppError('System under maintenance. Order placement is blocked.', 503);
  }

  let finalItems = [];
  if (requestItems && requestItems.length > 0) {
    finalItems = requestItems;
  } else {
    const cart = await cartRepo.findCartByUser(userId);
    if (!cart || cart.items.length === 0) throw new AppError('Cart is empty', 400);
    finalItems = cart.items;
  }

  let totalAmount = 0;
  let totalWeight = 0;
  let totalQuantity = 0;
  const items = [];

  // 🔥 1. Validate + Prepare Items + Check Stock (Pre-check)
  for (const item of finalItems) {
    const product = await Product.findById(item.productId || item.id || item.productId?._id);
    if (!product) throw new AppError(`Product not found`, 404);

    // 🔥 Wholesale MOQ validation
    const minQty = product.minOrderQty || product.moq || 1;
    if (item.quantity < minQty) {
      throw new AppError(`Minimum order quantity for ${product.name} is ${minQty}`, 400);
    }

    await checkStock(product._id, item.quantity);

    const productPrice = product.price || product.basePrice || 0;
    const itemTotal = productPrice * item.quantity;
    totalAmount += itemTotal;
    totalWeight += (product.weight || 0) * item.quantity;
    totalQuantity += item.quantity;

    items.push({
      productId: product._id,
      name: product.name,
      price: productPrice,
      quantity: item.quantity,
    });
  }

  // 🔥 B2B Rule: No single-item purchase
  if (totalQuantity <= 1) {
    throw new AppError('B2B Rule: Minimum total quantity must be greater than 1. No single-item purchases allowed.', 400);
  }

  // Add 18% GST
  const tax = totalAmount * 0.18;
  const finalTotal = totalAmount + tax;

  // 🔥 3. Prepare Order Data
  const orderData = {
    userId,
    items,
    totalAmount: finalTotal,
    totalWeight,
    paymentMethod: paymentMethod.toUpperCase(),
    address: shippingAddress,
    shippingAddress,
    status: ORDER_STATUS.CREATED,
    paymentStatus: PAYMENT_STATUS.PENDING,
    requiresHeavyVehicle: totalWeight > 100,
    idempotencyKey
  };

  // 🔥 4. Status Mapping based on Payment Method (Strict Flow)
  if (paymentMethod.toUpperCase() === 'COD') {
    orderData.status = ORDER_STATUS.CONFIRMED;
  } else {
    orderData.paymentStatus = PAYMENT_STATUS.PENDING;
    orderData.status = ORDER_STATUS.PENDING_PAYMENT;
  }

  // 🔥 5. Atomic Order Creation + Stock Deduction using Transactions if supported
  const supportsTransactions = getTransactionSupport();
  let session = null;
  let order;

  try {
    if (supportsTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    // Create order
    order = await orderRepo.createOrder(orderData, { session });
    
    // Deduct stock
    for (const item of items) {
      await reduceStock(item.productId, item.quantity, { session });
    }

    if (supportsTransactions) {
      await session.commitTransaction();
      session.endSession();
    }
  } catch (err) {
    if (supportsTransactions && session) {
      await session.abortTransaction();
      session.endSession();
    } else {
      // Manual rollback if transactions not supported
      if (order) await Order.findByIdAndDelete(order._id);
      // Note: Rolling back stock manually is complex without transactions, 
      // which is why replica sets are recommended for production.
    }
    
    throw new AppError(err.message || 'Order placement failed', err.statusCode || 500);
  }

  // 🔥 6. Post-Order Processing
  try {
    // Clear Cart ONLY for COD immediately, others after payment
    if (paymentMethod.toUpperCase() === 'COD') {
      if (!requestItems || requestItems.length === 0) {
        const cart = await cartRepo.findCartByUser(userId);
        if (cart) {
          cart.items = [];
          await cart.save();
        }
      }
      
      // Generate Invoice & Notification
      await generateInvoice(order._id);
      await sendNotification({
        userId,
        title: 'Order Confirmed',
        message: `Your order #${order._id} for ₹${finalTotal.toLocaleString()} has been placed successfully.`,
      });
      
      await onOrderCreated(order);
      trackOrder(order);

      // Shipment Creation
      const warehouses = await Warehouse.find();
      if (warehouses.length > 0) {
        const shipment = await createShipment(order, warehouses);
        order.shipmentId = shipment._id;
        await order.save();
      }

      // 🔥 Auto-assign Delivery Partner ONLY for COD immediately, others after payment
      await assignDelivery(order);
    } else {
      // For non-COD, just notify about pending order
      await sendNotification({
        userId,
        title: 'Order Initiated',
        message: `Your order #${order._id} has been initiated. Please complete the payment to finalize it.`,
      });
    }
  } catch (err) {
    console.error('Non-critical post-order error:', err.message);
  }

  return order;
};

export const getOrders = async (user) => {
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return orderRepo.findOrders({});
  }

  // Filter out FAILED, CREATED, and PENDING_PAYMENT orders for regular users
  return orderRepo.findOrders({ 
    userId: user.id,
    status: { 
      $nin: [
        ORDER_STATUS.FAILED, 
        ORDER_STATUS.CREATED, 
        ORDER_STATUS.PENDING_PAYMENT
      ] 
    }
  });
};

export const getOrderById = async (id) => {
  const order = await orderRepo.findById(id);

  if (!order) throw new AppError('Order not found', 404);

  return order;
};

export const downloadInvoice = async (orderId) => {
  const invoice = await getInvoiceByOrderId(orderId);
  if (!invoice || !invoice.fileUrl) {
    // If invoice doesn't exist, try generating it
    const newInvoice = await generateInvoice(orderId);
    if (!newInvoice || !newInvoice.fileUrl) {
      throw new AppError('Invoice not found and could not be generated', 404);
    }
    const filePath = path.join(__dirname, '../../..', newInvoice.fileUrl);
    return {
      filePath,
      fileName: `invoice-${newInvoice.invoiceNumber}.pdf`
    };
  }

  const filePath = path.join(__dirname, '../../..', invoice.fileUrl);
  return {
    filePath,
    fileName: `invoice-${invoice.invoiceNumber}.pdf`
  };
};

export const markOrderAsFailed = async (id) => {
  const order = await Order.findById(id);
  if (!order) throw new AppError('Order not found', 404);
  
  // Only process if not already failed
  if (order.status === ORDER_STATUS.FAILED) return order;

  order.status = ORDER_STATUS.FAILED;
  order.paymentStatus = PAYMENT_STATUS.FAILED;
  await order.save();

  // Restore stock
  try {
    for (const item of order.items) {
      await restoreStock(item.productId, item.quantity);
    }
  } catch (err) {
    console.error('Failed to restore stock for order:', id, err.message);
  }

  return order;
};

export const updateOrderStatus = async (orderId, newStatus) => {
  const order = await Order.findById(orderId);

  if (!order) throw new AppError('Order not found', 404);

  validateTransition(order.status, newStatus);

  order.status = newStatus;

  return order.save();
};