import Wishlist from './wishlist.model.js';

export const findByUser = (userId) =>
  Wishlist.findOne({ userId }).populate('items.productId');

export const createWishlist = (data) => Wishlist.create(data);

export const updateWishlist = (userId, data) =>
  Wishlist.findOneAndUpdate({ userId }, data, { new: true });