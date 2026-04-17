import express from 'express';
import * as controller from './shipment.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = express.Router();

router.post('/', protect, authorize('ADMIN'), controller.createShipment);
router.patch('/:id', protect, authorize('ADMIN'), controller.updateShipmentStatus);

export default router;