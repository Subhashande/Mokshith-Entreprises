import express from 'express';
import * as controller from './payment.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { verifyPaymentSchema } from './payment.validation.js';
import { paymentLimiter } from '../../config/rateLimiter.js';

// 🔥 ADD THIS
import Joi from 'joi';

const router = express.Router();

const hybridPaymentSchema = Joi.object({
  body: Joi.object({
    orderId: Joi.string().required(),
    totalAmount: Joi.number().required(),
    useCredit: Joi.boolean().optional(),
  }),
}).unknown(true);

// 1. /hybrid (MUST BE FIRST)
router.post(
  '/hybrid',
  paymentLimiter,
  protect,
  validate(hybridPaymentSchema),
  controller.hybridPayment
);

// 2. /create-order
router.post('/create-order', paymentLimiter, protect, controller.createRazorpayOrder);

// 3. /verify
router.post(
  '/verify',
  paymentLimiter,
  protect,
  validate(verifyPaymentSchema),
  controller.verifyPayment
);

// 4. /webhook (Razorpay Webhook)
router.post('/webhook', paymentLimiter, controller.razorpayWebhook);

// 5. /:orderId (MUST BE LAST)
router.post('/:orderId', paymentLimiter, protect, controller.initiatePayment);

export default router;