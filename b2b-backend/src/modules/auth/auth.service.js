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
import { validatePassword, checkPasswordBreach } from '../../utils/passwordPolicy.js';
import { fraudDetection } from '../../services/fraudDetection.service.js';
import { twoFactorAuth } from '../../services/twoFactorAuth.service.js';
import RefreshToken from '../../models/RefreshToken.model.js';
import crypto from 'crypto';
import { logger } from '../../config/logger.js';

const checkMaintenanceMode = async (user) => {
  const maintenance = await fetchSetting('maintenanceMode');
  const maintenanceOld = await fetchSetting('MAINTENANCE_MODE');
  if ((maintenance?.value === true || maintenanceOld?.value === true) && user?.role !== ROLES.SUPER_ADMIN) {
    throw new AppError('System under maintenance', 503);
  }
};

export const register = async (data, req = {}) => {
  const { email, mobile, password } = data;
  const ip = req.ip || 'unknown';

  // Track registration attempts (fraud detection)
  await fraudDetection.trackRegistration(ip, email);

  // Check if email or mobile already exists
  const existingEmail = email ? await findUserByEmailOrMobile(email) : null;
  const existingMobile = mobile ? await findUserByEmailOrMobile(mobile) : null;

  if (existingEmail || existingMobile) {
    const field = existingEmail ? 'Email' : 'Mobile number';
    throw new AppError(`${field} already registered`, 400);
  }

  // Validate password against security policy
  validatePassword(password, { name: data.name, email, mobile });

  // Check if password has been breached
  const breachCheck = await checkPasswordBreach(password);
  if (breachCheck.breached && breachCheck.count > 1000) {
    logger.warn('User attempted to register with breached password', { email, breachCount: breachCheck.count });
    throw new AppError(
      'This password has been exposed in data breaches. Please choose a different password',
      400
    );
  }

  const hashedPassword = await hashPassword(password);

  const user = await createUser({
    ...data,
    password: hashedPassword,
    status: USER_STATUS.PENDING,
    lastPasswordChange: new Date(),
    passwordHistory: [{ hash: hashedPassword, changedAt: new Date() }]
  });

  // Create default credit account
  try {
    await createCreditAccount(user._id, 50000);
  } catch (err) {
    logger.error('Failed to create credit account:', err);
  }

  logger.info('User registered', { userId: user._id, email, role: user.role });

  // Issue tokens so the client is authenticated immediately after registration.
  // (Account status checks still gate protected routes for non-active users.)
  const accessToken = generateAccessToken(user);
  const refreshToken = await createRefreshToken(user, req);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

// PASSWORD LOGIN
export const loginWithPassword = async ({ identifier, password }, req = {}) => {
  const ip = req.ip || 'unknown';
  const userAgent = req.get?.('user-agent') || 'unknown';

  // Check if user is temporarily blocked
  const blockCheck = await fraudDetection.isUserBlocked(identifier);
  if (blockCheck.blocked) {
    throw new AppError(
      `Account temporarily locked due to ${blockCheck.reason}. Please try again later`,
      403
    );
  }

  const user = await findUserByEmailOrMobile(identifier);

  if (!user) {
    // Track failed attempt even if user doesn't exist (to prevent enumeration)
    await fraudDetection.trackLoginAttempt(identifier, ip, false);
    throw new AppError('Invalid credentials', 401);
  }

  // Check Maintenance Mode
  await checkMaintenanceMode(user);

  // Check Approval Status
  if (user.role !== ROLES.SUPER_ADMIN && user.status !== USER_STATUS.ACTIVE) {
    const message = user.status === USER_STATUS.PENDING 
      ? 'Your account is pending admin approval. Please wait for activation.' 
      : 'Your account is inactive or suspended. Please contact support.';
    throw new AppError(message, 403);
  }

  // Verify password
  const isMatch = await comparePassword(password, user.password);

  if (!isMatch) {
    // Track failed login attempt
    await fraudDetection.trackLoginAttempt(identifier, ip, false);
    logger.warn('Failed login attempt', { identifier, ip });
    throw new AppError('Invalid credentials', 401);
  }

  // Track successful login
  await fraudDetection.trackLoginAttempt(identifier, ip, true);

  // Check if 2FA is enabled
  if (user.twoFactorEnabled) {
    // Return indicator that 2FA is required
    return {
      requires2FA: true,
      userId: user._id,
      email: user.email,
      twoFactorMethod: user.twoFactorMethod || 'totp'
    };
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshTokenValue = await createRefreshToken(user, req);

  logger.info('User logged in', { userId: user._id, ip });

  return { 
    user: sanitizeUser(user), 
    accessToken, 
    refreshToken: refreshTokenValue 
  };
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

// REFRESH TOKEN WITH ROTATION
export const refreshAuthToken = async (token, req = {}) => {
  const ip = req.ip || 'unknown';
  
  // Find active refresh token
  const refreshTokenDoc = await RefreshToken.findActiveToken(token);

  if (!refreshTokenDoc) {
    logger.warn('Invalid or expired refresh token used', { ip });
    throw new AppError('Invalid refresh token', 401);
  }

  // Check for token reuse (rotation abuse detection)
  if (refreshTokenDoc.reuseDetected) {
    logger.error('Refresh token reuse detected - revoking entire family', {
      userId: refreshTokenDoc.userId,
      family: refreshTokenDoc.family,
      ip
    });

    // Revoke entire token family
    await RefreshToken.revokeFamily(refreshTokenDoc.family, 'token_reuse_detected');
    
    throw new AppError('Security violation detected. Please log in again', 401);
  }

  // Mark token as used
  await refreshTokenDoc.markUsed();

  // Get user
  const user = await findUserById(refreshTokenDoc.userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if user is active
  if (user.status !== USER_STATUS.ACTIVE && user.role !== ROLES.SUPER_ADMIN) {
    throw new AppError('Account is not active', 403);
  }

  // Generate new access token
  const accessToken = generateAccessToken(user);

  // Generate new refresh token (rotation)
  const newRefreshToken = await createRefreshToken(user, req, refreshTokenDoc.family);

  // Revoke old refresh token
  await refreshTokenDoc.revoke('system', 'rotated');

  logger.info('Tokens rotated successfully', { userId: user._id });

  return { 
    accessToken, 
    refreshToken: newRefreshToken,
    user: sanitizeUser(user)
  };
};

/**
 * Create refresh token with device tracking
 */
const createRefreshToken = async (user, req = {}, existingFamily = null) => {
  const ip = req.ip || 'unknown';
  const userAgent = req.get?.('user-agent') || 'unknown';

  const tokenValue = generateRefreshToken(user);
  const family = existingFamily || crypto.randomBytes(16).toString('hex');

  const deviceInfo = parseUserAgent(userAgent);

  await RefreshToken.create({
    userId: user._id,
    token: tokenValue,
    family,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    deviceInfo,
    ipAddress: ip
  });

  return tokenValue;
};

/**
 * Verify 2FA code during login
 */
export const verify2FALogin = async ({ userId, code }, req = {}) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.twoFactorEnabled) {
    throw new AppError('2FA is not enabled for this account', 400);
  }

  // Verify 2FA code
  const result = await twoFactorAuth.validateLogin2FA(
    code,
    user.twoFactorSecret,
    user.twoFactorBackupCodes || []
  );

  if (!result.valid) {
    await fraudDetection.trackOTPAttempt(userId, false);
    throw new AppError('Invalid 2FA code', 401);
  }

  // If backup code was used, mark it as used
  if (result.method === 'backup_code') {
    user.twoFactorBackupCodes.splice(result.usedCodeIndex, 1);
    await user.save();
    logger.warn('Backup code used for login', { userId: user._id });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = await createRefreshToken(user, req);

  logger.info('2FA login successful', { userId: user._id, method: result.method });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken
  };
};

/**
 * Enable 2FA for user
 */
export const enable2FA = async (userId) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.twoFactorEnabled) {
    throw new AppError('2FA is already enabled', 400);
  }

  const { secret, qrCode, backupCodes, hashedBackupCodes } = await twoFactorAuth.enable2FA(user);

  // Store secret and backup codes
  await updateUser(user._id, {
    twoFactorSecret: secret,
    twoFactorBackupCodes: hashedBackupCodes,
    twoFactorEnabled: false // Will be enabled after verification
  });

  logger.info('2FA setup initiated', { userId: user._id });

  return {
    qrCode,
    backupCodes, // Return plain codes to user ONCE
    secret // For manual entry
  };
};

