import express from 'express';
import * as controller from './health.controller.js';

const router = express.Router();

// Public health endpoints (no auth required)
router.get('/', controller.basicHealthCheck);
router.get('/detailed', controller.detailedHealthCheck);
router.get('/ready', controller.readinessCheck);
router.get('/live', controller.livenessCheck);

export default router;
