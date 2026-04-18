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

      dispatch(loginSuccess({ user: res.user, token: res.token }));
      
      // Update global config in store if available
      if (res.config) {
        dispatch(fetchConfigSuccess(res.config));
      }
      
      // Redirect based on role
      switch (res.user.role) {
        case "SUPER_ADMIN":
          window.location.href = "/super-admin/dashboard";
          break;
        case "ADMIN":
          window.location.href = "/admin/dashboard";
          break;
        case "DELIVERY":
          window.location.href = "/delivery/dashboard";
          break;
        case "VENDOR":
          window.location.href = "/dashboard";
          break;
        case "USER":
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

  return { login, logout, loading, error, user, isAuthenticated };
};