import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './invoice.service.js';
import Order from '../order/order.model.js';
import AppError from '../../errors/AppError.js';
import { successResponse } from '../../utils/responseHandler.js';

export const generateInvoice = asyncHandler(async (req, res) => {
  const invoice = await service.generateInvoice(req.params.orderId);
  successResponse(res, invoice, 'Invoice generated');
});

export const getInvoiceByOrderId = asyncHandler(async (req, res) => {
  const invoice = await service.getInvoiceByOrderId(req.params.orderId);
  if (!invoice) throw new AppError('Invoice not found', 404);
  successResponse(res, invoice, 'Invoice fetched');
});