/**
 * Verify and confirm 2FA setup
 */
export const verify2FASetup = async (userId, code) => {
  const user = await findUserById(userId);

  if (!user || !user.twoFactorSecret) {
    throw new AppError('2FA setup not initiated', 400);
  }

  const isValid = twoFactorAuth.verifyToken(code, user.twoFactorSecret);

  if (!isValid) {
    throw new AppError('Invalid verification code', 400);
  }

  // Enable 2FA
  await updateUser(user._id, {
    twoFactorEnabled: true
  });

  logger.info('2FA enabled', { userId: user._id });

  return { success: true };
};

/**
 * Disable 2FA
 */
export const disable2FA = async (userId, password) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify password
  const isMatch = await comparePassword(password, user.password);

  if (!isMatch) {
    throw new AppError('Invalid password', 401);
  }

  // Disable 2FA
  await updateUser(user._id, {
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorBackupCodes: []
  });

  logger.warn('2FA disabled', { userId: user._id });

  return { success: true };
};

/**
 * Change password with security checks
 */
export const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify old password
  const isMatch = await comparePassword(oldPassword, user.password);

  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Validate new password
  validatePassword(newPassword, { 
    name: user.name, 
    email: user.email, 
    mobile: user.mobile 
  });

  // Check if new password is different from old
  if (oldPassword === newPassword) {
    throw new AppError('New password must be different from current password', 400);
  }

  // Check password history (prevent reuse of last 5 passwords)
  if (user.passwordHistory && user.passwordHistory.length > 0) {
    for (const historyItem of user.passwordHistory.slice(-5)) {
      const isReused = await comparePassword(newPassword, historyItem.hash);
      if (isReused) {
        throw new AppError('Cannot reuse recent passwords', 400);
      }
    }
  }

  // Check if password has been breached
  const breachCheck = await checkPasswordBreach(newPassword);
  if (breachCheck.breached && breachCheck.count > 1000) {
    throw new AppError(
      'This password has been exposed in data breaches. Please choose a different password',
      400
    );
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password and history
  const passwordHistory = user.passwordHistory || [];
  passwordHistory.push({ hash: hashedPassword, changedAt: new Date() });

  // Keep only last 5 passwords
  if (passwordHistory.length > 5) {
    passwordHistory.shift();
  }

  await updateUser(user._id, {
    password: hashedPassword,
    lastPasswordChange: new Date(),
    passwordHistory
  });

  // Invalidate all sessions (force re-login)
  await RefreshToken.revokeAllUserTokens(user._id, 'password_change');

  logger.info('Password changed', { userId: user._id });

  return { success: true, message: 'Password changed successfully. Please log in again' };
};

