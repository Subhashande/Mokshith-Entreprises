import * as repo from './inventory.repository.js';
import AppError from '../../errors/AppError.js';

// ➕ Add Stock
export const addStock = async ({ productId, warehouseId, stock }) => {
  if (stock <= 0) {
    throw new AppError('Stock must be greater than 0', 400);
  }

  let inventory = await repo.findInventory(productId, warehouseId);

  if (!inventory) {
    return repo.createInventory({ productId, warehouseId, stock });
  }

  inventory.stock += stock;
  return inventory.save();
};

// 📦 Get All Inventory
export const getInventory = async () => {
  return repo.findAll();
};

// ✅ Check Stock Availability
export const checkStock = async (productId, quantity) => {
  if (quantity <= 0) {
    throw new AppError('Quantity must be greater than 0', 400);
  }

  const items = await repo.findByProduct(productId);

  const totalStock = items.reduce((sum, i) => sum + i.stock, 0);

  if (totalStock < quantity) {
    throw new AppError('Insufficient stock', 400);
  }

  return true;
};

// 🔥 NEW — Deduct Stock (IMPORTANT FOR ORDER FLOW)
export const reduceStock = async (productId, quantity) => {
  if (quantity <= 0) {
    throw new AppError('Quantity must be greater than 0', 400);
  }

  const items = await repo.findByProduct(productId);

  let remaining = quantity;

  for (const item of items) {
    if (remaining <= 0) break;

    if (item.stock >= remaining) {
      item.stock -= remaining;
      await item.save();
      remaining = 0;
    } else {
      remaining -= item.stock;
      item.stock = 0;
      await item.save();
    }
  }

  if (remaining > 0) {
    throw new AppError('Stock deduction failed', 500);
  }

  return true;
};