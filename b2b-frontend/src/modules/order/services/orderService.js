import apiClient from "../../../services/apiClient";

export const orderService = {
  async getOrders() {
    try {
      return await apiClient.get("/orders");
    } catch {
      throw new Error("Failed to fetch orders");
    }
  },

  async placeOrder(payload) {
    try {
      const response = await apiClient.post("/orders", payload);
      return response.data || response;
    } catch (error) {
      console.error("API Error during placeOrder:", error);
      throw new Error(error.response?.data?.message || error.message || "Order placement failed");
    }
  },
};