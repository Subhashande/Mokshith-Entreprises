import Joi from 'joi';

export const createOrderSchema = Joi.object({
  body: Joi.object({
    paymentMethod: Joi.string()
      .valid('COD', 'ONLINE', 'CREDIT')
      .optional(),
  }),
});

export const updateOrderStatusSchema = Joi.object({
  body: Joi.object({
    status: Joi.string()
      .valid('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED')
      .required(),
  }),
});