/**
 * Logout - revoke refresh token
 */
export const logout = async (refreshToken) => {
  if (!refreshToken) {
    return { success: true };
  }

  const tokenDoc = await RefreshToken.findActiveToken(refreshToken);

  if (tokenDoc) {
    await tokenDoc.revoke('user', 'manual_logout');
    logger.info('User logged out', { userId: tokenDoc.userId });
  }

  return { success: true };
};

/**
 * Logout from all devices
 */
export const logoutAll = async (userId) => {
  await RefreshToken.revokeAllUserTokens(userId, 'logout_all');
  logger.info('User logged out from all devices', { userId });
  return { success: true };
};

/**
 * Get active sessions
 */
export const getActiveSessions = async (userId) => {
  return await RefreshToken.getActiveUserTokens(userId);
};

/**
 * Revoke specific session
 */
export const revokeSession = async (userId, tokenId) => {
  const token = await RefreshToken.findById(tokenId);

  if (!token || token.userId.toString() !== userId.toString()) {
    throw new AppError('Session not found', 404);
  }

  await token.revoke('user', 'manual_revocation');

  return { success: true };
};

/**
 * Sanitize user data (remove sensitive fields)
 */
const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  delete userObj.password;
  delete userObj.refreshToken;
  delete userObj.twoFactorSecret;
  delete userObj.twoFactorBackupCodes;
  delete userObj.passwordHistory;
  delete userObj.otp;
  return userObj;
};

/**
 * Parse user agent for device tracking
 */
const parseUserAgent = (userAgent) => {
  // Simple parsing - use ua-parser-js in production
  const isChrome = /Chrome/.test(userAgent);
  const isFirefox = /Firefox/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !isChrome;
  const isEdge = /Edg/.test(userAgent);

  const isWindows = /Windows/.test(userAgent);
  const isMac = /Macintosh/.test(userAgent);
  const isLinux = /Linux/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isiOS = /iPhone|iPad/.test(userAgent);

  return {
    browser: isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : isEdge ? 'Edge' : 'Unknown',
    os: isWindows ? 'Windows' : isMac ? 'macOS' : isLinux ? 'Linux' : isAndroid ? 'Android' : isiOS ? 'iOS' : 'Unknown',
    deviceName: isiOS || isAndroid ? 'Mobile' : 'Desktop',
    userAgent
  };
};