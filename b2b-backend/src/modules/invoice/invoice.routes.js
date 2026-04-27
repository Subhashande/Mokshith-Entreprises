import express from 'express';
import * as controller from './invoice.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { generateInvoiceSchema } from './invoice.validation.js';

const router = express.Router();

router.post(
  '/:orderId',
  protect,
  validate(generateInvoiceSchema),
  controller.generateInvoice
);

router.get(
  '/:orderId',
  protect,
  controller.getInvoiceByOrderId
);

export default router;