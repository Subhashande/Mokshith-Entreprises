import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '../../../modules/auth/services/authService.js';
import apiClient from '../../../services/apiClient.js';

vi.mock('../../../services/apiClient.js');

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('login', () => {
    it('should login successfully and store tokens', async () => {
      const mockResponse = {
        data: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          csrfToken: 'test-csrf-token',
          sessionId: 'test-session-id',
          user: { id: '1', name: 'John Doe', email: 'john@example.com' },
        },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const payload = { email: 'john@example.com', password: 'password123' };
      const result = await authService.login(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', payload);
      expect(localStorage.getItem('token')).toBe('test-access-token');
      expect(localStorage.getItem('refreshToken')).toBe('test-refresh-token');
      expect(localStorage.getItem('csrfToken')).toBe('test-csrf-token');
      expect(localStorage.getItem('sessionId')).toBe('test-session-id');
      expect(JSON.parse(localStorage.getItem('user'))).toEqual(mockResponse.data.user);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle direct response format', async () => {
      const mockResponse = {
        accessToken: 'token',
        sessionId: 'session-id',
        user: { id: '1', name: 'John' },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.login({ email: 'test@test.com', password: 'pass' });

      expect(localStorage.getItem('token')).toBe('token');
      expect(localStorage.getItem('sessionId')).toBe('session-id');
      expect(result).toEqual(mockResponse);
    });

    it('should throw error on login failure', async () => {
      const error = {
        response: { data: { message: 'Invalid credentials' } },
      };

      apiClient.post.mockRejectedValue(error);

      await expect(authService.login({ email: 'wrong@test.com', password: 'wrong' }))
        .rejects.toThrow('Invalid credentials');
    });

    it('should handle generic error message', async () => {
      apiClient.post.mockRejectedValue(new Error('Network error'));

      await expect(authService.login({ email: 'test@test.com', password: 'pass' }))
        .rejects.toThrow('Network error');
    });

    it('should handle error without message', async () => {
      apiClient.post.mockRejectedValue({});

      await expect(authService.login({ email: 'test@test.com', password: 'pass' }))
        .rejects.toThrow('Login failed');
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      const mockResponse = {
        data: { message: 'User registered successfully', userId: '123' },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const payload = { name: 'John', email: 'john@example.com', password: 'password123' };
      const result = await authService.register(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', payload);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle direct response format', async () => {
      const mockResponse = { message: 'Success', userId: '456' };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.register({ name: 'Jane', email: 'jane@test.com' });

      expect(result).toEqual(mockResponse);
    });

    it('should throw error on registration failure', async () => {
      const error = {
        response: { data: { message: 'Email already exists' } },
      };

      apiClient.post.mockRejectedValue(error);

      await expect(authService.register({ email: 'duplicate@test.com' }))
        .rejects.toThrow('Email already exists');
    });

    it('should handle generic registration error', async () => {
      apiClient.post.mockRejectedValue(new Error('Server error'));

      await expect(authService.register({ email: 'test@test.com' }))
        .rejects.toThrow('Server error');
    });

    it('should use default error message when no message provided', async () => {
      apiClient.post.mockRejectedValue({});

      await expect(authService.register({ email: 'test@test.com' }))
        .rejects.toThrow('Registration failed');
    });
  });

  describe('logout', () => {
    it('should logout successfully and clear storage', async () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('refreshToken', 'test-refresh');
      localStorage.setItem('user', JSON.stringify({ id: '1' }));
      localStorage.setItem('sessionId', 'test-session');

      apiClient.post.mockResolvedValue({});

      await authService.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'test-refresh' });
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('sessionId')).toBeNull();
    });

    it('should clear storage even if API call fails', async () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('refreshToken', 'test-refresh');
      localStorage.setItem('user', JSON.stringify({ id: '1' }));
      localStorage.setItem('sessionId', 'test-session');

      apiClient.post.mockRejectedValue(new Error('API error'));

      await expect(authService.logout()).rejects.toThrow('Logout failed');

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('sessionId')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should handle network errors', async () => {
      apiClient.post.mockRejectedValue(new Error('Network unavailable'));

      await expect(authService.logout()).rejects.toThrow('Logout failed');
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      const mockResponse = {
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.refreshToken('old-refresh-token');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh-token', { refreshToken: 'old-refresh-token' });
      expect(localStorage.getItem('token')).toBe('new-access-token');
      expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle direct response format', async () => {
      const mockResponse = {
        accessToken: 'token',
        refreshToken: 'refresh',
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.refreshToken('old-token');

      expect(result).toEqual(mockResponse);
    });

    it('should clear storage on refresh failure', async () => {
      localStorage.setItem('token', 'old-token');
      localStorage.setItem('refreshToken', 'old-refresh');
      localStorage.setItem('user', JSON.stringify({ id: '1' }));

      apiClient.post.mockRejectedValue(new Error('Refresh failed'));

      await expect(authService.refreshToken('invalid-token')).rejects.toThrow();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should handle API errors', async () => {
      apiClient.post.mockRejectedValue(new Error('Token expired'));

      await expect(authService.refreshToken('expired-token')).rejects.toThrow();
    });
  });

  describe('fetchCsrfToken', () => {
    it('should fetch and store CSRF token successfully', async () => {
      const mockResponse = {
        data: { csrfToken: 'test-csrf-token' },
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await authService.fetchCsrfToken();

      expect(apiClient.get).toHaveBeenCalledWith('/auth/csrf-token');
      expect(localStorage.getItem('csrfToken')).toBe('test-csrf-token');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle direct response format', async () => {
      const mockResponse = { csrfToken: 'csrf-123' };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await authService.fetchCsrfToken();

      expect(localStorage.getItem('csrfToken')).toBe('csrf-123');
      expect(result).toEqual(mockResponse);
    });

    it('should return null on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      apiClient.get.mockRejectedValue(new Error('CSRF fetch failed'));

      const result = await authService.fetchCsrfToken();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch CSRF token:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should not store token on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      apiClient.get.mockRejectedValue(new Error('Error'));

      await authService.fetchCsrfToken();

      expect(localStorage.getItem('csrfToken')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle missing data in response', async () => {
      apiClient.post.mockResolvedValue({});

      const result = await authService.login({ email: 'test@test.com', password: 'pass' });

      expect(result).toEqual({});
    });

    it('should handle null response', async () => {
      apiClient.post.mockResolvedValue(null);

      const result = await authService.login({ email: 'test@test.com', password: 'pass' });

      expect(result).toBeNull();
    });

    it('should handle partial token data', async () => {
      const mockResponse = {
        data: { accessToken: 'token-only' },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      await authService.login({ email: 'test@test.com', password: 'pass' });

      expect(localStorage.getItem('token')).toBe('token-only');
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });
});
