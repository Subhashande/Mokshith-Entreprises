import express from 'express';
import * as controller from './credit.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

import {
  createCreditSchema,
  creditActionSchema,
} from './credit.validation.js';

const router = express.Router();

// Admin creates credit
router.post(
  '/',
  protect,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(createCreditSchema),
  controller.createCredit
);

// User actions
router.get('/', protect, controller.getCredit);
router.get('/ledger', protect, controller.getLedger);

router.post('/use', protect, validate(creditActionSchema), controller.useCredit);
router.post('/repay', protect, validate(creditActionSchema), controller.repayCredit);

export default router;