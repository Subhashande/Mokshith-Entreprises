import * as repo from './wishlist.repository.js';
import Product from '../product/product.model.js';
import AppError from '../../errors/AppError.js';

export const addToWishlist = async (userId, productId) => {
  let wishlist = await repo.findByUser(userId);

  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found', 404);

  if (!wishlist) {
    return repo.createWishlist({
      userId,
      items: [{ productId }],
    });
  }

  const exists = wishlist.items.find(
    (item) => item.productId._id.toString() === productId
  );

  if (exists) {
    throw new AppError('Product already in wishlist', 400);
  }

  wishlist.items.push({ productId });

  return wishlist.save();
};

export const getWishlist = async (userId) => {
  return repo.findByUser(userId);
};

export const removeFromWishlist = async (userId, productId) => {
  const wishlist = await repo.findByUser(userId);

  if (!wishlist) throw new AppError('Wishlist not found', 404);

  wishlist.items = wishlist.items.filter(
    (item) => item.productId._id.toString() !== productId
  );

  return wishlist.save();
};