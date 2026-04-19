import express from 'express';
import * as controller from './vendor.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

import {
  createVendorSchema,
  updateVendorStatusSchema,
} from './vendor.validation.js';

const router = express.Router();

// CREATE
router.post(
  '/',
  protect,
  validate(createVendorSchema),
  controller.createVendor
);

// LIST
router.get('/', protect, controller.getVendors);

// APPROVE / REJECT
router.patch(
  '/:id/status',
  protect,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(updateVendorStatusSchema),
  controller.approveVendor
);

export default router;