import * as repo from './warehouse.repository.js';
import AppError from '../../errors/AppError.js';

export const createWarehouse = async (data) => {
  if (!data.name) {
    throw new AppError('Warehouse name is required', 400);
  }

  return repo.createWarehouse(data);
};

export const getWarehouses = async () => {
  return repo.findAll();
};

export const getWarehouseById = async (id) => {
  const warehouse = await repo.findById(id);

  if (!warehouse) throw new AppError('Warehouse not found', 404);

  return warehouse;
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