import Joi from 'joi';

export const createProductSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional(),
    price: Joi.number().required(),
    stock: Joi.number().optional(),
    categoryId: Joi.string().required(),
    vendorId: Joi.string().required(),
    companyId: Joi.string().required(),
  }),
});