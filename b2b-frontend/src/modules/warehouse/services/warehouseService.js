import apiClient from "../../../services/apiClient";

export const warehouseService = {
  async getWarehouses() {
    try {
      return await apiClient.get("/warehouses");
    } catch (error) {
      throw new Error(error.message || "Failed to fetch warehouses");
    }
  },

  async createWarehouse(data) {
    try {
      return await apiClient.post("/warehouses", data);
    } catch (error) {
      throw new Error(error.message || "Failed to create warehouse");
    }
  },

  async updateWarehouse(id, data) {
    try {
      return await apiClient.put(`/warehouses/${id}`, data);
    } catch (error) {
      throw new Error(error.message || "Failed to update warehouse");
    }
  },

  async deleteWarehouse(id) {
    try {
      return await apiClient.delete(`/warehouses/${id}`);
    } catch (error) {
      throw new Error(error.message || "Failed to delete warehouse");
    }
  },

  async getWarehouseStats(id) {
    try {
      return await apiClient.get(`/warehouses/${id}/stats`);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch warehouse stats");
    }
  }
};