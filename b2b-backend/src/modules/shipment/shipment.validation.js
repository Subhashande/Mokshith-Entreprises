import Joi from 'joi';

export const createShipmentSchema = Joi.object({
  body: Joi.object({
    orderId: Joi.string().required(),
    warehouseId: Joi.string().required(),
  }),
});

export const updateShipmentSchema = Joi.object({
  body: Joi.object({
    status: Joi.string()
      .valid('CREATED', 'IN_TRANSIT', 'DELIVERED')
      .required(),
  }),
});