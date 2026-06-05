import { describe, it, expect, beforeEach, vi } from 'vitest';
import authReducer, {
  loginStart,
  loginSuccess,
  loginFailure,
  updateUser,
  updateToken,
  updateCsrfToken,
  logout,
} from '../../../modules/auth/authSlice.js';

describe('authSlice', () => {
  let initialState;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    initialState = {
      user: null,
      token: null,
      csrfToken: null,
      sessionId: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    };
  });

  describe('initial state', () => {
    it('should return the initial state', () => {
      const state = authReducer(undefined, { type: '@@INIT' });
      expect(state).toEqual(initialState);
    });

    it('should load token from localStorage on init', async () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Test' }));
      
      // Reset modules to get fresh initial state with current localStorage
      vi.resetModules();
      const { default: freshAuthReducer } = await import('../../../modules/auth/authSlice.js');
      
      const state = freshAuthReducer(undefined, { type: '@@INIT' });
      expect(state.token).toBe('test-token');
      expect(state.user).toEqual({ id: '1', name: 'Test' });
      expect(state.isAuthenticated).toBe(true);
      
      // Reset again for other tests
      vi.resetModules();
    });

    it('should handle invalid user data in localStorage', () => {
      localStorage.setItem('user', 'invalid-json');
      const state = authReducer(undefined, { type: '@@INIT' });
      expect(state.user).toBe(null);
    });

    it('should handle "undefined" string in localStorage', () => {
      localStorage.setItem('token', 'undefined');
      const state = authReducer(undefined, { type: '@@INIT' });
      expect(state.token).toBe(null);
    });
  });

  describe('loginStart', () => {
    it('should set loading to true and clear error', () => {
      const previousState = {
        ...initialState,
        error: 'Previous error',
      };

      const state = authReducer(previousState, loginStart());

      expect(state.loading).toBe(true);
      expect(state.error).toBe(null);
    });
  });

  describe('loginSuccess', () => {
    it('should set user, token, and update authentication state', () => {
      const payload = {
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        token: 'jwt-token-123',
        csrfToken: 'csrf-token-123',
        sessionId: 'session-123',
      };

      const state = authReducer(initialState, loginSuccess(payload));

      expect(state.user).toEqual(payload.user);
      expect(state.token).toBe(payload.token);
      expect(state.csrfToken).toBe(payload.csrfToken);
      expect(state.sessionId).toBe(payload.sessionId);
      expect(state.isAuthenticated).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
    });

    it('should persist user and token to localStorage', () => {
      const payload = {
        user: { id: '1', name: 'Test User' },
        token: 'jwt-token-123',
        csrfToken: 'csrf-token-123',
      };

      authReducer(initialState, loginSuccess(payload));

      expect(localStorage.getItem('user')).toBe(JSON.stringify(payload.user));
      expect(localStorage.getItem('token')).toBe(payload.token);
      expect(localStorage.getItem('csrfToken')).toBe(payload.csrfToken);
    });

    it('should handle missing csrfToken', () => {
      const payload = {
        user: { id: '1', name: 'Test User' },
        token: 'jwt-token-123',
      };

      const state = authReducer(initialState, loginSuccess(payload));

      expect(state.csrfToken).toBeUndefined();
    });
  });

  describe('loginFailure', () => {
    it('should set error and stop loading', () => {
      const previousState = {
        ...initialState,
        loading: true,
      };

      const error = 'Invalid credentials';
      const state = authReducer(previousState, loginFailure(error));

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('updateUser', () => {
    it('should update user data', () => {
      const previousState = {
        ...initialState,
        user: { id: '1', name: 'Old Name', email: 'old@example.com' },
        isAuthenticated: true,
      };

      const updates = { name: 'New Name' };
      const state = authReducer(previousState, updateUser(updates));

      expect(state.user).toEqual({
        id: '1',
        name: 'New Name',
        email: 'old@example.com',
      });
    });

    it('should persist updated user to localStorage', () => {
      const previousState = {
        ...initialState,
        user: { id: '1', name: 'Old Name' },
      };

      const updates = { name: 'New Name' };
      authReducer(previousState, updateUser(updates));

      const storedUser = JSON.parse(localStorage.getItem('user'));
      expect(storedUser.name).toBe('New Name');
    });
  });

  describe('updateToken', () => {
    it('should update token and authentication state', () => {
      const newToken = 'new-token-456';
      const state = authReducer(initialState, updateToken(newToken));

      expect(state.token).toBe(newToken);
      expect(state.isAuthenticated).toBe(true);
      expect(localStorage.getItem('token')).toBe(newToken);
    });

    it('should handle empty token', () => {
      const state = authReducer(initialState, updateToken(null));

      expect(state.token).toBe(null);
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('updateCsrfToken', () => {
    it('should update csrfToken', () => {
      const newCsrfToken = 'new-csrf-token';
      const state = authReducer(initialState, updateCsrfToken(newCsrfToken));

      expect(state.csrfToken).toBe(newCsrfToken);
      expect(localStorage.getItem('csrfToken')).toBe(newCsrfToken);
    });
  });

  describe('logout', () => {
    it('should clear all authentication data', () => {
      const previousState = {
        user: { id: '1', name: 'Test User' },
        token: 'jwt-token-123',
        csrfToken: 'csrf-token-123',
        isAuthenticated: true,
        loading: false,
        error: null,
      };

      const state = authReducer(previousState, logout());

      expect(state.user).toBe(null);
      expect(state.token).toBe(null);
      expect(state.csrfToken).toBe(null);
      expect(state.isAuthenticated).toBe(false);
    });

    it('should clear localStorage', () => {
      localStorage.setItem('user', JSON.stringify({ id: '1' }));
      localStorage.setItem('token', 'token');
      localStorage.setItem('csrfToken', 'csrf');

      authReducer(initialState, logout());

      expect(localStorage.getItem('user')).toBe(null);
      expect(localStorage.getItem('token')).toBe(null);
      expect(localStorage.getItem('csrfToken')).toBe(null);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple consecutive login attempts', () => {
      let state = initialState;

      state = authReducer(state, loginStart());
      expect(state.loading).toBe(true);

      state = authReducer(state, loginFailure('Error 1'));
      expect(state.error).toBe('Error 1');
      expect(state.loading).toBe(false);

      state = authReducer(state, loginStart());
      expect(state.error).toBe(null);
      expect(state.loading).toBe(true);

      const payload = {
        user: { id: '1', name: 'Test' },
        token: 'token',
      };
      state = authReducer(state, loginSuccess(payload));
      expect(state.isAuthenticated).toBe(true);
      expect(state.loading).toBe(false);
    });

    it('should handle logout when already logged out', () => {
      const state = authReducer(initialState, logout());
      expect(state).toEqual(initialState);
    });
  });
});
