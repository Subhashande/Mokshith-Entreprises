import express from 'express';
import * as controller from './promotion.controller.js';

const router = express.Router();

router.post('/apply', controller.applyCoupon);

export default router;