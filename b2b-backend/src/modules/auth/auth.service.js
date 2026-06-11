import AppError from '../../errors/AppError.js';
import {
  findUserByEmailOrMobile,
  findUserByMobile,
  createUser,
  updateUser,
  findUserById,
} from './auth.repository.js';

import { hashPassword } from '../../utils/hashPassword.js';
import { comparePassword } from '../../utils/comparePassword.js';
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
import {
  requiresSingleSession,
  generateSessionId,
  createActiveSession,
  invalidatePreviousSession,
  invalidateSessionOnLogout,
  invalidateAllUserSessions,
  validateSession,
} from '../../utils/sessionHelpers.js';

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

  return user;
};

// PASSWORD LOGIN
export const loginWithPassword = async ({ mobile, password }, req = {}) => {
  const ip = req.ip || 'unknown';

  // Check if user is temporarily blocked
  const blockCheck = await fraudDetection.isUserBlocked(mobile);
  if (blockCheck.blocked) {
    throw new AppError(
      `Account temporarily locked due to ${blockCheck.reason}. Please try again later`,
      403
    );
  }

  const user = await findUserByMobile(mobile);

  if (!user) {
    // Track failed attempt even if user doesn't exist (to prevent enumeration)
    await fraudDetection.trackLoginAttempt(mobile, ip, false);
    throw new AppError('No account found with this mobile number.', 404);
  }

  // Check Maintenance Mode
  await checkMaintenanceMode(user);

  // Check Approval Status
  if (user.role !== ROLES.SUPER_ADMIN && user.status !== USER_STATUS.ACTIVE) {
    let message = 'Your account is inactive or suspended. Please contact support.';
    if (user.status === USER_STATUS.PENDING) {
      message = 'Your account is awaiting administrator approval.';
    } else if (user.status === USER_STATUS.REJECTED) {
      message = 'Your account has been rejected. Please contact support.';
    }
    throw new AppError(message, 403);
  }

  // Verify password
  const isMatch = await comparePassword(password, user.password);

  if (!isMatch) {
    // Track failed login attempt
    await fraudDetection.trackLoginAttempt(mobile, ip, false);
    logger.warn('Failed login attempt', { mobile, ip });
    throw new AppError('Invalid credentials', 401);
  }

  // Track successful login
  await fraudDetection.trackLoginAttempt(mobile, ip, true);

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

  // 🔥 Single Active Session Management for Vendor and Delivery Partner
  let sessionId = null;
  let previousSessionInfo = null;

  if (requiresSingleSession(user.role)) {
    // Generate new session ID
    sessionId = generateSessionId();

    // Invalidate previous active session
    previousSessionInfo = await invalidatePreviousSession(
      user._id,
      sessionId,
      'new_login'
    );

    // 🔥 Emit force_logout to previous session's socket if connected
    if (previousSessionInfo.invalidated && previousSessionInfo.socketId) {
      try {
        const io = global.io;
        if (io) {
          const { emitForceLogout } = await import('../../services/socketSessionHandlers.js');
          emitForceLogout(io, previousSessionInfo.socketId, 'new_login');
        }
      } catch (err) {
        logger.error('Failed to emit force_logout event', { error: err });
      }
    }

    // Create new active session
    const userAgent = req.get?.('user-agent') || 'unknown';
    await createActiveSession({
      userId: user._id,
      sessionId,
      userAgent,
      ipAddress: ip,
      socketId: null // Will be updated when socket connects
    });
  }

  // Generate tokens (with sessionId for single-session roles)
  const accessToken = generateAccessToken(user, sessionId);
  const refreshTokenValue = await createRefreshToken(user, req, null, sessionId);

  logger.info('User logged in', { 
    userId: user._id, 
    ip, 
    role: user.role,
    sessionId,
    previousSessionInvalidated: previousSessionInfo?.invalidated || false
  });

  return { 
    user: sanitizeUser(user), 
    accessToken, 
    refreshToken: refreshTokenValue,
    sessionId, // Include sessionId in response for potential client tracking
    previousSessionInvalidated: previousSessionInfo?.invalidated || false
  };
};

