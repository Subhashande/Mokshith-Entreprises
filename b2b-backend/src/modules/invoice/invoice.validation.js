import Joi from 'joi';

export const generateInvoiceSchema = Joi.object({
  params: Joi.object({
    orderId: Joi.string().required(),
  }),
});