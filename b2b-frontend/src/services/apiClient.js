import axios from "axios";
import { store } from "../app/store.js";
import { updateToken, logout } from "../modules/auth/authSlice.js";

const getBaseURL = () => {
  // Try environment variable first
  const envUrl = import.meta.env.VITE_API_URL;
  
  // 🔥 Dynamic Production Detection (Runtime)
  // This handles cases where Vercel build didn't have env vars set or they were misconfigured
  if (typeof window !== 'undefined') {
    const hostname = window.location?.hostname || '';
    const isProduction = 
      hostname.includes('vercel.app') || 
      hostname.includes('mokshith-entreprises') ||
      (hostname !== 'localhost' && hostname !== '127.0.0.1');

    if (isProduction && (!envUrl || envUrl.includes('localhost'))) {
      return "https://mokshith-entreprises.onrender.com/api/v1";
    }
  }

  const baseUrl = envUrl || "http://localhost:5000";
  const cleanUrl = baseUrl.replace(/\/$/, '');
  return cleanUrl.endsWith('/api/v1') ? cleanUrl : `${cleanUrl}/api/v1`;
};

const API_V1_URL = getBaseURL();
const API_BASE_URL = API_V1_URL.replace(/\/api\/v1$/, '');

const apiClient = axios.create({
  baseURL: API_V1_URL,
  timeout: 30000,
  withCredentials: true, // 🔥 Fix: Send cookies with requests
  headers: {
    "Content-Type": "application/json",
  },
});

export { API_BASE_URL };

// Track if a refresh is already in progress to avoid multiple refresh calls
let isRefreshing = false;
let failedQueue = [];
let isCsrfRefreshing = false;
let csrfFailedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const processCsrfQueue = (error, csrfToken = null) => {
  csrfFailedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(csrfToken);
    }
  });
  csrfFailedQueue = [];
};

// Function to fetch new CSRF token
const fetchCsrfToken = async () => {
  const response = await apiClient.get("/auth/csrf-token");
  const csrfToken = response.data?.csrfToken || response.csrfToken;
  if (csrfToken) {
    localStorage.setItem("csrfToken", csrfToken);
    console.log('CSRF token fetched and stored');
  }
  return csrfToken;
};

// Add a request interceptor to add the auth token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const csrfToken = localStorage.getItem("csrfToken");
    if (csrfToken) {
      config.headers["x-csrf-token"] = csrfToken;
    }
    
    // Handle FormData: browser must set Content-Type with boundary
    if (config.data instanceof FormData) {
      // Remove Content-Type header for FormData
      if (config.headers) {
        if (typeof config.headers.delete === 'function') {
          config.headers.delete("Content-Type");
          config.headers.delete("content-type");
        } else {
          delete config.headers["Content-Type"];
          delete config.headers["content-type"];
        }
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token refresh and common errors
apiClient.interceptors.response.use(
  (response) => {
    // If response contains a csrfToken, store it
    if (response.data?.csrfToken) {
      localStorage.setItem("csrfToken", response.data.csrfToken);
      console.log('CSRF token refreshed from response');
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If the request was to refresh token itself, don't retry!
      if (originalRequest.url.includes('/auth/refresh-token')) {
        store.dispatch(logout());
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // If token refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        // No refresh token, clear auth and redirect
        store.dispatch(logout());
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // Try to refresh the token
      return apiClient
        .post("/auth/refresh-token", { token: refreshToken })
        .then((response) => {
          const newAccessToken = response.data?.accessToken || response.accessToken;

          if (newAccessToken) {
            store.dispatch(updateToken(newAccessToken));
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            processQueue(null, newAccessToken);
            return apiClient(originalRequest);
          } else {
            throw new Error("No access token in response");
          }
        })
        .catch((err) => {
          processQueue(err, null);
          store.dispatch(logout());
          window.location.href = "/login";
          return Promise.reject(err);
        })
        .finally(() => {
          isRefreshing = false;
        });
    }

    // Handle 403 CSRF errors
    if (error.response?.status === 403 && !originalRequest._csrfRetry) {
      const isCsrfError = error.response?.data?.message?.includes('CSRF') || 
                         error.response?.data?.message?.includes('csrf');
      
      if (isCsrfError) {
        console.warn('CSRF error detected, attempting to refresh CSRF token');
        
        if (isCsrfRefreshing) {
          return new Promise((resolve, reject) => {
            csrfFailedQueue.push({ resolve, reject });
          }).then((csrfToken) => {
              originalRequest.headers['x-csrf-token'] = csrfToken;
              originalRequest._csrfRetry = true;
              return apiClient(originalRequest);
            }).catch((err) => Promise.reject(err));
        }
        
        originalRequest._csrfRetry = true;
        isCsrfRefreshing = true;
        
        try {
          const csrfToken = await fetchCsrfToken();
          console.log('Request retried after CSRF recovery');
          processCsrfQueue(null, csrfToken);
          originalRequest.headers['x-csrf-token'] = csrfToken;
          return apiClient(originalRequest);
        } catch (err) {
          processCsrfQueue(err, null);
          console.error('Failed to refresh CSRF token:', err);
          return Promise.reject(err);
        } finally {
          isCsrfRefreshing = false;
        }
      }
    }

    // 🔥 Fix: Reject with the full error object so services can access status/data
    return Promise.reject(error);
  }
);

export default apiClient;
