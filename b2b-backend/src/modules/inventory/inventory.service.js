import * as repo from './inventory.repository.js';
import AppError from '../../errors/AppError.js';

export const addStock = async ({ productId, warehouseId, stock }) => {
  let inventory = await repo.findInventory(productId, warehouseId);

  if (!inventory) {
    return repo.createInventory({ productId, warehouseId, stock });
  }

  inventory.stock += stock;
  return inventory.save();
};

export const getInventory = async () => {
  return repo.findAll();
};

export const checkStock = async (productId, quantity) => {
  const items = await repo.findAll();

  const totalStock = items
    .filter((i) => i.productId._id.toString() === productId)
    .reduce((sum, i) => sum + i.stock, 0);

  if (totalStock < quantity) {
    throw new AppError('Insufficient stock', 400);
  }

  return true;
};