import crypto from 'crypto';
import { ROLES } from '../constants/roles.js';
import ActiveSession from '../models/ActiveSession.model.js';
import { logger } from '../config/logger.js';

/**
 * Determine if a role requires single active session enforcement
 * @param {string} role - User role
 * @returns {boolean}
 */
export const requiresSingleSession = (role) => {
  const singleSessionRoles = [ROLES.VENDOR, ROLES.DELIVERY_PARTNER];
  return singleSessionRoles.includes(role);
};

/**
 * Generate a unique session ID
 * @returns {string}
 */
export const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Parse user agent to extract browser and platform information
 * @param {string} userAgent - User agent string
 * @returns {Object}
 */
export const parseUserAgent = (userAgent) => {
  if (!userAgent) {
    return { browser: 'unknown', platform: 'unknown' };
  }

  let browser = 'unknown';
  let platform = 'unknown';

  // Detect browser
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    browser = 'Opera';
  }

  // Detect platform
  if (userAgent.includes('Windows')) {
    platform = 'Windows';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    platform = 'iOS';
  } else if (userAgent.includes('Android')) {
    platform = 'Android';
  } else if (userAgent.includes('Mac OS')) {
    platform = 'macOS';
  } else if (userAgent.includes('Linux')) {
    platform = 'Linux';
  }

  return { browser, platform };
};

/**
 * Create or update active session for user
 * @param {Object} params - Session parameters
 * @param {string} params.userId - User ID
 * @param {string} params.sessionId - Session ID
 * @param {string} params.userAgent - User agent string
 * @param {string} params.ipAddress - IP address
 * @param {string} params.socketId - Optional socket ID
 * @returns {Promise<Object>}
 */
export const createActiveSession = async ({
  userId,
  sessionId,
  userAgent,
  ipAddress,
  socketId = null
}) => {
  const { browser, platform } = parseUserAgent(userAgent);

  const session = await ActiveSession.create({
    userId,
    sessionId,
    browser,
    platform,
    userAgent,
    ipAddress,
    socketId,
    loginAt: new Date(),
    lastSeen: new Date()
  });

  logger.info('Active session created', {
    userId,
    sessionId,
    browser,
    platform,
    ipAddress
  });

  return session;
};

/**
 * Invalidate existing active session for user (for single-session enforcement)
 * @param {string} userId - User ID
 * @param {string} newSessionId - New session ID (to exclude from invalidation)
 * @param {string} reason - Invalidation reason
 * @returns {Promise<Object>} - Previous session details if found
 */
export const invalidatePreviousSession = async (
  userId,
  newSessionId,
  reason = 'new_login'
) => {
  const previousSession = await ActiveSession.findOne({
    userId,
    isActive: true,
    sessionId: { $ne: newSessionId }
  });

  if (previousSession) {
    await previousSession.invalidate(reason, 'system');
    
    logger.info('Previous session invalidated', {
      userId,
      oldSessionId: previousSession.sessionId,
      newSessionId,
      socketId: previousSession.socketId
    });

    return {
      invalidated: true,
      socketId: previousSession.socketId,
      sessionId: previousSession.sessionId
    };
  }

  return { invalidated: false };
};

/**
 * Validate if session is active and matches JWT
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID from JWT
 * @returns {Promise<Object>}
 */
export const validateSession = async (userId, sessionId) => {
  const activeSession = await ActiveSession.findActiveSession(sessionId);

  if (!activeSession) {
    return {
      valid: false,
      reason: 'session_not_found'
    };
  }

  if (activeSession.userId.toString() !== userId.toString()) {
    return {
      valid: false,
      reason: 'user_mismatch'
    };
  }

  // Update last seen
  await activeSession.updateLastSeen();

  return {
    valid: true,
    session: activeSession
  };
};

/**
 * Invalidate session on logout
 * @param {string} sessionId - Session ID
 * @returns {Promise<boolean>}
 */
export const invalidateSessionOnLogout = async (sessionId) => {
  const session = await ActiveSession.findActiveSession(sessionId);

  if (session) {
    await session.invalidate('logout', 'user');
    logger.info('Session invalidated on logout', { sessionId });
    return true;
  }

  return false;
};

/**
 * Update socket ID for an active session
 * @param {string} sessionId - Session ID
 * @param {string} socketId - Socket ID
 * @returns {Promise<boolean>}
 */
export const updateSessionSocketId = async (sessionId, socketId) => {
  const session = await ActiveSession.findActiveSession(sessionId);

  if (session) {
    await session.updateSocketId(socketId);
    logger.info('Socket ID updated for session', { sessionId, socketId });
    return true;
  }

  return false;
};

/**
 * Get all active sessions for a user (for admin/multi-session roles)
 * @param {string} userId - User ID
 * @returns {Promise<Array>}
 */
export const getUserActiveSessions = async (userId) => {
  return ActiveSession.getAllUserActiveSessions(userId);
};

/**
 * Invalidate all sessions for a user (security action)
 * @param {string} userId - User ID
 * @param {string} reason - Reason for invalidation
 * @returns {Promise<Object>}
 */
export const invalidateAllUserSessions = async (userId, reason = 'security', by = 'admin') => {
  const result = await ActiveSession.invalidateAllUserSessions(userId, reason, by);
  
  logger.warn('All user sessions invalidated', {
    userId,
    reason,
    count: result.modifiedCount
  });

  return result;
};
