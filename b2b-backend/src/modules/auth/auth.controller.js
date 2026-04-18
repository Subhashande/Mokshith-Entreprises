import { asyncHandler } from '../../utils/asyncHandler.js';
import * as authService from './auth.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  successResponse(res, user, 'User registered');
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.loginWithPassword(req.body);
  successResponse(res, data, 'Login successful');
});

export const sendOTP = asyncHandler(async (req, res) => {
  const otp = await authService.sendOTP(req.body.identifier);
  successResponse(res, { otp }, 'OTP sent');
});

export const verifyOTP = asyncHandler(async (req, res) => {
  const data = await authService.verifyOTP(req.body);
  successResponse(res, data, 'OTP verified');
});