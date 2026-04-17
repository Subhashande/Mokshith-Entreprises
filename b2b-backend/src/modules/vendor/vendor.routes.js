import express from 'express';
import * as controller from './vendor.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = express.Router();

router.post('/', protect, controller.createVendor);
router.get('/', protect, controller.getVendors);
router.patch('/:id/status', protect, authorize('ADMIN', 'SUPER_ADMIN'), controller.approveVendor);

export default router;