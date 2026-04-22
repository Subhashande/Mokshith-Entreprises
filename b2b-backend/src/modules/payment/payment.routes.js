import express from 'express';
import * as controller from './payment.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { verifyPaymentSchema } from './payment.validation.js';

// 🔥 ADD THIS
import Joi from 'joi';

const router = express.Router();

// 🔥 ADD: hybrid validation (DO NOT REMOVE EXISTING STRUCTURE)
const hybridPaymentSchema = Joi.object({
  body: Joi.object({
    orderId: Joi.string().required(),
    useCredit: Joi.boolean().optional(),
  }),
});

// 🔥 ADD: debug middleware (VERY IMPORTANT)
const debugRoute = (req, res, next) => {
  console.log(`Payment Route Hit: ${req.method} ${req.originalUrl}`);
  console.log('Params:', req.params);
  console.log('Body:', req.body);
  next();
};

// 🔥 APPLY DEBUG (SAFE ADD)
router.use(debugRoute);

// EXISTING ROUTES (UNCHANGED)
router.post('/create-order', protect, controller.createRazorpayOrder);

// 🔥 UPDATE: add validation (DO NOT REMOVE ANYTHING)
router.post(
  '/hybrid',
  protect,
  validate(hybridPaymentSchema), // ✅ ADDED
  controller.hybridPayment
);

// 🔥 ADD: safety guard for invalid ObjectId BEFORE hitting controller
router.use('/:orderId', (req, res, next) => {
  const { orderId } = req.params;

  // prevent "hybrid" or invalid strings from being treated as ObjectId
  if (!/^[0-9a-fA-F]{24}$/.test(orderId)) {
    console.warn('Invalid orderId blocked at route level:', orderId);
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID format',
    });
  }

  next();
});

// EXISTING ROUTE (UNCHANGED)
router.post('/:orderId', protect, controller.initiatePayment);

router.post(
  '/verify',
  protect,
  validate(verifyPaymentSchema),
  controller.verifyPayment
);

export default router;