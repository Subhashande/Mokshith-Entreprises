import { asyncHandler } from '../../utils/asyncHandler.js';
import * as authService from './auth.service.js';
import { successResponse } from '../../utils/responseHandler.js';
import Audit from '../audit/audit.model.js';
import { 
  trackAuthAttempt, 
  trackPasswordChange, 
  track2FAEvent,
  SECURITY_EVENTS,
  logSecurityEvent
} from '../../middlewares/securityAudit.middleware.js';
import { getCsrfToken } from '../../middlewares/csrf.middleware.js';
import { logger } from '../../config/logger.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, req);
  
  // Log action
  await Audit.create({
    userId: result.user._id,
    userEmail: result.user.email,
    role: result.user.role,
    action: 'REGISTER',
    entity: 'USER',
    entityId: result.user._id,
    details: `User registered: ${result.user.email}`,
    ip: req.ip,
    severity: 'INFO'
  });

  trackAuthAttempt(result.user._id, true, req);

  // Include CSRF token in response
  const csrfToken = getCsrfToken(req, res);

  successResponse(res, { 
    ...result,
    csrfToken
  }, 'User registered successfully');
});

export const login = asyncHandler(async (req, res) => {
  try {
    const result = await authService.loginWithPassword(req.body, req);

    // Check if 2FA is required
    if (result.requires2FA) {
      // Track partial login
      await Audit.create({
        userId: result.userId,
        userEmail: req.body.mobile,
        action: 'LOGIN_2FA_REQUIRED',
        entity: 'USER',
        entityId: result.userId,
        details: `2FA required for: ${req.body.mobile}`,
        ip: req.ip,
        severity: 'INFO'
      });

      return successResponse(res, { 
        requires2FA: true,
        userId: result.userId,
        message: 'Please complete 2FA verification'
      }, '2FA verification required');
    }

    const user = result.user;

    // Log success
    await Audit.create({
      userId: user._id,
      userEmail: user.email,
      role: user.role,
      action: 'LOGIN_SUCCESS',
      entity: 'USER',
      entityId: user._id,
      details: `User logged in: ${user.mobile}`,
      ip: req.ip,
      severity: 'INFO'
    });

    trackAuthAttempt(user._id, true, req);

    // Include CSRF token
    const csrfToken = getCsrfToken(req, res);

    successResponse(res, { 
      ...result,
      csrfToken
    }, 'Login successful');
  } catch (error) {
    // Log failure
    await Audit.create({
      userEmail: req.body.mobile,
      action: 'LOGIN_FAILED',
      entity: 'USER',
      details: `Failed login attempt for: ${req.body.mobile}. Reason: ${error.message}`,
      ip: req.ip,
      severity: 'WARNING'
    });
    
    trackAuthAttempt(null, false, req);
    throw error;
  }
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  const data = await authService.refreshAuthToken(token, req);

  logSecurityEvent(SECURITY_EVENTS.TOKEN_REFRESH, {
    userId: data.user._id,
    ip: req.ip
  });

  successResponse(res, data, 'Token refreshed');
});

/**
 * Complete 2FA login
 */
export const verify2FA = asyncHandler(async (req, res) => {
  const { userId, code } = req.body;

  const result = await authService.verify2FALogin({ userId, code }, req);

  await Audit.create({
    userId: result.user._id,
    userEmail: result.user.email,
    action: 'LOGIN_2FA_SUCCESS',
    entity: 'USER',
    entityId: result.user._id,
    details: `2FA login completed: ${result.user.email}`,
    ip: req.ip,
    severity: 'INFO'
  });

  track2FAEvent(SECURITY_EVENTS.LOGIN_SUCCESS, result.user._id, req, true);

  // Include CSRF token
  const csrfToken = getCsrfToken(req, res);

  successResponse(res, { 
    ...result,
    csrfToken
  }, '2FA verification successful');
});

/**
 * Enable 2FA
 */
