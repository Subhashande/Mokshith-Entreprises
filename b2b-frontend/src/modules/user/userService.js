import apiClient from "../../services/apiClient";

export const userService = {
  async getProfile() {
    try {
      const response = await apiClient.get("/users/profile");
      return response.data || response;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch profile");
    }
  },

  async updateProfile(userData) {
    try {
      const response = await apiClient.put("/users/profile", userData);
      return response.data || response;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to update profile");
    }
  },

  async changePassword(passwordData) {
    try {
      const response = await apiClient.post("/users/change-password", passwordData);
      return response.data || response;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to change password");
    }
  },
};
