import express from 'express';
import * as controller from './pricing.controller.js';

const router = express.Router();

router.post('/', controller.getPrice);

export default router;