import mongoose from 'mongoose';
import * as repo from './inventory.repository.js';
import AppError from '../../errors/AppError.js';
import Warehouse from '../warehouse/warehouse.model.js';

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

  // If no inventory records found, automatically create a default stock for demo/new products
  if (items.length === 0) {
    console.log(`Auto-seeding stock for product: ${productId}`);
    // Find first warehouse or create a default one
    let warehouse = await Warehouse.findOne();
    if (!warehouse) {
      warehouse = await Warehouse.create({ name: 'Main Warehouse', location: { city: 'Default' } });
    }
    
    await repo.createInventory({
      productId,
      warehouseId: warehouse._id,
      stock: 1000 // Seed with 1000 units for new products
    });
    return true;
  }

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