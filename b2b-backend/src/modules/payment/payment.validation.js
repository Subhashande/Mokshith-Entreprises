import Joi from 'joi';

export const verifyPaymentSchema = Joi.object({
  body: Joi.object({
    orderId: Joi.string().required(),
  }),
});