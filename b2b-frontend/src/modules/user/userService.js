import apiClient from "../../services/apiClient";

export const userService = {
  async getProfile() {
    try {
      const response = await apiClient.get("/users/me");
      return response.data || response;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch profile");
    }
  },

  async updateProfile(userData) {
    try {
      const response = await apiClient.put("/users/me", userData);
      return response.data || response;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to update profile");
    }
  },

  async updateProfileImage(formData) {
    try {
      const response = await apiClient.post("/users/profile-image", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data || response;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to upload image");
    }
  },

  async changePassword(passwordData) {
    try {
      const response = await apiClient.put("/users/change-password", passwordData);
      return response.data || response;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to change password");
    }
  },
};
