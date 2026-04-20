import AppError from '../../errors/AppError.js';
import {
  findUserByEmailOrMobile,
  createUser,
  updateUser,
  findUserById,
} from './auth.repository.js';

import { hashPassword } from '../../utils/hashPassword.js';
import { comparePassword } from '../../utils/comparePassword.js';
import { generateOTP } from '../../utils/otpGenerator.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from './auth.token.js';
import { fetchSetting } from '../settings/settings.service.js';
import { USER_STATUS } from '../../constants/userStatus.js';
import { ROLES } from '../../constants/roles.js';
import { createCreditAccount } from '../credit/credit.service.js';

const checkMaintenanceMode = async (user) => {
  const maintenance = await fetchSetting('maintenanceMode');
  const maintenanceOld = await fetchSetting('MAINTENANCE_MODE');
  if ((maintenance?.value === true || maintenanceOld?.value === true) && user?.role !== ROLES.SUPER_ADMIN) {
    throw new AppError('System under maintenance', 503);
  }
};

export const register = async (data) => {
  const existing = await findUserByEmailOrMobile(data.email || data.mobile);

  if (existing) {
    throw new AppError('User already exists', 400);
  }

  const hashedPassword = await hashPassword(data.password);

  const user = await createUser({
    ...data,
    password: hashedPassword,
    status: USER_STATUS.PENDING, // Explicitly set to PENDING
  });

  // Create default credit account
  try {
    await createCreditAccount(user._id, 50000);
  } catch (err) {
    console.error('Failed to create credit account:', err.message);
  }

  return user;
};

// PASSWORD LOGIN
export const loginWithPassword = async ({ identifier, password }) => {
  const user = await findUserByEmailOrMobile(identifier);

  if (!user) throw new AppError('User not found', 404);

  // 🔥 Check Maintenance Mode
  await checkMaintenanceMode(user);

  // 🔥 Check Approval Status
  // Only SUPER_ADMIN and active users can login
  if (user.role !== ROLES.SUPER_ADMIN && user.status !== USER_STATUS.ACTIVE) {
    const message = user.status === USER_STATUS.PENDING 
      ? 'Your account is pending admin approval. Please wait for activation.' 
      : 'Your account is inactive or suspended. Please contact support.';
    throw new AppError(message, 403);
  }

  const isMatch = await comparePassword(password, user.password);

  if (!isMatch) throw new AppError('Invalid credentials', 401);

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await updateUser(user._id, { refreshToken });

  return { user, accessToken, refreshToken };
};

// SEND OTP
export const sendOTP = async (identifier) => {
  const user = await findUserByEmailOrMobile(identifier);

  if (!user) throw new AppError('User not found', 404);

  const otp = generateOTP();

  await updateUser(user._id, {
    otp: {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    },
  });

  return otp; // 🔥 dev only
};

// VERIFY OTP
export const verifyOTP = async ({ identifier, otp }) => {
  const user = await findUserByEmailOrMobile(identifier);

  if (!user) throw new AppError('User not found', 404);

  // 🔥 Check Maintenance Mode
  await checkMaintenanceMode(user);

  // 🔥 Check Approval Status
  if (user.role !== ROLES.SUPER_ADMIN && user.status !== USER_STATUS.ACTIVE) {
    const message = user.status === USER_STATUS.PENDING 
      ? 'Your account is pending admin approval. Please wait for activation.' 
      : 'Your account is inactive or suspended. Please contact support.';
    throw new AppError(message, 403);
  }

  if (!user.otp || user.otp.code !== otp) {
    throw new AppError('Invalid OTP', 400);
  }

  if (user.otp.expiresAt < Date.now()) {
    throw new AppError('OTP expired', 400);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await updateUser(user._id, {
    refreshToken,
    otp: null,
    isVerified: true,
  });

  return { user, accessToken, refreshToken };
};

// REFRESH TOKEN (FIXED)
export const refreshAuthToken = async (token) => {
  const decoded = verifyToken(token);

  const user = await findUserById(decoded.id);

  if (!user || user.refreshToken !== token) {
    throw new AppError('Invalid refresh token', 401);
  }

  const accessToken = generateAccessToken(user);

  return { accessToken };
};