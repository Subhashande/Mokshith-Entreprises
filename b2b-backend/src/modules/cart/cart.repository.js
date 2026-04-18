import Cart from './cart.model.js';

export const findCartByUser = (userId) =>
  Cart.findOne({ userId }).populate('items.productId');

export const createCart = (data) => Cart.create(data);

export const updateCart = (userId, data) =>
  Cart.findOneAndUpdate({ userId }, data, { new: true });