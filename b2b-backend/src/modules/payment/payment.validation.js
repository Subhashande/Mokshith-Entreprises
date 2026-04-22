import Joi from 'joi';

export const verifyPaymentSchema = Joi.object({
  body: Joi.object({
    orderId: Joi.string().required(),
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
    razorpay_signature: Joi.string().required(),
  }),
});