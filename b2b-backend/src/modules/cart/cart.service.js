import * as repo from './cart.repository.js';
import Product from '../product/product.model.js';
import AppError from '../../errors/AppError.js';
import mongoose from 'mongoose';

export const addToCart = async (userId, { productId, quantity }) => {
  // Input validation
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError('Invalid product ID', 400);
  }

  if (!quantity || quantity < 1) {
    throw new AppError('Quantity must be at least 1', 400);
  }

  let cart = await repo.findCartByUser(userId);

  // 🔥 Optimized: Only select necessary fields
  const product = await Product.findById(productId)
    .select('name minOrderQty moq stock price basePrice isActive')
    .lean();
    
  if (!product) throw new AppError('Product not found', 404);
  
  if (!product.isActive) {
    throw new AppError('Product is not available', 400);
  }

  // 🔥 Wholesale MOQ (respect whichever MOQ field is stricter; both default to 1)
  const minQty = Math.max(product.minOrderQty || 1, product.moq || 1);

  // 🔥 Stock validation
  if (product.stock && product.stock < quantity) {
    throw new AppError('Insufficient stock', 400);
  }

  if (!cart) {
    // New line item must satisfy MOQ
    if (quantity < minQty) {
      throw new AppError(`Minimum order quantity for ${product.name} is ${minQty}`, 400);
    }
    await repo.createCart({
      userId,
      items: [{ productId, quantity }],
    });
    // Return a populated cart for a consistent response shape
    return repo.findCartByUser(userId);
  }

  const existingItem = cart.items.find(
    (item) => item.productId._id.toString() === productId.toString()
  );

  if (existingItem) {
    // Incrementing an existing line item: the running total already meets MOQ,
    // so additional positive quantities are allowed.
    existingItem.quantity += quantity;
    if (existingItem.quantity < minQty) {
      existingItem.quantity = minQty;
    }
  } else {
    // Adding a brand-new line item must satisfy MOQ
    if (quantity < minQty) {
      throw new AppError(`Minimum order quantity for ${product.name} is ${minQty}`, 400);
    }
    cart.items.push({ productId, quantity });
  }

  return cart.save();
};

export const getCart = async (userId) => {
  return repo.findCartByUser(userId);
};

export const updateCartItem = async (userId, productId, quantity) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError('Invalid product ID', 400);
  }

  if (quantity === undefined || quantity === null || quantity < 1) {
    throw new AppError('Quantity must be at least 1', 400);
  }

  const product = await Product.findById(productId)
    .select('name minOrderQty moq stock isActive')
    .lean();

  if (!product) throw new AppError('Product not found', 404);

  const minQty = Math.max(product.minOrderQty || 1, product.moq || 1);
  if (quantity < minQty) {
    throw new AppError(`Minimum order quantity for ${product.name} is ${minQty}`, 400);
  }

  if (product.stock && product.stock < quantity) {
    throw new AppError('Insufficient stock', 400);
  }

  const cart = await repo.findCartByUser(userId);
  if (!cart) throw new AppError('Cart not found', 404);

  const existingItem = cart.items.find(
    (item) => item.productId._id.toString() === productId.toString()
  );

  if (!existingItem) throw new AppError('Item not found in cart', 404);

  existingItem.quantity = quantity;

  return cart.save();
};

export const clearCart = async (userId) => {
  const cart = await repo.findCartByUser(userId);

  // Clearing a non-existent/empty cart is a no-op success
  if (!cart) return { userId, items: [] };

  cart.items = [];

  return cart.save();
};

export const removeFromCart = async (userId, productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError('Invalid product ID', 400);
  }

  const cart = await repo.findCartByUser(userId);

  if (!cart) throw new AppError('Cart not found', 404);

  cart.items = cart.items.filter(
    (item) => item.productId._id.toString() !== productId.toString()
  );

  return cart.save();
};