import Logistics from './logistics.model.js';

export const createShipment = (data) =>
  Logistics.create(data);

export const findByOrder = (orderId) =>
  Logistics.findOne({ orderId });

export const updateShipment = (id, data) =>
  Logistics.findByIdAndUpdate(id, data, { new: true });

export const findById = (id) =>
  Logistics.findById(id).populate('orderId warehouseId');

export const findAll = (filter = {}) =>
  Logistics.find(filter).populate('orderId warehouseId');