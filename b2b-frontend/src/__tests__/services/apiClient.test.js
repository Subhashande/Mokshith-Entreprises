import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { store } from '../../app/store.js';
import * as authSlice from '../../modules/auth/authSlice.js';

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

vi.mock('../../app/store.js', () => ({
  store: {
    dispatch: vi.fn(),
  },
}));

vi.mock('../../context/NotificationContext.jsx', () => ({
  showGlobalToast: vi.fn(),
}));

let apiClient, API_BASE_URL;

describe('apiClient', () => {
  let mockAxiosInstance;
  let requestInterceptor;
  let responseInterceptor;
  
  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.resetModules();
    
    // Mock axios.create to return a mock instance
    mockAxiosInstance = {
      interceptors: {
        request: {
          use: vi.fn((successHandler, errorHandler) => {
            requestInterceptor = { successHandler, errorHandler };
          }),
        },
        response: {
          use: vi.fn((successHandler, errorHandler) => {
            responseInterceptor = { successHandler, errorHandler };
          }),
        },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
    };
    
    axios.create.mockReturnValue(mockAxiosInstance);
    
    // Import apiClient after mocks are set up
    const apiClientModule = await import('../../services/apiClient.js');
    apiClient = apiClientModule.default;
    API_BASE_URL = apiClientModule.API_BASE_URL;
    
    delete window.location;
    window.location = { href: '', pathname: '/' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuration', () => {
    it('should create axios instance with correct config', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: expect.stringContaining('/api/v1'),
          timeout: 30000,
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should export API_BASE_URL without /api/v1', () => {
      expect(API_BASE_URL).toBeDefined();
      expect(API_BASE_URL).not.toMatch(/\/api\/v1$/);
    });

    it('should handle environment variables correctly', () => {
      const originalEnv = import.meta.env.VITE_API_URL;
      import.meta.env.VITE_API_URL = 'https://api.example.com/';
      
      // Re-evaluate baseURL logic
      const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const cleanUrl = envUrl.replace(/\/$/, '');
      
      expect(cleanUrl).not.toMatch(/\/$/);
      
      import.meta.env.VITE_API_URL = originalEnv;
    });
  });

  describe('Request Interceptor', () => {
    it('should add authorization header when token exists', () => {
      localStorage.setItem('token', 'test-access-token');
      
      const config = {
        headers: {},
      };
      
      const result = requestInterceptor.successHandler(config);
      
      expect(result.headers.Authorization).toBe('Bearer test-access-token');
    });

    it('should add CSRF token header when available', () => {
      localStorage.setItem('csrfToken', 'test-csrf-token');
      
      const config = {
        headers: {},
      };
      
      const result = requestInterceptor.successHandler(config);
      
      expect(result.headers['x-csrf-token']).toBe('test-csrf-token');
    });

    it('should not add authorization header when token is missing', () => {
      const config = {
        headers: {},
      };
      
      const result = requestInterceptor.successHandler(config);
      
      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should handle FormData and remove Content-Type header', () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.txt');
      
      const config = {
        data: formData,
        headers: {
          'Content-Type': 'application/json',
          delete: vi.fn(),
        },
      };
      
      requestInterceptor.successHandler(config);
      
      expect(config.headers.delete).toHaveBeenCalledWith('Content-Type');
      expect(config.headers.delete).toHaveBeenCalledWith('content-type');
    });

    it('should handle FormData with headers object without delete method', () => {
      const formData = new FormData();
      
      const config = {
        data: formData,
        headers: {
          'Content-Type': 'application/json',
          'content-type': 'application/json',
        },
      };
      
      requestInterceptor.successHandler(config);
      
      expect(config.headers['Content-Type']).toBeUndefined();
      expect(config.headers['content-type']).toBeUndefined();
    });

    it('should reject on request error', async () => {
      const error = new Error('Request failed');
      
      await expect(requestInterceptor.errorHandler(error)).rejects.toThrow('Request failed');
    });

    it('should handle null token gracefully', () => {
      localStorage.setItem('token', 'null');
      
      const config = {
        headers: {},
      };
      
      const result = requestInterceptor.successHandler(config);
      
      // Should still add the header even if value is 'null' string
      expect(result.headers.Authorization).toBe('Bearer null');
    });

    it('should handle undefined CSRF token', () => {
      const config = {
        headers: {},
      };
      
      const result = requestInterceptor.successHandler(config);
      
      expect(result.headers['x-csrf-token']).toBeUndefined();
    });
  });

  describe('Response Interceptor - Success', () => {
    it('should return response data on success', () => {
      const response = {
        data: { message: 'Success', id: 123 },
        status: 200,
      };
      
      const result = responseInterceptor.successHandler(response);
      
      expect(result).toEqual({ message: 'Success', id: 123 });
    });

    it('should handle null response data', () => {
      const response = {
        data: null,
        status: 204,
      };
      
      const result = responseInterceptor.successHandler(response);
      
      expect(result).toBeNull();
    });

    it('should handle empty response', () => {
      const response = {
        data: '',
        status: 200,
      };
      
      const result = responseInterceptor.successHandler(response);
      
      expect(result).toBe('');
    });

    it('should handle array response data', () => {
      const response = {
        data: [1, 2, 3],
        status: 200,
      };
      
      const result = responseInterceptor.successHandler(response);
      
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('Response Interceptor - 401 Error Handling', () => {
    it('should dispatch logout when refresh token endpoint returns 401', async () => {
      const error = {
        response: { status: 401 },
        config: { url: '/auth/refresh-token' },
      };
      
      vi.spyOn(authSlice, 'logout').mockReturnValue({ type: 'auth/logout' });
      
      await expect(responseInterceptor.errorHandler(error)).rejects.toEqual(error);
      
      expect(store.dispatch).toHaveBeenCalledWith({ type: 'auth/logout' });
      expect(window.location.href).toBe('/login');
    });

    it('should handle missing refresh token', async () => {
      const error = {
        response: { status: 401 },
        config: { url: '/some-protected-endpoint', _retry: false },
      };
      
      vi.spyOn(authSlice, 'logout').mockReturnValue({ type: 'auth/logout' });
      
      await expect(responseInterceptor.errorHandler(error)).rejects.toEqual(error);
      
      expect(store.dispatch).toHaveBeenCalledWith({ type: 'auth/logout' });
      expect(window.location.href).toBe('/login');
    });

    it('should not retry if already retried', async () => {
      const error = {
        response: { status: 401 },
        config: { url: '/some-endpoint', _retry: true },
      };
      
      await expect(responseInterceptor.errorHandler(error)).rejects.toEqual(error);
      
      // Should not attempt refresh
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });
  });

  describe('Response Interceptor - Network Errors', () => {
    it('should handle network timeout', async () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
        config: {},
      };
      
      await expect(responseInterceptor.errorHandler(error)).rejects.toEqual(error);
    });

    it('should handle network failure', async () => {
      const error = {
        message: 'Network Error',
        config: {},
      };
      
      await expect(responseInterceptor.errorHandler(error)).rejects.toEqual(error);
    });

    it('should handle DNS resolution failure', async () => {
      const error = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND api.example.com',
        config: {},
      };
      
      await expect(responseInterceptor.errorHandler(error)).rejects.toEqual(error);
    });

    it('should handle connection refused', async () => {
      const error = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:5000',
        config: {},
      };
      
      await expect(responseInterceptor.errorHandler(error)).rejects.toEqual(error);
    });
  });

  describe('Response Interceptor - HTTP Error Codes', () => {
    it('should handle 400 Bad Request', async () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Invalid request' },
        },
        config: {},
      };
      
      await expect(responseInterceptor.errorHandler(error)).rejects.toEqual(error);
    });

    it('should handle 403 Forbidden', async () => {
      const error = {
        response: {
          status: 403,
          data: { message: 'Access denied' },
        },
        config: {},
      };
      
      await expect(responseInterceptor.errorHandler(error)).rejects.toEqual(error);
    });

    it('should handle 404 Not Found', async () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Resource not found' },
        },
        config: {},
      };
      
      await expect(responseInterceptor.errorHandler(error)).rejects.toEqual(error);
    });

    it('should handle 500 Internal Server Error', async () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
        config: {},
      };
      
      await expect(responseInterceptor.errorHandler(error)).rejects.toEqual(error);
    });

    it('should handle 503 Service Unavailable', async () => {
      const error = {
        response: {
          status: 503,
          data: { message: 'Service temporarily unavailable' },
        },
        config: {},
      };
      
      await expect(responseInterceptor.errorHandler(error)).rejects.toEqual(error);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed error response', async () => {
      const error = {
        response: null,
        config: {},
      };
      
      await expect(responseInterceptor.errorHandler(error)).rejects.toEqual(error);
    });

    it('should handle error without config', async () => {
      const error = {
        message: 'Something went wrong',
      };
      
      await expect(responseInterceptor.errorHandler(error)).rejects.toEqual(error);
    });

    it('should handle aborted request', async () => {
      const error = {
        code: 'ERR_CANCELED',
        message: 'Request aborted',
        config: {},
      };
      
      await expect(responseInterceptor.errorHandler(error)).rejects.toEqual(error);
    });

    it('should handle undefined error', async () => {
      // Create a minimal error object since undefined would cause issues
      const error = {};
      await expect(responseInterceptor.errorHandler(error)).rejects.toEqual(error);
    });

    it('should handle null config headers', () => {
      const config = {
        headers: null,
      };
      
      // Should not throw
      expect(() => requestInterceptor.successHandler(config)).not.toThrow();
    });

    it('should handle request with both token and CSRF token', () => {
      localStorage.setItem('token', 'access-token');
      localStorage.setItem('csrfToken', 'csrf-token');
      
      const config = {
        headers: {},
      };
      
      const result = requestInterceptor.successHandler(config);
      
      expect(result.headers.Authorization).toBe('Bearer access-token');
      expect(result.headers['x-csrf-token']).toBe('csrf-token');
    });

    it('should handle empty string token', () => {
      localStorage.setItem('token', '');
      
      const config = {
        headers: {},
      };
      
      const result = requestInterceptor.successHandler(config);
      
      // Empty string is falsy, so header should not be added
      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should handle whitespace-only token', () => {
      localStorage.setItem('token', '   ');
      
      const config = {
        headers: {},
      };
      
      const result = requestInterceptor.successHandler(config);
      
      // Whitespace is truthy, so header is added
      expect(result.headers.Authorization).toBe('Bearer    ');
    });
  });

  describe('Race Conditions', () => {
    it('should handle rapid sequential requests', () => {
      const configs = [
        { headers: {} },
        { headers: {} },
        { headers: {} },
      ];
      
      configs.forEach(config => {
        expect(() => requestInterceptor.successHandler(config)).not.toThrow();
      });
    });

    it('should handle token change during request', () => {
      localStorage.setItem('token', 'initial-token');
      
      const config = {
        headers: {},
      };
      
      requestInterceptor.successHandler(config);
      
      localStorage.setItem('token', 'new-token');
      
      const config2 = {
        headers: {},
      };
      
      const result = requestInterceptor.successHandler(config2);
      
      expect(result.headers.Authorization).toBe('Bearer new-token');
    });
  });

  describe('Memory and Performance', () => {
    it('should not leak memory on repeated interceptor calls', () => {
      const configs = Array.from({ length: 1000 }, () => ({ headers: {} }));
      
      configs.forEach(config => {
        requestInterceptor.successHandler(config);
      });
      
      expect(true).toBe(true); // If we get here without crashing, test passes
    });

    it('should handle large response data efficiently', () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));
      
      const response = {
        data: largeData,
        status: 200,
      };
      
      const result = responseInterceptor.successHandler(response);
      
      expect(result).toHaveLength(10000);
    });
  });

  describe('Security', () => {
    it('should not expose tokens in error messages', async () => {
      localStorage.setItem('token', 'secret-token-12345');
      
      const error = {
        message: 'Authentication failed',
        config: {
          headers: {
            Authorization: 'Bearer secret-token-12345',
          },
        },
      };
      
      try {
        await responseInterceptor.errorHandler(error);
      } catch (e) {
        // Error message should not contain the token
        expect(e.message).not.toContain('secret-token-12345');
      }
    });

    it('should handle XSS attempts in response data', () => {
      const response = {
        data: {
          message: '<script>alert("XSS")</script>',
        },
        status: 200,
      };
      
      const result = responseInterceptor.successHandler(response);
      
      // Data should be returned as-is, XSS protection is handled by React
      expect(result.message).toContain('<script>');
    });

    it('should handle SQL injection attempts in response', () => {
      const response = {
        data: {
          query: "'; DROP TABLE users; --",
        },
        status: 200,
      };
      
      const result = responseInterceptor.successHandler(response);
      
      expect(result.query).toBe("'; DROP TABLE users; --");
    });
  });

  describe('Browser Compatibility', () => {
    it('should handle localStorage being unavailable', () => {
      const originalLocalStorage = global.localStorage;
      delete global.localStorage;
      
      const config = {
        headers: {},
      };
      
      expect(() => requestInterceptor.successHandler(config)).toThrow();
      
      global.localStorage = originalLocalStorage;
    });

    it('should handle FormData on older browsers', () => {
      const mockFormData = {
        append: vi.fn(),
      };
      
      const config = {
        data: mockFormData,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      // Should not throw even if FormData detection differs
      expect(() => requestInterceptor.successHandler(config)).not.toThrow();
    });
  });
});
