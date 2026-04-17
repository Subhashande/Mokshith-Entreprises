import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './payment.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const initiatePayment = asyncHandler(async (req, res) => {
  const data = await service.initiatePayment(
    req.params.orderId,
    req.user.id
  );
  successResponse(res, data, 'Payment initiated');
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const payment = await service.verifyPayment(req.body);
  successResponse(res, payment, 'Payment successful');
});