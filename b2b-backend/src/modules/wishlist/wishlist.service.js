import * as repo from './wishlist.repository.js';
import Product from '../product/product.model.js';
import AppError from '../../errors/AppError.js';
import mongoose from 'mongoose';

export const addToWishlist = async (userId, productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError('Invalid product ID', 400);
  }
  
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
    return wishlist;
  }

  wishlist.items.push({ productId });

  await wishlist.save();
  return repo.findByUser(userId);
};

export const getWishlist = async (userId) => {
  const wishlist = await repo.findByUser(userId);
  if (!wishlist) {
    return { items: [] };
  }
  return wishlist;
};

export const removeFromWishlist = async (userId, productId) => {
  const wishlist = await repo.findByUser(userId);

  if (!wishlist) throw new AppError('Wishlist not found', 404);

  wishlist.items = wishlist.items.filter(
    (item) => item.productId._id.toString() !== productId
  );

  await wishlist.save();
  return repo.findByUser(userId);
};

export const clearWishlist = async (userId) => {
  const wishlist = await repo.findByUser(userId);
  if (!wishlist) throw new AppError('Wishlist not found', 404);
  
  wishlist.items = [];
  await wishlist.save();
  return repo.findByUser(userId);
};