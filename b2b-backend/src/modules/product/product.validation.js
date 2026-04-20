import Joi from 'joi';

export const createProductSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().required(),
    description: Joi.string().optional(),
    price: Joi.number().min(1).required(),
    stock: Joi.number().min(0).optional(),
    categoryId: Joi.string().required(),
    vendorId: Joi.string().optional(),
    companyId: Joi.string().optional(),
    moq: Joi.number().min(1).optional(),
    isActive: Joi.boolean().optional(),
    bulkPricing: Joi.array().items(
      Joi.object({
        minQuantity: Joi.number().required(),
        price: Joi.number().required()
      })
    ).optional(),
    variants: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        value: Joi.string().required(),
        additionalPrice: Joi.number().optional(),
        stock: Joi.number().optional()
      })
    ).optional()
  }),
});

export const updateProductSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().optional(),
    description: Joi.string().optional(),
    price: Joi.number().min(1).optional(),
    stock: Joi.number().min(0).optional(),
    categoryId: Joi.string().optional(),
    moq: Joi.number().min(1).optional(),
    isActive: Joi.boolean().optional(),
    bulkPricing: Joi.array().items(
      Joi.object({
        minQuantity: Joi.number().required(),
        price: Joi.number().required()
      })
    ).optional(),
    variants: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        value: Joi.string().required(),
        additionalPrice: Joi.number().optional(),
        stock: Joi.number().optional()
      })
    ).optional()
  }),
});