// REFRESH TOKEN WITH ROTATION
export const refreshAuthToken = async (token, req = {}) => {
  const ip = req.ip || 'unknown';
  let sessionId = null;

  try {
    const decoded = verifyToken(token);
    sessionId = decoded.sessionId || null;
  } catch (err) {
    logger.warn('Failed to decode refresh token', { ip, error: err.message });
    throw new AppError('Invalid refresh token', 401);
  }

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

  // Get user
  const user = await findUserById(refreshTokenDoc.userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if user is active
  if (user.status !== USER_STATUS.ACTIVE && user.role !== ROLES.SUPER_ADMIN) {
    throw new AppError('Account is not active', 403);
  }

  if (requiresSingleSession(user.role)) {
    if (!sessionId) {
      await refreshTokenDoc.revoke('system', 'session_revoked');
      throw new AppError('Your session has been invalidated. Please log in again.', 401);
    }

    const sessionValidation = await validateSession(user._id, sessionId);
    if (!sessionValidation.valid) {
      await refreshTokenDoc.revoke('system', 'session_revoked');
      logger.warn('Rejected refresh token for revoked session', {
        userId: user._id,
        sessionId,
        reason: sessionValidation.reason,
      });
      throw new AppError('Your session has been invalidated. Please log in again.', 401);
    }
  }

  // Mark token as used only after session validation succeeds.
  await refreshTokenDoc.markUsed();

  // Generate new access token (with sessionId if present)
  const accessToken = generateAccessToken(user, sessionId);

  // Generate new refresh token (rotation, preserve sessionId)
  const newRefreshToken = await createRefreshToken(user, req, refreshTokenDoc.family, sessionId);

  // Revoke old refresh token
  await refreshTokenDoc.revoke('system', 'rotated');

  logger.info('Tokens rotated successfully', { userId: user._id, sessionId });

  return { 
    accessToken, 
    refreshToken: newRefreshToken,
    user: sanitizeUser(user)
  };
};

/**
 * Create refresh token with device tracking and optional session ID
 */
const createRefreshToken = async (user, req = {}, existingFamily = null, sessionId = null) => {
  const ip = req.ip || 'unknown';
  const userAgent = req.get?.('user-agent') || 'unknown';

  const tokenValue = generateRefreshToken(user, sessionId);
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

  // 🔥 Single Active Session Management for Vendor and Delivery Partner
  let sessionId = null;
  let previousSessionInfo = null;
  const ip = req.ip || 'unknown';

  if (requiresSingleSession(user.role)) {
    // Generate new session ID
    sessionId = generateSessionId();

    // Invalidate previous active session
    previousSessionInfo = await invalidatePreviousSession(
      user._id,
      sessionId,
      'new_login'
    );

    // 🔥 Emit force_logout to previous session's socket if connected
    if (previousSessionInfo.invalidated && previousSessionInfo.socketId) {
      try {
        const io = global.io;
        if (io) {
          const { emitForceLogout } = await import('../../services/socketSessionHandlers.js');
          emitForceLogout(io, previousSessionInfo.socketId, 'new_login');
        }
      } catch (err) {
        logger.error('Failed to emit force_logout event', { error: err });
      }
    }

    // Create new active session
    const userAgent = req.get?.('user-agent') || 'unknown';
    await createActiveSession({
      userId: user._id,
      sessionId,
      userAgent,
      ipAddress: ip,
      socketId: null
    });
  }

  // Generate tokens (with sessionId for single-session roles)
  const accessToken = generateAccessToken(user, sessionId);
  const refreshToken = await createRefreshToken(user, req, null, sessionId);

  logger.info('2FA login successful', { 
    userId: user._id, 
    method: result.method,
    sessionId,
    previousSessionInvalidated: previousSessionInfo?.invalidated || false
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
    sessionId,
    previousSessionInvalidated: previousSessionInfo?.invalidated || false
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
 * Logout - revoke refresh token and invalidate active session
 */
export const logout = async (refreshToken, sessionId = null) => {
  if (!refreshToken) {
    return { success: true };
  }

  const tokenDoc = await RefreshToken.findActiveToken(refreshToken);

  if (tokenDoc) {
    await tokenDoc.revoke('user', 'manual_logout');
    logger.info('User logged out', { userId: tokenDoc.userId });

    // 🔥 Invalidate active session if sessionId provided
    if (sessionId) {
      await invalidateSessionOnLogout(sessionId);
    }
  }

  return { success: true };
};

/**
 * Logout from all devices
 */
export const logoutAll = async (userId) => {
  await RefreshToken.revokeAllUserTokens(userId, 'logout_all');
  
  // 🔥 Invalidate all active sessions
  await invalidateAllUserSessions(userId, 'logout_all', 'user');
  
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