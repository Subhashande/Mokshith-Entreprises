import express from 'express';
import * as controller from './promotion.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { applyCouponSchema } from './promotion.validation.js';

import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = express.Router();

router.get('/', protect, authorize('ADMIN'), controller.getPromotions);
router.post('/', protect, authorize('ADMIN'), controller.createPromotion);
router.put('/:id', protect, authorize('ADMIN'), controller.updatePromotion);
router.delete('/:id', protect, authorize('ADMIN'), controller.deletePromotion);
router.patch('/:id/toggle', protect, authorize('ADMIN'), controller.togglePromotion);

router.post('/apply', validate(applyCouponSchema), controller.applyCoupon);

export default router;