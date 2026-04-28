import express from 'express';
import * as controller from './settings.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { updateSettingSchema } from './settings.validation.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = express.Router();

//  Only admin can update
router.post(
  '/',
  protect,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(updateSettingSchema),
  controller.updateSetting
);

router.get('/:key', controller.getSetting);

//  optional
router.get('/', controller.getAllSettings);

export default router;