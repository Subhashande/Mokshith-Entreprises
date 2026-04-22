import * as repo from './cart.repository.js';
import Product from '../product/product.model.js';
import AppError from '../../errors/AppError.js';

export const addToCart = async (userId, { productId, quantity }) => {
  let cart = await repo.findCartByUser(userId);

  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found', 404);

  // 🔥 Wholesale MOQ validation
  const minQty = product.minOrderQty || product.moq || 1;
  if (quantity < minQty) {
    throw new AppError(`Minimum order quantity for ${product.name} is ${minQty}`, 400);
  }

  // 🔥 Optional: stock validation
  if (product.stock < quantity) {
    throw new AppError('Insufficient stock', 400);
  }

  if (!cart) {
    return repo.createCart({
      userId,
      items: [{ productId, quantity }],
    });
  }

  const existingItem = cart.items.find(
    (item) => item.productId._id.toString() === productId.toString()
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ productId, quantity });
  }

  return cart.save();
};

export const getCart = async (userId) => {
  return repo.findCartByUser(userId);
};

export const removeFromCart = async (userId, productId) => {
  const cart = await repo.findCartByUser(userId);

  if (!cart) throw new AppError('Cart not found', 404);

  cart.items = cart.items.filter(
    (item) => item.productId._id.toString() !== productId.toString()
  );

  return cart.save();
};