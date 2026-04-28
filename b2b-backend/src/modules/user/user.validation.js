import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().optional(),
    email: Joi.string().email().optional(),
    mobile: Joi.string().optional(),
    phone: Joi.string().optional(),
    address: Joi.string().optional(),
    companyName: Joi.string().optional(),
    gstNumber: Joi.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional().allow(''),
    profileImage: Joi.string().optional(),
  }),
});