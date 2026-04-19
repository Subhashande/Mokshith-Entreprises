import express from 'express';
import * as controller from './promotion.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { applyCouponSchema } from './promotion.validation.js';

const router = express.Router();

router.post('/apply', validate(applyCouponSchema), controller.applyCoupon);

export default router;