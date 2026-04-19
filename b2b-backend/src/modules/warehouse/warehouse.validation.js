import Joi from 'joi';

export const createWarehouseSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().required(),

    location: Joi.object({
      address: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      country: Joi.string().optional(),
      pincode: Joi.string().optional(),
    }).optional(),
  }),
});