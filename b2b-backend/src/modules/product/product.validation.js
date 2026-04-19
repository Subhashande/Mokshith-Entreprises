import Joi from 'joi';

export const createProductSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().required(),
    description: Joi.string().optional(),
    price: Joi.number().min(1).required(),
    stock: Joi.number().min(0).optional(),
    categoryId: Joi.string().required(),
    vendorId: Joi.string().required(),
    companyId: Joi.string().required(),
  }),
});