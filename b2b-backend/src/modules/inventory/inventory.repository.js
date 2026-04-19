import Inventory from './inventory.model.js';

export const findInventory = (productId, warehouseId) =>
  Inventory.findOne({ productId, warehouseId });

export const createInventory = (data) =>
  Inventory.create(data);

export const updateInventory = (id, data) =>
  Inventory.findByIdAndUpdate(id, data, { new: true });

export const findAll = () =>
  Inventory.find().populate('productId warehouseId');

// 🔥 NEW (IMPORTANT)
export const findByProduct = (productId) =>
  Inventory.find({ productId });