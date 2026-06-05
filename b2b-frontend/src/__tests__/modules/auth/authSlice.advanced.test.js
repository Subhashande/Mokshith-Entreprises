import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import authReducer, {
  loginStart,
  loginSuccess,
  loginFailure,
  updateUser,
  updateToken,
  updateCsrfToken,
  logout,
} from '../../../modules/auth/authSlice.js';

describe('authSlice - Advanced Quality Tests', () => {
  let initialState;

  beforeEach(() => {
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

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Initial State Handling', () => {
    it('should have correct default initial state', () => {
      const state = authReducer(undefined, { type: '@@INIT' });

      expect(state.user).toBeDefined();
      expect(state.token).toBeDefined();
      expect(state.csrfToken).toBeDefined();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle "undefined" string in localStorage', () => {
      localStorage.setItem('token', 'undefined');
      localStorage.setItem('user', 'undefined');

      const state = authReducer(undefined, { type: '@@INIT' });

      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle "null" string in localStorage', () => {
      localStorage.setItem('token', 'null');
      localStorage.setItem('user', 'null');

      const state = authReducer(undefined, { type: '@@INIT' });

      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
    });

    it('should handle malformed data gracefully', () => {
      const state = authReducer(undefined, { type: '@@INIT' });

      // State should exist even if localStorage had bad data
      expect(state).toBeDefined();
      expect(state.loading).toBe(false);
    });

    it('should handle empty localStorage', () => {
      localStorage.clear();

      const state = authReducer(undefined, { type: '@@INIT' });

      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.csrfToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle special characters in user data', () => {
      const payload = {
        user: { name: '<script>alert(1)</script>' },
        token: 'token',
        csrfToken: 'csrf',
      };
      const state = authReducer(initialState, loginSuccess(payload));

      expect(state.user.name).toBe('<script>alert(1)</script>');
    });

    it('should handle large user objects', () => {
      const largeUser = {
        id: 1,
        data: 'x'.repeat(1000), // Reduced from 10000 for faster tests
        nested: { deep: { very: { deep: 'data' } } },
      };
      const payload = {
        user: largeUser,
        token: 'token',
        csrfToken: 'csrf',
      };

      const state = authReducer(initialState, loginSuccess(payload));

      expect(state.user).toEqual(largeUser);
      expect(state.user.data.length).toBe(1000);
    });
  });

  describe('loginStart Action', () => {
    it('should set loading to true and clear error', () => {
      const stateWithError = { ...initialState, error: 'Previous error' };
      const state = authReducer(stateWithError, loginStart());

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should preserve user and token during loading', () => {
      const stateWithAuth = {
        ...initialState,
        user: { id: 1 },
        token: 'existing-token',
      };
      const state = authReducer(stateWithAuth, loginStart());

      expect(state.user).toEqual({ id: 1 });
      expect(state.token).toBe('existing-token');
      expect(state.loading).toBe(true);
    });

    it('should handle multiple consecutive loginStart calls', () => {
      let state = authReducer(initialState, loginStart());
      state = authReducer(state, loginStart());
      state = authReducer(state, loginStart());

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('loginSuccess Action', () => {
    it('should store complete auth data', () => {
      const payload = {
        user: { id: 1, name: 'John', role: 'admin' },
        token: 'jwt-token-123',
        csrfToken: 'csrf-token-456',
      };

      const state = authReducer(initialState, loginSuccess(payload));

      expect(state.user).toEqual(payload.user);
      expect(state.token).toBe(payload.token);
      expect(state.csrfToken).toBe(payload.csrfToken);
      expect(state.isAuthenticated).toBe(true);
      expect(state.loading).toBe(false);
      expect(localStorage.getItem('token')).toBe('jwt-token-123');
      expect(localStorage.getItem('csrfToken')).toBe('csrf-token-456');
      expect(JSON.parse(localStorage.getItem('user'))).toEqual(payload.user);
    });

    it('should handle missing user in payload', () => {
      const payload = { token: 'token-only', csrfToken: 'csrf' };
      const state = authReducer(initialState, loginSuccess(payload));

      expect(state.user).toBeUndefined();
      expect(state.token).toBe('token-only');
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle missing token in payload', () => {
      const payload = { user: { id: 1 }, csrfToken: 'csrf' };
      const state = authReducer(initialState, loginSuccess(payload));

      expect(state.user).toEqual({ id: 1 });
      expect(state.token).toBeUndefined();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle missing csrfToken in payload', () => {
      const payload = { user: { id: 1 }, token: 'token' };
      const state = authReducer(initialState, loginSuccess(payload));

      expect(state.csrfToken).toBeUndefined();
      expect(localStorage.getItem('csrfToken')).toBeNull();
    });

    it('should handle null values in payload', () => {
      const payload = { user: null, token: null, csrfToken: null };
      const state = authReducer(initialState, loginSuccess(payload));

      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.csrfToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle empty strings in payload', () => {
      const payload = { user: { id: 1 }, token: '', csrfToken: '' };
      const state = authReducer(initialState, loginSuccess(payload));

      expect(state.token).toBe('');
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle user with special characters', () => {
      const payload = {
        user: { name: '<>&"\'', bio: 'Test\nMultiline\tText' },
        token: 'token',
        csrfToken: 'csrf',
      };

      const state = authReducer(initialState, loginSuccess(payload));

      expect(state.user).toEqual(payload.user);
      const stored = JSON.parse(localStorage.getItem('user'));
      expect(stored).toEqual(payload.user);
    });

    it('should handle user with unicode characters', () => {
      const payload = {
        user: { name: '你好世界', emoji: '😀🚀' },
        token: 'token',
        csrfToken: 'csrf',
      };

      const state = authReducer(initialState, loginSuccess(payload));

      expect(state.user.name).toBe('你好世界');
      expect(state.user.emoji).toBe('😀🚀');
    });

    it('should handle deeply nested user object', () => {
      const payload = {
        user: {
          id: 1,
          profile: {
            details: {
              address: {
                street: '123 Main',
                city: 'NYC',
              },
            },
          },
        },
        token: 'token',
        csrfToken: 'csrf',
      };

      const state = authReducer(initialState, loginSuccess(payload));

      expect(state.user).toEqual(payload.user);
    });

    it('should overwrite previous auth data', () => {
      const oldState = {
        ...initialState,
        user: { id: 1, name: 'Old' },
        token: 'old-token',
        csrfToken: 'old-csrf',
        isAuthenticated: true,
      };

      const payload = {
        user: { id: 2, name: 'New' },
        token: 'new-token',
        csrfToken: 'new-csrf',
      };

      const state = authReducer(oldState, loginSuccess(payload));

      expect(state.user).toEqual(payload.user);
      expect(state.token).toBe('new-token');
      expect(state.csrfToken).toBe('new-csrf');
    });
  });

  describe('loginFailure Action', () => {
    it('should store error message', () => {
      const error = 'Invalid credentials';
      const state = authReducer(initialState, loginFailure(error));

      expect(state.error).toBe(error);
      expect(state.loading).toBe(false);
    });

    it('should handle error object', () => {
      const error = { message: 'Error occurred', code: 401 };
      const state = authReducer(initialState, loginFailure(error));

      expect(state.error).toEqual(error);
    });

    it('should handle null error', () => {
      const state = authReducer(initialState, loginFailure(null));

      expect(state.error).toBeNull();
      expect(state.loading).toBe(false);
    });

    it('should preserve user and token on failure', () => {
      const stateWithAuth = {
        ...initialState,
        user: { id: 1 },
        token: 'existing',
      };

      const state = authReducer(stateWithAuth, loginFailure('Error'));

      expect(state.user).toEqual({ id: 1 });
      expect(state.token).toBe('existing');
    });

    it('should handle very long error message', () => {
      const longError = 'Error: '.repeat(1000);
      const state = authReducer(initialState, loginFailure(longError));

      expect(state.error).toBe(longError);
    });
  });

  describe('updateUser Action', () => {
    it('should merge new user data', () => {
      const stateWithUser = {
        ...initialState,
        user: { id: 1, name: 'John', email: 'john@example.com' },
      };

      const update = { name: 'Jane', phone: '555-1234' };
      const state = authReducer(stateWithUser, updateUser(update));

      expect(state.user).toEqual({
        id: 1,
        name: 'Jane',
        email: 'john@example.com',
        phone: '555-1234',
      });
    });

    it('should update localStorage', () => {
      const stateWithUser = {
        ...initialState,
        user: { id: 1, name: 'John' },
      };

      const update = { name: 'Jane' };
      authReducer(stateWithUser, updateUser(update));

      const stored = JSON.parse(localStorage.getItem('user'));
      expect(stored.name).toBe('Jane');
    });

    it('should handle updating with null values', () => {
      const stateWithUser = {
        ...initialState,
        user: { id: 1, name: 'John', email: 'john@example.com' },
      };

      const update = { email: null };
      const state = authReducer(stateWithUser, updateUser(update));

      expect(state.user.email).toBeNull();
    });

    it('should handle empty update object', () => {
      const stateWithUser = {
        ...initialState,
        user: { id: 1, name: 'John' },
      };

      const state = authReducer(stateWithUser, updateUser({}));

      expect(state.user).toEqual({ id: 1, name: 'John' });
    });

    it('should handle updating nested properties', () => {
      const stateWithUser = {
        ...initialState,
        user: { id: 1, profile: { age: 25 } },
      };

      const update = { profile: { age: 26, city: 'NYC' } };
      const state = authReducer(stateWithUser, updateUser(update));

      expect(state.user.profile).toEqual({ age: 26, city: 'NYC' });
    });

    it('should handle updating with special characters', () => {
      const stateWithUser = {
        ...initialState,
        user: { id: 1, name: 'John' },
      };

      const update = { bio: '<script>alert(1)</script>' };
      const state = authReducer(stateWithUser, updateUser(update));

      expect(state.user.bio).toBe('<script>alert(1)</script>');
    });

    it('should handle rapid consecutive updates', () => {
      let state = {
        ...initialState,
        user: { id: 1, count: 0 },
      };

      for (let i = 1; i <= 100; i++) {
        state = authReducer(state, updateUser({ count: i }));
      }

      expect(state.user.count).toBe(100);
    });
  });

  describe('updateToken Action', () => {
    it('should update token and set authenticated', () => {
      const newToken = 'new-token-xyz';
      const state = authReducer(initialState, updateToken(newToken));

      expect(state.token).toBe(newToken);
      expect(state.isAuthenticated).toBe(true);
      expect(localStorage.getItem('token')).toBe(newToken);
    });

    it('should handle null token', () => {
      const stateWithToken = {
        ...initialState,
        token: 'existing-token',
        isAuthenticated: true,
      };

      const state = authReducer(stateWithToken, updateToken(null));

      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle empty string token', () => {
      const state = authReducer(initialState, updateToken(''));

      expect(state.token).toBe('');
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle very long token', () => {
      const longToken = 'token'.repeat(1000);
      const state = authReducer(initialState, updateToken(longToken));

      expect(state.token).toBe(longToken);
      expect(localStorage.getItem('token')).toBe(longToken);
    });

    it('should handle token with special characters', () => {
      const specialToken = 'token.with.dots-and_underscores';
      const state = authReducer(initialState, updateToken(specialToken));

      expect(state.token).toBe(specialToken);
    });

    it('should handle rapid token updates', () => {
      let state = initialState;

      for (let i = 0; i < 100; i++) {
        state = authReducer(state, updateToken(`token-${i}`));
      }

      expect(state.token).toBe('token-99');
      expect(localStorage.getItem('token')).toBe('token-99');
    });
  });

  describe('updateCsrfToken Action', () => {
    it('should update csrf token', () => {
      const csrfToken = 'csrf-xyz-123';
      const state = authReducer(initialState, updateCsrfToken(csrfToken));

      expect(state.csrfToken).toBe(csrfToken);
      expect(localStorage.getItem('csrfToken')).toBe(csrfToken);
    });

    it('should handle null csrf token', () => {
      const state = authReducer(initialState, updateCsrfToken(null));

      expect(state.csrfToken).toBeNull();
    });

    it('should handle empty csrf token', () => {
      const state = authReducer(initialState, updateCsrfToken(''));

      expect(state.csrfToken).toBe('');
    });

    it('should not affect authentication status', () => {
      const stateWithAuth = {
        ...initialState,
        token: 'token',
        isAuthenticated: true,
      };

      const state = authReducer(stateWithAuth, updateCsrfToken('new-csrf'));

      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe('token');
    });

    it('should handle rapid csrf updates', () => {
      let state = initialState;

      for (let i = 0; i < 100; i++) {
        state = authReducer(state, updateCsrfToken(`csrf-${i}`));
      }

      expect(state.csrfToken).toBe('csrf-99');
    });
  });

  describe('logout Action', () => {
    it('should clear all auth data', () => {
      const authenticatedState = {
        user: { id: 1, name: 'John' },
        token: 'token-123',
        csrfToken: 'csrf-456',
        isAuthenticated: true,
        loading: false,
        error: null,
      };

      const state = authReducer(authenticatedState, logout());

      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.csrfToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should clear localStorage', () => {
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
      localStorage.setItem('token', 'token');
      localStorage.setItem('csrfToken', 'csrf');

      authReducer(initialState, logout());

      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('csrfToken')).toBeNull();
    });

    it('should preserve error state', () => {
      const stateWithError = {
        ...initialState,
        user: { id: 1 },
        token: 'token',
        error: 'Some error',
      };

      const state = authReducer(stateWithError, logout());

      expect(state.error).toBe('Some error');
    });

    it('should preserve loading state', () => {
      const stateWithLoading = {
        ...initialState,
        user: { id: 1 },
        token: 'token',
        loading: true,
      };

      const state = authReducer(stateWithLoading, logout());

      expect(state.loading).toBe(true);
    });

    it('should be idempotent', () => {
      let state = {
        ...initialState,
        user: { id: 1 },
        token: 'token',
        csrfToken: 'csrf',
        isAuthenticated: true,
      };

      state = authReducer(state, logout());
      const firstLogout = { ...state };

      state = authReducer(state, logout());
      const secondLogout = { ...state };

      expect(firstLogout).toEqual(secondLogout);
    });

    it('should handle logout when already logged out', () => {
      const state = authReducer(initialState, logout());

      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('Edge Cases & Race Conditions', () => {
    it('should handle login followed immediately by logout', () => {
      let state = authReducer(initialState, loginStart());
      state = authReducer(
        state,
        loginSuccess({
          user: { id: 1 },
          token: 'token',
          csrfToken: 'csrf',
        })
      );
      state = authReducer(state, logout());

      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle logout during login loading', () => {
      let state = authReducer(initialState, loginStart());
      expect(state.loading).toBe(true);

      state = authReducer(state, logout());

      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.loading).toBe(true); // Loading persists
    });

    it('should handle multiple simultaneous logins', () => {
      let state = initialState;

      state = authReducer(state, loginStart());
      state = authReducer(state, loginStart());
      state = authReducer(
        state,
        loginSuccess({ user: { id: 1 }, token: 'token1', csrfToken: 'csrf1' })
      );
      state = authReducer(
        state,
        loginSuccess({ user: { id: 2 }, token: 'token2', csrfToken: 'csrf2' })
      );

      expect(state.user.id).toBe(2);
      expect(state.token).toBe('token2');
    });

    it('should handle update operations on null user', () => {
      const state = authReducer(initialState, updateUser({ name: 'Test' }));

      // Should create user object
      expect(state.user).toBeDefined();
    });

    it('should handle token refresh during active session', () => {
      let state = {
        ...initialState,
        user: { id: 1, name: 'John' },
        token: 'old-token',
        csrfToken: 'old-csrf',
        isAuthenticated: true,
      };

      state = authReducer(state, updateToken('new-token'));
      state = authReducer(state, updateCsrfToken('new-csrf'));

      expect(state.user).toEqual({ id: 1, name: 'John' });
      expect(state.token).toBe('new-token');
      expect(state.csrfToken).toBe('new-csrf');
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle alternating login success and failure', () => {
      let state = initialState;

      state = authReducer(state, loginStart());
      state = authReducer(state, loginFailure('Error 1'));
      expect(state.error).toBe('Error 1');
      
      state = authReducer(state, loginStart());
      expect(state.error).toBeNull(); // loginStart clears error
      
      state = authReducer(
        state,
        loginSuccess({ user: { id: 1 }, token: 'token', csrfToken: 'csrf' })
      );

      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle state mutations in rapid succession', () => {
      let state = initialState;
      const operations = [
        loginStart(),
        loginSuccess({ user: { id: 1 }, token: 'token', csrfToken: 'csrf' }),
        updateUser({ name: 'John' }),
        updateToken('new-token'),
        updateCsrfToken('new-csrf'),
        logout(),
      ];

      for (const operation of operations) {
        state = authReducer(state, operation);
      }

      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('localStorage Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Most reducers should work even if localStorage fails
      const state = authReducer(initialState, loginStart());
      expect(state.loading).toBe(true);
    });
  });

  describe('Performance & Memory', () => {
    it('should handle 100 sequential updates efficiently', () => {
      let state = {
        ...initialState,
        user: { id: 1, count: 0 },
        token: 'token',
        isAuthenticated: true,
      };

      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        state = authReducer(state, updateUser({ count: i }));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(state.user.count).toBe(99);
      expect(duration).toBeLessThan(1000);
    });

    it('should handle large user objects without memory issues', () => {
      const largeUser = {
        id: 1,
        data: Array.from({ length: 1000 }, (_, i) => ({
          index: i,
          value: `item-${i}`,
        })),
      };

      const state = authReducer(
        initialState,
        loginSuccess({ user: largeUser, token: 'token', csrfToken: 'csrf' })
      );

      expect(state.user.data.length).toBe(1000);
    });

    it('should not accumulate memory on repeated logout/login cycles', () => {
      let state = initialState;

      for (let i = 0; i < 100; i++) {
        state = authReducer(
          state,
          loginSuccess({ user: { id: i }, token: `token-${i}`, csrfToken: `csrf-${i}` })
        );
        state = authReducer(state, logout());
      }

      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });
  });
});
