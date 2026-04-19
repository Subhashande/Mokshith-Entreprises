import express from 'express';
import * as controller from './pricing.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { pricingSchema } from './pricing.validation.js';

const router = express.Router();

router.post('/', validate(pricingSchema), controller.getPrice);

export default router;