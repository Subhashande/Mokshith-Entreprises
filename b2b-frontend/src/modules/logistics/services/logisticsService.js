import apiClient from "../../../services/apiClient";

export const logisticsService = {
  async getDeliveryQueue() {
    try {
      return await apiClient.get("/logistics/delivery-queue");
    } catch (error) {
      throw new Error(error.message || "Failed to fetch delivery queue");
    }
  },

  async acceptDelivery(id) {
    try {
      return await apiClient.post(`/logistics/${id}/accept`);
    } catch (error) {
      throw new Error(error.message || "Failed to accept delivery");
    }
  },

  async startDelivery(id) {
    try {
      return await apiClient.post(`/logistics/${id}/start`);
    } catch (error) {
      throw new Error(error.message || "Failed to start delivery");
    }
  },

  async markDelivered(id, data = {}) {
    try {
      return await apiClient.post(`/logistics/${id}/delivered`, data);
    } catch (error) {
      throw new Error(error.message || "Failed to mark as delivered");
    }
  },

  async updateLocation(id, location) {
    try {
      return await apiClient.post(`/logistics/${id}/location`, location);
    } catch (error) {
      throw new Error(error.message || "Failed to update location");
    }
  },

  async getDeliveryHistory() {
    try {
      return await apiClient.get("/logistics/history");
    } catch (error) {
      throw new Error(error.message || "Failed to fetch delivery history");
    }
  }
};