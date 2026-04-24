import apiClient from "../../../services/apiClient";

export const promotionService = {
  async getPromotions() {
    try {
      return await apiClient.get("/promotions");
    } catch (error) {
      throw new Error(error.message || "Failed to fetch promotions");
    }
  },

  async createPromotion(data) {
    try {
      return await apiClient.post("/promotions", data);
    } catch (error) {
      throw new Error(error.message || "Failed to create promotion");
    }
  },

  async updatePromotion(id, data) {
    try {
      return await apiClient.put(`/promotions/${id}`, data);
    } catch (error) {
      throw new Error(error.message || "Failed to update promotion");
    }
  },

  async deletePromotion(id) {
    try {
      return await apiClient.delete(`/promotions/${id}`);
    } catch (error) {
      throw new Error(error.message || "Failed to delete promotion");
    }
  },

  async togglePromotionStatus(id) {
    try {
      return await apiClient.patch(`/promotions/${id}/toggle`);
    } catch (error) {
      throw new Error(error.message || "Failed to toggle status");
    }
  }
};