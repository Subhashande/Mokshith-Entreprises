import Shipment from './shipment.model.js';

export const createShipment = (data) => Shipment.create(data);

export const findByOrderId = (orderId) =>
  Shipment.findOne({ orderId }).populate('orderId warehouseId');

export const updateShipment = (id, data) =>
  Shipment.findByIdAndUpdate(id, data, { new: true }).populate('orderId warehouseId');

export const findById = (id) => Shipment.findById(id).populate('orderId warehouseId');