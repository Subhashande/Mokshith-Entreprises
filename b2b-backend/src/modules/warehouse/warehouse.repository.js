import Warehouse from './warehouse.model.js';

export const createWarehouse = (data) => Warehouse.create(data);

export const findAll = () =>
  Warehouse.find().sort({ createdAt: -1 });

export const findById = (id) => Warehouse.findById(id);

export const updateWarehouse = (id, data) =>
  Warehouse.findByIdAndUpdate(id, data, { new: true });

export const deleteWarehouse = (id) =>
  Warehouse.findByIdAndDelete(id);