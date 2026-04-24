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

  // 🔥 SECURITY FIX: Never expose OTP in response (even in dev)
  successResponse(res, { message: 'OTP sent to your email/SMS' }, 'OTP sent successfully');
});

export const verifyOTP = asyncHandler(async (req, res) => {
  const data = await authService.verifyOTP(req.body);
  successResponse(res, data, 'OTP verified');
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { token } = req.body;

  const data = await authService.refreshAuthToken(token);

  successResponse(res, data, 'Token refreshed');
});