import { asyncHandler } from '../../utils/asyncHandler.js';
import * as authService from './auth.service.js';
import { successResponse } from '../../utils/responseHandler.js';
import AppError from '../../errors/AppError.js';

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  successResponse(res, user, 'User registered');
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.loginWithPassword(req.body);
  successResponse(res, data, 'Login successful');
});

export const sendOTP = asyncHandler(async (req, res) => {
  await authService.sendOTP(req.body.identifier);

  //  SECURITY: Never expose OTP in response
  successResponse(res, { message: 'OTP sent to your registered email/phone' }, 'OTP sent successfully');
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

export const logout = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const accessToken = req.headers.authorization?.split(' ')[1];
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token required', 400);
  }

  await authService.logout(userId, { accessToken, refreshToken });

  successResponse(res, null, 'Logged out successfully');
});