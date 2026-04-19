import express from 'express';
import * as controller from './logistics.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { updateStatusSchema } from './logistics.validation.js';

const router = express.Router();

router.post('/:orderId', protect, authorize('ADMIN'), controller.createShipment);

router.patch(
  '/:id/status',
  protect,
  authorize('ADMIN'),
  validate(updateStatusSchema),
  controller.updateStatus
);

router.get('/', protect, controller.getShipments);

export default router;