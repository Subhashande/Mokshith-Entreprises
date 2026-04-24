import express from 'express';
import * as controller from './shipment.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

import {
  createShipmentSchema,
  updateShipmentSchema,
} from './shipment.validation.js';

import * as logisticsController from '../logistics/logistics.controller.js';

const router = express.Router();

router.post(
  '/',
  protect,
  authorize('ADMIN'),
  validate(createShipmentSchema),
  controller.createShipment
);

router.patch(
  '/:id',
  protect,
  authorize('ADMIN'),
  validate(updateShipmentSchema),
  controller.updateShipmentStatus
);

router.get(
  '/',
  protect,
  authorize('ADMIN', 'DELIVERY_PARTNER'),
  logisticsController.getShipments
);

router.get('/order/:orderId', protect, controller.getShipmentByOrder);

router.get('/:id', protect, controller.getShipmentById);

router.patch(
  '/:id/status',
  protect,
  authorize('ADMIN', 'DELIVERY_PARTNER'),
  controller.updateShipmentStatus
);

export default router;