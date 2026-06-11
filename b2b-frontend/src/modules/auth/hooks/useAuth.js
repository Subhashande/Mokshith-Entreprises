import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService.js";
import { 
  loginStart, 
  loginSuccess, 
  loginFailure, 
  updateUser as updateUserAction, 
  logout as logoutAction,
  updateCsrfToken
} from "../authSlice.js";
import { fetchConfigSuccess } from "../../superAdmin/superAdminSlice.js";
import { routes } from "../../../routes/routeConfig.js";
import { useNotification } from "../../../context/NotificationContext.jsx";

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const { user: reduxUser, loading, error, isAuthenticated, csrfToken } = useSelector((state) => state.auth);

  // Auto-fetch CSRF token if authenticated but missing token
  useEffect(() => {
    const fetchCsrf = async () => {
      const token = localStorage.getItem('token');
      const csrf = localStorage.getItem('csrfToken');
      
      if (token && !csrf) {
        try {
          const res = await authService.fetchCsrfToken();
          if (res?.csrfToken) {
            dispatch(updateCsrfToken(res.csrfToken));
          }
        } catch (err) {
          // CSRF fetch failed silently
        }
      }
    };
    
    fetchCsrf();
  }, [isAuthenticated, dispatch]);

  const getUser = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  }, []);

  const user = reduxUser || getUser();

  const updateUserInfo = useCallback((userData) => {
    dispatch(updateUserAction(userData));
  }, [dispatch]);

  const login = useCallback(async (data) => {
    dispatch(loginStart());

    try {
      const responseData = await authService.login(data);
      
      const user = responseData.user;
      const accessToken = responseData.accessToken;

      if (!accessToken || !user) {
        throw new Error("Invalid response format: missing token or user data");
      }

      // Check for Admin Approval
      if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
        if (user.status === "pending" || user.isApproved === false) {
          throw new Error("Your account is pending admin approval. Please wait for an administrator to review your registration.");
        }
        if (user.status === "rejected") {
          throw new Error("Your registration request has been declined. Please contact support for more information.");
        }
      }

      // 1. Update global config if present (fast)
      if (responseData.config) {
        dispatch(fetchConfigSuccess(responseData.config));
      }

      // 2. Dispatch success (updates Redux + localStorage)
      dispatch(loginSuccess({ 
        user, 
        token: accessToken,
        csrfToken: responseData.csrfToken,
        sessionId: responseData.sessionId // Pass sessionId to Redux
      }));
      
      // Show notification if previous session was invalidated
      if (responseData.previousSessionInvalidated) {
        setTimeout(() => {
          showToast('Your previous session on another device has been logged out', 'info', 5000);
        }, 500);
      }
      
      // 3. Immediate redirect to minimize perceived delay
      const redirectPath = (() => {
        switch (user.role) {
          case "SUPER_ADMIN": return routes.SUPER_ADMIN;
          case "ADMIN": return routes.ADMIN;
          case "DELIVERY_PARTNER": return routes.DELIVERY_DASHBOARD;
          case "B2B_CUSTOMER":
          case "B2C_CUSTOMER": return routes.HOME;
          default: return routes.PRODUCTS;
        }
      })();

      navigate(redirectPath, { replace: true });
      return responseData;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : (err.message || "Login failed");
      dispatch(loginFailure(errorMsg));
      throw err;
    }
  }, [dispatch, navigate]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      dispatch(logoutAction());
      navigate(routes.LOGIN, { replace: true });
    }
  }, [dispatch, navigate]);

  return { 
    login, 
    logout, 
    updateUserInfo, 
    loading, 
    error, 
    user, 
    isAuthenticated, 
    getUser 
  };
};