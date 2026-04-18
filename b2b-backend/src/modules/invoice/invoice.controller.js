import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './invoice.service.js';
import Order from '../order/order.model.js';
import { successResponse } from '../../utils/responseHandler.js';

export const generateInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  const invoice = await service.generateInvoice(order);
  successResponse(res, invoice);
});