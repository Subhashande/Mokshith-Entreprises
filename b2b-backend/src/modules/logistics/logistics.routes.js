import express from 'express';
import * as controller from './logistics.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { updateStatusSchema } from './logistics.validation.js';

const router = express.Router();

router.post('/:orderId', protect, authorize('ADMIN'), controller.createShipment);

router.get('/my-assignments', protect, authorize('DELIVERY_PARTNER'), controller.getMyAssignments);

router.patch('/:id/location', protect, authorize('DELIVERY_PARTNER'), controller.updateLocation);

router.get('/', protect, authorize('ADMIN'), controller.getShipments);

router.get('/:id', protect, controller.getShipmentDetails);

router.patch(
  '/:id/status',
  protect,
  authorize('ADMIN', 'DELIVERY_PARTNER'),
  validate(updateStatusSchema),
  controller.updateDeliveryStatus
);

export default router;