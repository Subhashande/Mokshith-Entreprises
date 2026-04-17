import express from 'express';
import * as controller from './notification.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', protect, controller.getNotifications);
router.patch('/:id/read', protect, controller.markAsRead);

export default router;