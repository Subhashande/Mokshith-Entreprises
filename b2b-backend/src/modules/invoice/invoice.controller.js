import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './invoice.service.js';
import Order from '../order/order.model.js';
import AppError from '../../errors/AppError.js';
import { successResponse } from '../../utils/responseHandler.js';

export const generateInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const invoice = await service.generateInvoice(order);

  successResponse(res, invoice, 'Invoice generated');
});