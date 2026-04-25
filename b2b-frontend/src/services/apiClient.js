import axios from "axios";
import { store } from "../app/store";
import { updateToken, logout } from "../modules/auth/authSlice";

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  
  // If the URL already ends with /api/v1, use it as is
  if (envUrl.endsWith('/api/v1')) {
    return envUrl;
  }
  
  // If it ends with /api, just append /v1
  if (envUrl.endsWith('/api')) {
    return `${envUrl}/v1`;
  }
  
  // Otherwise append /api/v1
  return `${envUrl.replace(/\/$/, '')}/api/v1`;
};

const API_BASE_URL = getBaseURL();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Track if a refresh is already in progress to avoid multiple refresh calls
let isRefreshing = false;
let failedQueue = [];

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

// Add a request interceptor to add the auth token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    return response.data;
  },
  (error) => {
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

    // Handle other errors
    if (error.response?.status === 403) {
      window.location.href = "/unauthorized";
    }

    return Promise.reject(error.response?.data?.message || error.message || "Something went wrong");
  }
);

export default apiClient;
