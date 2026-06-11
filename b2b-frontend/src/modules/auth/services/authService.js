import apiClient from "../../../services/apiClient";

export const authService = {
  async login(payload) {
    try {
      const res = await apiClient.post("/auth/login", payload);
      
      // Handle null/undefined response
      if (!res) {
        return null;
      }
      
      // Since apiClient returns response.data, res is already the body
      const responseData = res.data || res;
      
      if (responseData?.accessToken) {
        localStorage.setItem("token", responseData.accessToken);
      }
      if (responseData?.refreshToken) {
        localStorage.setItem("refreshToken", responseData.refreshToken);
      }
      if (responseData?.csrfToken) {
        localStorage.setItem("csrfToken", responseData.csrfToken);
      }
      if (responseData?.sessionId) {
        localStorage.setItem("sessionId", responseData.sessionId);
      }
      if (responseData?.user) {
        localStorage.setItem("user", JSON.stringify(responseData.user));
      }
      return responseData;
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Login failed";
      throw new Error(message);
    }
  },

  async register(payload) {
    try {
      const res = await apiClient.post("/auth/register", payload);
      return res.data || res;
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Registration failed";
      throw new Error(message);
    }
  },

  async logout() {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      await apiClient.post("/auth/logout", { refreshToken });
    } catch {
      throw new Error("Logout failed");
    } finally {
      // Always clear local storage even if API call fails
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("sessionId");
    }
  },

  async refreshToken(refreshToken) {
    try {
      const res = await apiClient.post("/auth/refresh-token", { refreshToken });
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

  async fetchCsrfToken() {
    try {
      const res = await apiClient.get("/auth/csrf-token");
      const responseData = res.data || res;
      if (responseData?.csrfToken) {
        localStorage.setItem("csrfToken", responseData.csrfToken);
      }
      return responseData;
    } catch (error) {
      console.error("Failed to fetch CSRF token:", error);
      return null;
    }
  },
};