import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './payment.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  // 🔥 ADD: debug log
  console.log('Create Razorpay Order:', { amount, user: req.user?.id });

  const data = await service.createRazorpayOrder(amount, req.user.id);
  successResponse(res, data, 'Razorpay order created');
});

export const hybridPayment = asyncHandler(async (req, res) => {
  const { orderId, useCredit } = req.body;

  // 🔥 ADD: fallback support (VERY IMPORTANT)
  const finalOrderId = orderId || req.params.orderId;

  // 🔥 ADD: debug log
  console.log('Hybrid Controller Input:', {
    bodyOrderId: orderId,
    paramsOrderId: req.params.orderId,
    finalOrderId,
    useCredit,
  });

  // 🔥 ADD: validation
  if (!finalOrderId) {
    throw new Error('orderId is required for hybrid payment');
  }

  const data = await service.hybridPayment(finalOrderId, req.user.id, useCredit);

  successResponse(res, data, 'Hybrid payment processed');
});

export const initiatePayment = asyncHandler(async (req, res) => {
  const data = await service.initiatePayment(
    req.params.orderId,
    req.user.id
  );

  successResponse(res, data, 'Payment initiated');
});

export const verifyPayment = asyncHandler(async (req, res) => {
  // 🔥 ADD: debug log
  console.log('Verify Payment Payload:', req.body);

  const payment = await service.verifyPayment(req.body);

  successResponse(res, payment, 'Payment successful');
});