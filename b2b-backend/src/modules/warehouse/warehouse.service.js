import * as repo from './warehouse.repository.js';
import AppError from '../../errors/AppError.js';

export const createWarehouse = async (data) => {
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