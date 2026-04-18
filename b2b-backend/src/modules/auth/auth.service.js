import AppError from '../../errors/AppError.js';
import {
  findUserByEmailOrMobile,
  createUser,
  updateUser,
} from './auth.repository.js';

import { hashPassword } from '../../utils/hashPassword.js';
import { comparePassword } from '../../utils/comparePassword.js';
import { generateOTP } from '../../utils/otpGenerator.js';
import {
  generateAccessToken,
  generateRefreshToken,
} from '../../utils/generateToken.js';

export const register = async (data) => {
  const existing = await findUserByEmailOrMobile(data.email);

  if (existing) {
    throw new AppError('User already exists', 400);
  }

  const hashedPassword = await hashPassword(data.password);

  return createUser({
    ...data,
    password: hashedPassword,
  });
};

// PASSWORD LOGIN
export const loginWithPassword = async ({ identifier, password }) => {
  const user = await findUserByEmailOrMobile(identifier);

  if (!user) throw new AppError('User not found', 404);

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

  return otp; // later integrate SMS/Email
};

// VERIFY OTP
export const verifyOTP = async ({ identifier, otp }) => {
  const user = await findUserByEmailOrMobile(identifier);

  if (!user) throw new AppError('User not found', 404);

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

// REFRESH TOKEN
export const refreshAuthToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await updateUser(decoded.id);

  if (!user || user.refreshToken !== token) {
    throw new AppError('Invalid refresh token', 401);
  }

  const accessToken = generateAccessToken(user);

  return { accessToken };
};