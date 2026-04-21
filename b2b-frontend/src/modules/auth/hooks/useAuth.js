import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { authService } from "../services/authService";
import { loginStart, loginSuccess, loginFailure, logout as logoutAction } from "../authSlice";
import { fetchConfigSuccess } from "../../superAdmin/superAdminSlice";

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, loading, error, isAuthenticated } = useSelector((state) => state.auth);

  const login = useCallback(async (data) => {
    dispatch(loginStart());

    try {
      const res = await authService.login(data);
      const { user, accessToken, refreshToken, config } = res;

      if (!accessToken) {
        throw new Error("No access token received from server");
      }

      // Check for Admin Approval
      // Admins and Super Admins bypass approval check as they are created by root/system
      if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
        if (user.status === "pending" || user.isApproved === false) {
          throw new Error("Your account is pending admin approval. Please wait for an administrator to review your registration.");
        }
        if (user.status === "rejected") {
          throw new Error("Your registration request has been declined. Please contact support for more information.");
        }
      }

      dispatch(loginSuccess({ user, token: accessToken }));
      
      // Update global config in store if available
      if (config) {
        dispatch(fetchConfigSuccess(config));
      }
      
      // Redirect based on role
      switch (user.role) {
        case "SUPER_ADMIN":
          window.location.href = "/super-admin/dashboard";
          break;
        case "ADMIN":
          window.location.href = "/admin/dashboard";
          break;
        case "DELIVERY_PARTNER":
          window.location.href = "/delivery/dashboard";
          break;
        case "B2B_CUSTOMER":
          window.location.href = "/dashboard";
          break;
        case "B2C_CUSTOMER":
          window.location.href = "/home";
          break;
        default:
          window.location.href = "/products";
      }

      return res;
    } catch (err) {
      dispatch(loginFailure(err.message));
      throw err;
    }
  }, [dispatch]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      dispatch(logoutAction());
      window.location.href = "/login";
    }
  }, [dispatch]);

  const updateUserInfo = useCallback((userData) => {
    dispatch(loginSuccess({ user: userData, token: localStorage.getItem('token') }));
  }, [dispatch]);

  return { login, logout, updateUserInfo, loading, error, user, isAuthenticated };
};