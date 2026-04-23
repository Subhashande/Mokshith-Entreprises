import apiClient from "../../../services/apiClient";

export const orderService = {
  async getOrders() {
    try {
      return await apiClient.get("/orders");
    } catch {
      throw new Error("Failed to fetch orders");
    }
  },

  async getOrderById(id) {
    try {
      const response = await apiClient.get(`/orders/${id}`);
      return response.data || response;
    } catch {
      throw new Error("Failed to fetch order details");
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