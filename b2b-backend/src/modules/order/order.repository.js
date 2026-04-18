import Order from './order.model.js';

export const createOrder = (data) => Order.create(data);

export const findOrders = (filter) => Order.find(filter);

export const findById = (id) => Order.findById(id);