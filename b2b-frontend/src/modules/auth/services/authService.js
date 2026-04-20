import apiClient from "../../../services/apiClient";

export const authService = {
  async login(payload) {
    try {
      const res = await apiClient.post("/auth/login", payload);
      // Ensure we handle the standard backend response structure
      return res.data || res; 
    } catch (error) {
      throw new Error(error || "Login failed");
    }
  },

  async register(payload) {
    try {
      const res = await apiClient.post("/auth/register", payload);
      return res.data || res;
    } catch (error) {
      throw new Error(error || "Registration failed");
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