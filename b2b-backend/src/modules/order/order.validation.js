import Joi from 'joi';
import { ORDER_STATUS } from '../../constants/orderStatus.js';

export const createOrderSchema = Joi.object({
  body: Joi.object({
    paymentMethod: Joi.string()
      .valid('COD', 'ONLINE', 'CREDIT', 'RAZORPAY', 'UPI', 'CARD')
      .required(),
    items: Joi.array().items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        price: Joi.number().required(),
        name: Joi.string().required(),
      })
    ).required(),
    shippingAddress: Joi.object({
      name: Joi.string().required(),
      phone: Joi.string().required(),
      addressLine: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      pincode: Joi.string().required(),
    }).required(),
  }).unknown(true),
});

export const updateOrderStatusSchema = Joi.object({
  body: Joi.object({
    status: Joi.string()
      .valid(...Object.values(ORDER_STATUS))
      .required(),
  }),
});
