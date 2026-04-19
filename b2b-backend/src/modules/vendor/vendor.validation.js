import Joi from 'joi';

export const createVendorSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().required(),
    companyId: Joi.string().required(),
    contactPerson: Joi.string().optional(),
    phone: Joi.string().optional(),
    email: Joi.string().email().optional(),
  }),
});

export const updateVendorStatusSchema = Joi.object({
  body: Joi.object({
    status: Joi.string()
      .valid('PENDING', 'APPROVED', 'REJECTED')
      .required(),
  }),
});