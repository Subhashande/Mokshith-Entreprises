import express from 'express';
import * as controller from './shipment.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

import {
  createShipmentSchema,
  updateShipmentSchema,
} from './shipment.validation.js';

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

export default router;