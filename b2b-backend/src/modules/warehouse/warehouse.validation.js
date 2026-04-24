import Joi from 'joi';

export const createWarehouseSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().required(),

    location: Joi.object({
      address: Joi.string().allow('').optional(),
      city: Joi.string().allow('').optional(),
      state: Joi.string().allow('').optional(),
      country: Joi.string().allow('').optional(),
      pincode: Joi.string().allow('').optional(),
    }).optional(),

    capacity: Joi.number().min(0).optional(),
    currentLoad: Joi.number().min(0).optional(),
  }),
});

export const updateWarehouseSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().required(),
  }),
  body: Joi.object({
    name: Joi.string().trim().optional(),
    location: Joi.object({
      address: Joi.string().allow('').optional(),
      city: Joi.string().allow('').optional(),
      state: Joi.string().allow('').optional(),
      country: Joi.string().allow('').optional(),
      pincode: Joi.string().allow('').optional(),
    }).optional(),
    capacity: Joi.number().min(0).optional(),
    currentLoad: Joi.number().min(0).optional(),
    isActive: Joi.boolean().optional(),
  }),
});