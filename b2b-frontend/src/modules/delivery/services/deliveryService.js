import apiClient from "../../../services/apiClient";

export const deliveryService = {
  async getDeliveries() {
    try {
      return await apiClient.get("/shipments");
    } catch {
      throw new Error("Failed to fetch deliveries");
    }
  },

  async getDeliveryById(id) {
    try {
      return await apiClient.get(`/shipments/${id}`);
    } catch {
      throw new Error("Delivery fetch failed");
    }
  },

  async updateStatus(id, status) {
    try {
      return await apiClient.patch(`/shipments/${id}/status`, { status });
    } catch {
      throw new Error("Failed to update delivery status");
    }
  },
};