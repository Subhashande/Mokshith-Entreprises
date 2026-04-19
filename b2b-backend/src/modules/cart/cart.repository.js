import Cart from './cart.model.js';

export const findCartByUser = async (userId) =>
  Cart.findOne({ userId }).populate('items.productId');

export const createCart = async (data) => Cart.create(data);

export const updateCart = async (userId, data) =>
  Cart.findOneAndUpdate({ userId }, data, { new: true });