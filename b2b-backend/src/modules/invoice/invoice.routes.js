import express from 'express';
import * as controller from './invoice.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/:orderId', protect, controller.generateInvoice);

export default router;