export const enable2FA = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const result = await authService.enable2FA(userId);

  await Audit.create({
    userId,
    userEmail: req.user.email,
    action: '2FA_SETUP_INITIATED',
    entity: 'USER',
    entityId: userId,
    details: '2FA setup initiated',
    ip: req.ip,
    severity: 'INFO'
  });

  successResponse(res, result, '2FA setup initiated. Scan QR code and verify');
});

/**
 * Verify 2FA setup
 */
export const verify2FASetup = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { code } = req.body;

  await authService.verify2FASetup(userId, code);

  await Audit.create({
    userId,
    userEmail: req.user.email,
    action: '2FA_ENABLED',
    entity: 'USER',
    entityId: userId,
    details: '2FA enabled successfully',
    ip: req.ip,
    severity: 'INFO'
  });

  track2FAEvent(SECURITY_EVENTS['2FA_ENABLED'], userId, req, true);

  successResponse(res, { success: true }, '2FA enabled successfully');
});

/**
 * Disable 2FA
 */
export const disable2FA = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { password } = req.body;

  await authService.disable2FA(userId, password);

  await Audit.create({
    userId,
    userEmail: req.user.email,
    action: '2FA_DISABLED',
    entity: 'USER',
    entityId: userId,
    details: '2FA disabled',
    ip: req.ip,
    severity: 'WARNING'
  });

  track2FAEvent(SECURITY_EVENTS['2FA_DISABLED'], userId, req, true);

  successResponse(res, { success: true }, '2FA disabled successfully');
});

/**
 * Change password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { oldPassword, newPassword } = req.body;

  await authService.changePassword(userId, oldPassword, newPassword);

  await Audit.create({
    userId,
    userEmail: req.user.email,
    action: 'PASSWORD_CHANGED',
    entity: 'USER',
    entityId: userId,
    details: 'Password changed successfully',
    ip: req.ip,
    severity: 'INFO'
  });

  trackPasswordChange(userId, req);

  successResponse(res, { success: true }, 'Password changed. Please log in again');
});

/**
 * Logout
 */
export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  try {
    // Extract sessionId from request (attached by auth middleware)
    const sessionId = req.session?.sessionId || null;

    await authService.logout(refreshToken, sessionId);

    if (req.user) {
      logSecurityEvent(SECURITY_EVENTS.LOGOUT, {
        userId: req.user._id,
        ip: req.ip
      });
    }
  } catch (error) {
    logger.error('Logout error (handled):', error);
  }

  successResponse(res, { success: true }, 'Logged out successfully');
});

/**
 * Logout from all devices
 */
export const logoutAll = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await authService.logoutAll(userId);

  await Audit.create({
    userId,
    userEmail: req.user.email,
    action: 'LOGOUT_ALL_DEVICES',
    entity: 'USER',
    entityId: userId,
    details: 'Logged out from all devices',
    ip: req.ip,
    severity: 'INFO'
  });

  successResponse(res, { success: true }, 'Logged out from all devices');
});

/**
 * Get CSRF Token
 */
export const getCsrfTokenHandler = asyncHandler(async (req, res) => {
  const token = getCsrfToken(req, res);
  successResponse(res, { csrfToken: token });
});

/**
 * Get active sessions
 */
export const getActiveSessions = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const sessions = await authService.getActiveSessions(userId);

  successResponse(res, sessions, 'Active sessions retrieved');
});

/**
 * Revoke session
 */
export const revokeSession = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { tokenId } = req.params;

  await authService.revokeSession(userId, tokenId);

  await Audit.create({
    userId,
    userEmail: req.user.email,
    action: 'SESSION_REVOKED',
    entity: 'USER',
    entityId: userId,
    details: `Session revoked: ${tokenId}`,
    ip: req.ip,
    severity: 'INFO'
  });

  successResponse(res, { success: true }, 'Session revoked');
});
