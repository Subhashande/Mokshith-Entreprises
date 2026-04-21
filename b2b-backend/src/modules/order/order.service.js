import * as cartRepo from '../cart/cart.repository.js';
import * as orderRepo from './order.repository.js';
import * as creditRepo from '../credit/credit.repository.js';
import Product from '../product/product.model.js';
import Order from './order.model.js';
import User from '../user/user.model.js';

import AppError from '../../errors/AppError.js';
import { validateTransition } from './order.workflow.js';

import { generateInvoice } from '../invoice/invoice.service.js';
import { sendNotification } from '../notification/notification.service.js';

import { onOrderCreated } from './order.events.js';
import { trackOrder } from '../analytics/analytics.events.js';

import { checkStock, reduceStock } from '../inventory/inventory.service.js';
import { useCredit } from '../credit/credit.service.js';
import { createShipment } from '../logistics/logistics.service.js';
import Warehouse from '../warehouse/warehouse.model.js';
import { fetchSetting } from '../settings/settings.service.js';

import { ORDER_STATUS } from '../../constants/orderStatus.js';
import { PAYMENT_STATUS } from '../../constants/paymentStatus.js';

export const createOrder = async (userId, data) => {
  const { paymentMethod = 'COD', shippingAddress, items: requestItems } = data;

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
  const items = [];

  // 🔥 1. Validate + Prepare Items + Check Stock
  for (const item of finalItems) {
    const product = await Product.findById(item.productId || item.id);
    if (!product) throw new AppError(`Product ${item.name || item.productId} not found`, 404);

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

  // Add 18% GST
  const tax = totalAmount * 0.18;
  const finalTotal = totalAmount + tax;

  // 🔥 2. Credit Handling
  let creditDeducted = false;
  if (paymentMethod.toUpperCase() === 'CREDIT') {
      const credit = await creditRepo.findByUser(userId);
      if (!credit) throw new AppError('Credit account not found', 404);
      
      if (credit.availableCredit < finalTotal) {
        throw new AppError(`Insufficient credit limit. Available: ₹${credit.availableCredit.toLocaleString()}`, 400);
      }
      
      console.log(`[Credit] User ${userId} credit before update:`, credit.usedCredit, credit.availableCredit);
      await creditRepo.updateCredit(userId, {
        usedCredit: credit.usedCredit + finalTotal,
        availableCredit: credit.availableCredit - finalTotal,
      });
      const updatedCredit = await creditRepo.findByUser(userId);
      console.log(`[Credit] User ${userId} credit after update:`, updatedCredit.usedCredit, updatedCredit.availableCredit);

      // 🔥 Add to Credit Ledger
      try {
        console.log(`[Ledger] Adding ledger entry for user ${userId}, amount ${finalTotal}, type DEBIT`);
        await creditRepo.addLedger({
          userId,
          amount: finalTotal,
          type: 'DEBIT',
          description: `Order Payment for #${paymentMethod}`,
        });
        console.log(`[Ledger] Credit ledger updated for user: ${userId}`);
      } catch (ledgerErr) {
        console.error('[Ledger] Failed to add to credit ledger:', ledgerErr.message);
      }

      creditDeducted = true;
    }

  // 🔥 3. Prepare Order Data
  const orderData = {
    userId,
    items,
    totalAmount: finalTotal,
    paymentMethod: paymentMethod.toUpperCase(),
    address: shippingAddress,
    shippingAddress,
    status: ORDER_STATUS.PENDING,
    paymentStatus: PAYMENT_STATUS.PENDING
  };

  // 🔥 4. Status Mapping based on Payment Method
  if (paymentMethod.toUpperCase() === 'COD') {
    orderData.status = ORDER_STATUS.CONFIRMED;
  } else if (paymentMethod.toUpperCase() === 'CREDIT') {
    orderData.paymentStatus = PAYMENT_STATUS.PAID;
    orderData.status = ORDER_STATUS.CONFIRMED;
  } else if (['RAZORPAY', 'ONLINE', 'UPI', 'CARD'].includes(paymentMethod.toUpperCase())) {
    orderData.paymentStatus = PAYMENT_STATUS.PAID;
    orderData.status = ORDER_STATUS.CONFIRMED;
  }

  // 🔥 5. Atomic Order Creation + Stock Deduction
  let order;
  try {
    order = await orderRepo.createOrder(orderData);
    
    for (const item of items) {
      await reduceStock(item.productId, item.quantity);
    }
  } catch (err) {
    // 🔥 Rollback Logic
    if (order) await Order.findByIdAndDelete(order._id);
    
    if (creditDeducted) {
      const credit = await creditRepo.findByUser(userId);
      if (credit) {
        await creditRepo.updateCredit(userId, {
          availableCredit: credit.availableCredit + finalTotal,
          usedCredit: credit.usedCredit - finalTotal,
        });
      }
    }
    
    throw new AppError(err.message || 'Order placement failed', err.statusCode || 500);
  }

  // 🔥 6. Post-Order Processing
  try {
    // Clear Cart
    if (!requestItems || requestItems.length === 0) {
      const cart = await cartRepo.findCartByUser(userId);
      if (cart) {
        cart.items = [];
        await cart.save();
      }
    }

    // Generate Invoice & Notification
    await generateInvoice(order);
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
  } catch (err) {
    console.error('Non-critical post-order error:', err.message);
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