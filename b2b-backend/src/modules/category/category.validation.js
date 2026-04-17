import Joi from 'joi';

export const createCategorySchema = Joi.object({
  body: Joi.object({
    name: Joi.string().required(),
    parentId: Joi.string().optional(),
  }),
});