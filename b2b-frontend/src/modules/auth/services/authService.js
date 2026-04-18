import apiClient from "../../../services/apiClient";

export const authService = {
  async login(payload) {
    try {
      const res = await apiClient.post("/auth/login", payload);
      return res.data;
    } catch (error) {
      throw new Error(error?.response?.data?.message || "Login failed");
    }
  },

  async register(payload) {
    try {
      const res = await apiClient.post("/auth/register", payload);
      return res;
    } catch (error) {
      throw new Error(error?.response?.data?.message || "Registration failed");
    }
  },

  async logout() {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      throw new Error("Logout failed");
    }
  },
};