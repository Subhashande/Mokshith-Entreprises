import apiClient from "../../../services/apiClient";

export const deliveryService = {
  async getDeliveries() {
    try {
      return await apiClient.get("/logistics/my-assignments");
    } catch {
      throw new Error("Failed to fetch deliveries");
    }
  },

  async getDeliveryById(id) {
    try {
      return await apiClient.get(`/logistics/${id}`);
    } catch {
      throw new Error("Delivery fetch failed");
    }
  },

  async updateStatus(id, status) {
    try {
      const response = await apiClient.patch(`/logistics/${id}/status`, { status });
      return response.data;
    } catch {
      throw new Error("Failed to update delivery status");
    }
  },
};