import apiClient from "../../../services/apiClient";

export const inventoryService = {
  async getInventory(params = {}) {
    try {
      return await apiClient.get("/inventory", params);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch inventory");
    }
  },

  async updateInventoryStock(id, data) {
    try {
      return await apiClient.patch(`/inventory/${id}`, data);
    } catch (error) {
      throw new Error(error.message || "Failed to update stock");
    }
  },

  async getLowStockItems() {
    try {
      return await apiClient.get("/inventory/low-stock");
    } catch (error) {
      throw new Error(error.message || "Failed to fetch low stock items");
    }
  },

  async getInventoryStats() {
    try {
      return await apiClient.get("/inventory/stats");
    } catch (error) {
      throw new Error(error.message || "Failed to fetch inventory stats");
    }
  }
};