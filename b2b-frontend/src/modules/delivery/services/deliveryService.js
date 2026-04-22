import apiClient from "../../../services/apiClient";

export const deliveryService = {
  async getDeliveries() {
    try {
      const res = await apiClient.get("/logistics/my-assignments");
      if (!res.success) {
        console.error("API Error:", res);
        throw new Error("Failed to fetch deliveries");
      }
      return res.data || [];
    } catch (err) {
      console.error("getDeliveries error:", err);
      throw err;
    }
  },

  async getDeliveryById(id) {
    try {
      const res = await apiClient.get(`/logistics/${id}`);
      return res.data || res;
    } catch (err) {
      console.error("getDeliveryById error:", err);
      throw new Error("Delivery fetch failed");
    }
  },

  async updateStatus(id, status) {
    try {
      const res = await apiClient.patch(`/logistics/${id}/status`, { status });
      return res.data || res;
    } catch (err) {
      console.error("updateStatus error:", err);
      throw new Error("Failed to update delivery status");
    }
  },
};