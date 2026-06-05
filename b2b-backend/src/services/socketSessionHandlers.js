import { logger } from '../config/logger.js';
import { updateSessionSocketId } from '../utils/sessionHelpers.js';
import { verifyToken } from '../modules/auth/auth.token.js';

/**
 * Initialize Socket.IO session management handlers
 * @param {Object} io - Socket.IO server instance
 */
export const initializeSessionHandlers = (io) => {
  io.on('connection', (socket) => {
    logger.info(`🔌 Socket connected: ${socket.id}`);

    /**
     * Handle session registration
     * Client sends sessionId from JWT to link socket with session
     */
    socket.on('register_session', async (data) => {
      try {
        const { token } = data;

        if (!token) {
          socket.emit('session_error', { message: 'Token required' });
          return;
        }

        // Verify token and extract sessionId
        const decoded = verifyToken(token);
        const { sessionId, id: userId } = decoded;

        if (!sessionId) {
          // This is likely an admin/super_admin without single-session enforcement
          socket.join(userId);
          logger.info(`👤 User ${userId} joined personal room (no session enforcement)`);
          return;
        }

        // Update session with socket ID
        const updated = await updateSessionSocketId(sessionId, socket.id);

        if (updated) {
          // Join personal room for this user
          socket.join(userId);
          
          // Store session info in socket data
          socket.data = {
            userId,
            sessionId
          };

          socket.emit('session_registered', { success: true });
          logger.info(`✅ Session registered`, {
            userId,
            sessionId,
            socketId: socket.id
          });
        } else {
          socket.emit('session_error', { 
            message: 'Session not found or expired' 
          });
        }
      } catch (err) {
        logger.error('Error registering session:', err);
        socket.emit('session_error', { 
          message: 'Failed to register session' 
        });
      }
    });

    /**
     * Handle user joining personal room (backward compatibility)
     */
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(userId);
        logger.info(`👤 User ${userId} joined room ${userId}`);
      }
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', () => {
      logger.info(`🔌 Socket disconnected: ${socket.id}`);
    });

    /**
     * Handle heartbeat (for session activity tracking)
     */
    socket.on('heartbeat', () => {
      // Can be used to update lastSeen timestamp if needed
      socket.emit('heartbeat_ack');
    });
  });

  logger.info('✅ Session management handlers initialized');
};

/**
 * Emit force logout event to a specific socket
 * @param {Object} io - Socket.IO server instance
 * @param {string} socketId - Socket ID to target
 * @param {string} reason - Reason for force logout
 */
export const emitForceLogout = (io, socketId, reason = 'new_login') => {
  if (!io || !socketId) {
    logger.warn('Cannot emit force logout - missing io or socketId');
    return;
  }

  io.to(socketId).emit('force_logout', {
    reason,
    message: 'You have been logged out because a new session was started on another device.'
  });

  logger.info('📤 Force logout event emitted', { socketId, reason });
};

/**
 * Emit force logout to all sockets in a user room (for logoutAll)
 * @param {Object} io - Socket.IO server instance
 * @param {string} userId - User ID
 * @param {string} reason - Reason for force logout
 */
export const emitForceLogoutToUser = (io, userId, reason = 'logout_all') => {
  if (!io || !userId) {
    logger.warn('Cannot emit force logout to user - missing io or userId');
    return;
  }

  io.to(userId).emit('force_logout', {
    reason,
    message: 'You have been logged out from all devices.'
  });

  logger.info('📤 Force logout event emitted to user', { userId, reason });
};
