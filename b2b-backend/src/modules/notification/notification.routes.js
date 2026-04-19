import express from 'express';
import * as controller from './notification.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { markAsReadSchema } from './notification.validation.js';

const router = express.Router();

router.get('/', protect, controller.getNotifications);

router.patch(
  '/:id/read',
  protect,
  validate(markAsReadSchema),
  controller.markAsRead
);

export default router;