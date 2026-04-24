import apiClient from "../../../services/apiClient";

export const authService = {
  async login(payload) {
    try {
      const res = await apiClient.post("/auth/login", payload);
      // Extract tokens from response and store them
      const { data } = res;
      if (data?.accessToken) {
        localStorage.setItem("token", data.accessToken);
      }
      if (data?.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }
      // Store user info
      if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
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
    } finally {
      // Always clear local storage even if API call fails
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
  },

  async refreshToken(refreshToken) {
    try {
      const res = await apiClient.post("/auth/refresh-token", { token: refreshToken });
      // Store new tokens
      if (res?.data?.accessToken) {
        localStorage.setItem("token", res.data.accessToken);
      }
      if (res?.data?.refreshToken) {
        localStorage.setItem("refreshToken", res.data.refreshToken);
      }
      return res.data || res;
    } catch (error) {
      // If refresh fails, clear auth
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      throw new Error(error || "Token refresh failed");
    }
  },
};