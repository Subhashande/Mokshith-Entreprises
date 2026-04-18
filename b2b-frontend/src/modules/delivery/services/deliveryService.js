import apiClient from "../../services/apiClient";

export const deliveryService = {
  async getDeliveries() {
    try {
      return await apiClient.get("/deliveries");
    } catch {
      throw new Error("Failed to fetch deliveries");
    }
  },

  async getDeliveryById(id) {
    try {
      return await apiClient.get(`/deliveries/${id}`);
    } catch {
      throw new Error("Delivery fetch failed");
    }
  },
};