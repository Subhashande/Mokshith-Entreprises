import { useState, useCallback } from "react";
import { authService } from "../services/authService";
import storage from "../../services/storage";

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (data) => {
    setLoading(true);
    setError(null);

    try {
      const res = await authService.login(data);

      // Secure storage (token should ideally be HttpOnly cookie)
      storage.set("user", res.user);

      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = async () => {
    await authService.logout();
    storage.clear();
  };

  return { login, logout, loading, error };
};