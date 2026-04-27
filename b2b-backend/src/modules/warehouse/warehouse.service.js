import * as repo from './warehouse.repository.js';
import AppError from '../../errors/AppError.js';
import Inventory from '../inventory/inventory.model.js';

export const createWarehouse = async (data) => {
  if (!data.name) {
    throw new AppError('Warehouse name is required', 400);
  }

  return repo.createWarehouse(data);
};

export const getWarehouses = async () => {
  const warehouses = await repo.findAll();
  
  // Calculate currentLoad dynamically for each warehouse
  const enhancedWarehouses = await Promise.all(warehouses.map(async (w) => {
    const inventory = await Inventory.find({ warehouseId: w._id });
    const currentLoad = inventory.reduce((sum, item) => sum + item.stock, 0);
    
    // We convert to plain object to add virtual field
    const warehouseObj = w.toObject();
    warehouseObj.currentLoad = currentLoad;
    return warehouseObj;
  }));

  return enhancedWarehouses;
};

export const getWarehouseById = async (id) => {
  const warehouse = await repo.findById(id);

  if (!warehouse) throw new AppError('Warehouse not found', 404);

  const inventory = await Inventory.find({ warehouseId: id });
  const currentLoad = inventory.reduce((sum, item) => sum + item.stock, 0);

  const warehouseObj = warehouse.toObject();
  warehouseObj.currentLoad = currentLoad;

  return warehouseObj;
};

export const updateWarehouse = async (id, data) => {
  const warehouse = await repo.updateWarehouse(id, data);
  if (!warehouse) throw new AppError('Warehouse not found', 404);
  return warehouse;
};

export const deleteWarehouse = async (id) => {
  const warehouse = await repo.findById(id);
  if (!warehouse) throw new AppError('Warehouse not found', 404);
  return repo.deleteWarehouse(id);
};