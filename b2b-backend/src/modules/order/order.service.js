import * as cartRepo from '../cart/cart.repository.js';
import * as orderRepo from './order.repository.js';
import Product from '../product/product.model.js';
import Order from './order.model.js';
import AppError from '../../errors/AppError.js';
import { validateTransition } from './order.workflow.js';

export const createOrder = async (userId) => {
  const cart = await cartRepo.findCartByUser(userId);

  if (!cart || cart.items.length === 0) {
    throw new AppError('Cart is empty', 400);
  }

  let totalAmount = 0;
  const items = [];

  for (const item of cart.items) {
    const product = await Product.findById(item.productId);

    if (!product) throw new AppError('Product not found', 404);

    if (product.stock < item.quantity) {
      throw new AppError(`Insufficient stock for ${product.name}`, 400);
    }

    product.stock -= item.quantity;
    await product.save();

    const itemTotal = product.price * item.quantity;
    totalAmount += itemTotal;

    items.push({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
    });
  }

  const order = await orderRepo.createOrder({
    userId,
    items,
    totalAmount,
  });

  // Clear cart
  cart.items = [];
  await cart.save();

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