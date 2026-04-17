import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './order.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const createOrder = asyncHandler(async (req, res) => {
  const order = await service.createOrder(req.user.id);
  successResponse(res, order, 'Order created');
});

export const getOrders = asyncHandler(async (req, res) => {
  const orders = await service.getOrders(req.user);
  successResponse(res, orders);
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await service.getOrderById(req.params.id);
  successResponse(res, order);
});