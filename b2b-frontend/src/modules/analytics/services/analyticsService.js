import apiClient from "../../../services/apiClient";

export const analyticsService = {
  async getDashboard() {
    try {
      return await apiClient.get("/analytics/dashboard");
    } catch (error) {
      throw new Error(error.message || "Failed to fetch dashboard analytics");
    }
  },

  async getSalesData(params = {}) {
    try {
      return await apiClient.get("/analytics/sales", params);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch sales data");
    }
  },

  async getOrderTrends(params = {}) {
    try {
      return await apiClient.get("/analytics/orders-trends", params);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch order trends");
    }
  },

  async getCategoryDistribution() {
    try {
      return await apiClient.get("/analytics/categories");
    } catch (error) {
      throw new Error(error.message || "Failed to fetch category distribution");
    }
  },

  async getTopProducts(params = {}) {
    try {
      return await apiClient.get("/analytics/top-products", params);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch top products");
    }
  },

  async getRevenueStats(params = {}) {
    try {
      return await apiClient.get("/analytics/revenue", params);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch revenue stats");
    }
  }
};