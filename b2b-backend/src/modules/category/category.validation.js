import Joi from 'joi';

export const createCategorySchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().required(),
    parentId: Joi.string().optional().allow(null),
  }),
});