import express from 'express';
import * as controller from './logistics.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { updateStatusSchema } from './logistics.validation.js';

const router = express.Router();

router.get('/delivery-queue', protect, authorize('ADMIN', 'DELIVERY_PARTNER'), controller.getDeliveryQueue);
router.get('/history', protect, authorize('ADMIN', 'DELIVERY_PARTNER'), controller.getDeliveryHistory);
router.post('/:id/accept', protect, authorize('DELIVERY_PARTNER'), controller.acceptDelivery);
router.post('/:id/start', protect, authorize('DELIVERY_PARTNER'), controller.startDelivery);
router.post('/:id/delivered', protect, authorize('DELIVERY_PARTNER'), controller.markAsDelivered);
router.post('/:id/location', protect, authorize('DELIVERY_PARTNER'), controller.updateLocation);

router.post('/:orderId', protect, authorize('ADMIN'), controller.createShipment);
router.get('/my-assignments', protect, authorize('DELIVERY_PARTNER'), controller.getMyAssignments);
router.get('/', protect, authorize('ADMIN'), controller.getShipments);
router.get('/:id', protect, controller.getShipmentDetails);

export default router;