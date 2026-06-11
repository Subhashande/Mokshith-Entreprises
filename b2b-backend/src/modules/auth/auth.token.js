import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

/**
 * Generate access token with optional sessionId
 * @param {Object} user - User object
 * @param {string} sessionId - Optional session ID for single-session enforcement
 */
export const generateAccessToken = (user, sessionId = null) => {
  const payload = {
    id: user._id,
    role: user.role,
  };

  // Add sessionId if provided (for roles requiring single active session)
  if (sessionId) {
    payload.sessionId = sessionId;
  }

  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
};

/**
 * Generate refresh token with optional sessionId
 * @param {Object} user - User object
 * @param {string} sessionId - Optional session ID for single-session enforcement
 */
export const generateRefreshToken = (user, sessionId = null) => {
  const payload = {
    id: user._id,
    jti: crypto.randomUUID(),
  };

  // Add sessionId if provided
  if (sessionId) {
    payload.sessionId = sessionId;
  }

  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};