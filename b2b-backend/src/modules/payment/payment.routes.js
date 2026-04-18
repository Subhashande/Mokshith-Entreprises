import express from 'express';
import * as controller from './payment.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { verifyPaymentSchema } from './payment.validation.js';

const router = express.Router();

router.post('/:orderId', protect, controller.initiatePayment);

router.post(
  '/verify',
  protect,
  validate(verifyPaymentSchema),
  controller.verifyPayment
);

export default router;