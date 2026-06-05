import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  requiresSingleSession,
  generateSessionId,
  parseUserAgent,
  createActiveSession,
  invalidatePreviousSession,
  validateSession,
  invalidateSessionOnLogout,
  updateSessionSocketId,
} from '../../src/utils/sessionHelpers.js';
import { ROLES } from '../../src/constants/roles.js';
import ActiveSession from '../../src/models/ActiveSession.model.js';

describe('sessionHelpers', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('requires single sessions only for vendor and delivery partner', () => {
    expect(requiresSingleSession(ROLES.VENDOR)).toBe(true);
    expect(requiresSingleSession(ROLES.DELIVERY_PARTNER)).toBe(true);
    expect(requiresSingleSession(ROLES.ADMIN)).toBe(false);
    expect(requiresSingleSession(ROLES.SUPER_ADMIN)).toBe(false);
  });

  it('generates unique 64-char session ids', () => {
    const sessionIdA = generateSessionId();
    const sessionIdB = generateSessionId();

    expect(sessionIdA).toHaveLength(64);
    expect(sessionIdB).toHaveLength(64);
    expect(sessionIdA).not.toBe(sessionIdB);
  });

  it('parses browser and platform from the user agent', () => {
    expect(
      parseUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
      )
    ).toEqual({ browser: 'Chrome', platform: 'Windows' });

    expect(
      parseUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'
      )
    ).toEqual({ browser: 'Safari', platform: 'iOS' });
  });

  it('creates an active session with parsed metadata', async () => {
    const createSpy = jest.spyOn(ActiveSession, 'create').mockResolvedValue({ sessionId: 'session-1' });

    await createActiveSession({
      userId: 'user-1',
      sessionId: 'session-1',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      ipAddress: '127.0.0.1',
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        sessionId: 'session-1',
        browser: 'Chrome',
        platform: 'Windows',
      })
    );
  });

  it('invalidates a previous active session when one exists', async () => {
    const previousSession = {
      sessionId: 'old-session',
      socketId: 'socket-1',
      invalidate: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(ActiveSession, 'findOne').mockResolvedValue(previousSession);

    const result = await invalidatePreviousSession('user-1', 'new-session', 'new_login');

    expect(previousSession.invalidate).toHaveBeenCalledWith('new_login', 'system');
    expect(result).toEqual({
      invalidated: true,
      socketId: 'socket-1',
      sessionId: 'old-session',
    });
  });

  it('validates the currently active session and updates lastSeen', async () => {
    const session = {
      userId: { toString: () => 'user-1' },
      updateLastSeen: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(ActiveSession, 'findActiveSession').mockResolvedValue(session);

    const result = await validateSession('user-1', 'session-1');

    expect(result.valid).toBe(true);
    expect(session.updateLastSeen).toHaveBeenCalled();
  });

  it('invalidates a session on logout', async () => {
    const session = {
      invalidate: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(ActiveSession, 'findActiveSession').mockResolvedValue(session);

    await expect(invalidateSessionOnLogout('session-1')).resolves.toBe(true);
    expect(session.invalidate).toHaveBeenCalledWith('logout', 'user');
  });

  it('updates the socket id for an active session', async () => {
    const session = {
      updateSocketId: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(ActiveSession, 'findActiveSession').mockResolvedValue(session);

    await expect(updateSessionSocketId('session-1', 'socket-2')).resolves.toBe(true);
    expect(session.updateSocketId).toHaveBeenCalledWith('socket-2');
  });
});
