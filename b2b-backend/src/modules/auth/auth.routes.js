import express from 'express';
import * as controller from './auth.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';

import {
  registerSchema,
  loginSchema,
  otpSchema,
  verifyOtpSchema,
} from './auth.validation.js';

const router = express.Router();

router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.post('/send-otp', validate(otpSchema), controller.sendOTP);
router.post('/verify-otp', validate(verifyOtpSchema), controller.verifyOTP);
router.post('/refresh-token', controller.refreshToken);

export default router;