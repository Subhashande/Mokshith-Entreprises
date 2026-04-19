import Joi from 'joi';

export const updateUserRoleSchema = Joi.object({
  body: Joi.object({
    role: Joi.string()
      .valid('USER', 'ADMIN', 'SUPER_ADMIN')
      .required(),
  }),
});