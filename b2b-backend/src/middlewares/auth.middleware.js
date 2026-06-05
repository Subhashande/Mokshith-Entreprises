import jwt from 'jsonwebtoken';
import AppError from '../errors/AppError.js';
import { fetchSetting } from '../modules/settings/settings.service.js';
import { ROLES } from '../constants/roles.js';
import { findUserById } from '../modules/auth/auth.repository.js';
import { USER_STATUS } from '../constants/userStatus.js';
import { logger } from '../config/logger.js';
import { ERROR_MESSAGES } from '../constants/errorMessages.js';
import { requiresSingleSession, validateSession } from '../utils/sessionHelpers.js';

export const protect = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Not authorized - No token provided', 401));
    }

    const token = authHeader.split(' ')[1];

    if (!token || token === 'null' || token === 'undefined') {
      return next(new AppError('Not authorized - Invalid token', 401));
    }

    // Verify JWT secret is configured
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET is not configured');
      return next(new AppError('Server configuration error', 500));
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Token expired - Please log in again', 401));
      }
      if (err.name === 'JsonWebTokenError') {
        return next(new AppError('Invalid token - Please log in again', 401));
      }
      return next(new AppError('Token verification failed', 401));
    }

    // Validate decoded token structure
    if (!decoded || !decoded.id) {
      return next(new AppError('Invalid token payload', 401));
    }
    
    // 🔥 Fetch user to check status and existence
    const user = await findUserById(decoded.id);
    if (!user) {
      return next(new AppError('User no longer exists', 401));
    }

    // 🔥 Single Active Session Validation (for Vendor and Delivery Partner)
    if (requiresSingleSession(user.role)) {
      const sessionId = decoded.sessionId;

      if (!sessionId) {
        logger.warn('Token missing sessionId for single-session role', {
          userId: user._id,
          role: user.role
        });
        return next(new AppError(ERROR_MESSAGES.SESSION_REVOKED, 401));
      }

      // Validate session is active and matches
      const sessionValidation = await validateSession(user._id, sessionId);

      if (!sessionValidation.valid) {
        logger.warn('Session validation failed', {
          userId: user._id,
          sessionId,
          reason: sessionValidation.reason
        });
        return next(new AppError(ERROR_MESSAGES.SESSION_REVOKED, 401));
      }

      // Attach session info to request for potential use
      req.session = sessionValidation.session;
    }

    // 🔥 Check Maintenance Mode (allow super admin)
    const maintenance = await fetchSetting('maintenanceMode');
    const maintenanceOld = await fetchSetting('MAINTENANCE_MODE');
    if ((maintenance?.value === true || maintenanceOld?.value === true) && user.role !== ROLES.SUPER_ADMIN) {
      return next(new AppError('System under maintenance', 503));
    }

    // 🔥 Check User Status
    if (user.role !== ROLES.SUPER_ADMIN && user.status !== USER_STATUS.ACTIVE) {
      const message = user.status === USER_STATUS.PENDING 
        ? 'Your account is pending admin approval. Please wait for activation.' 
        : 'Your account is inactive or suspended. Please contact support.';
      return next(new AppError(message, 403));
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    logger.error('Auth middleware error:', err);
    next(new AppError('Authentication failed', 401));
  }
};

// Alias for consistency with new RBAC system
export const authenticate = protect;