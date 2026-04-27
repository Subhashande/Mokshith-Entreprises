import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './order.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const createOrder = asyncHandler(async (req, res) => {
  const order = await service.createOrder(
    req.user.id,
    req.body
  );

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

export const downloadInvoice = asyncHandler(async (req, res) => {
  const { filePath, fileName } = await service.downloadInvoice(req.params.id);
  res.download(filePath, fileName);
});

export const markOrderAsFailed = asyncHandler(async (req, res) => {
  const order = await service.markOrderAsFailed(req.params.id);
  successResponse(res, order, 'Order marked as failed');
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await service.updateOrderStatus(
    req.params.id,
    req.body.status
  );

  successResponse(res, order, 'Order status updated');
});