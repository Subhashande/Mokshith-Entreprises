import express from 'express';
import * as controller from './auth.controller.js';

const router = express.Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/send-otp', controller.sendOTP);
router.post('/verify-otp', controller.verifyOTP);

export default router;