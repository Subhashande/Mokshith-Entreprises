import Joi from 'joi';

//  ADD: reusable ObjectId validation
const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid MongoDB ObjectId');

//  EXISTING (UNCHANGED)
export const verifyPaymentSchema = Joi.object({
  body: Joi.object({
    orderId: Joi.string().required(),
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
    razorpay_signature: Joi.string().required(),
  }),
});

//  ADD: strict version (optional future use)
export const verifyPaymentStrictSchema = Joi.object({
  body: Joi.object({
    orderId: objectId.required(),
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
    razorpay_signature: Joi.string().required(),
  }),
});

//  ADD: hybrid payment validation (VERY IMPORTANT)
export const hybridPaymentSchema = Joi.object({
  body: Joi.object({
    orderId: objectId.required(),
    totalAmount: Joi.number().required(),
    useCredit: Joi.boolean().optional(),
  }),
});

//  ADD: initiate payment validation (optional but recommended)
export const initiatePaymentSchema = Joi.object({
  params: Joi.object({
    orderId: objectId.required(),
  }),
});