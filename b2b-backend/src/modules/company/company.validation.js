import Joi from 'joi';

export const createCompanySchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().optional(),
    address: Joi.string().optional(),
    gstNumber: Joi.string().optional(),
  }),
});

export const updateCompanySchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    address: Joi.string().optional(),
    gstNumber: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
  }),
});