import apiClient from "../../../services/apiClient";

export const productService = {
  async getProducts(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      return await apiClient.get(`/products${query ? `?${query}` : ''}`);
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch products");
    }
  },

  async getProductById(id) {
    try {
      return await apiClient.get(`/products/${id}`);
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch product");
    }
  },

  async createProduct(payload) {
    try {
      return await apiClient.post("/products", payload);
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to create product");
    }
  },

  async updateProduct(id, payload) {
    try {
      return await apiClient.put(`/products/${id}`, payload);
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to update product");
    }
  },

  async deleteProduct(id) {
    try {
      return await apiClient.delete(`/products/${id}`);
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to delete product");
    }
  },

  async updateStock(id, stock) {
    try {
      return await apiClient.patch(`/products/${id}/stock`, { stock });
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to update stock");
    }
  },

  async updateStatus(id, isActive) {
    try {
      return await apiClient.patch(`/products/${id}/status`, { isActive });
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to update status");
    }
  },

  async getCategories() {
    try {
      return await apiClient.get("/categories");
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch categories");
    }
  },

  async getVendors() {
    try {
      return await apiClient.get("/vendors");
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch vendors");
    }
  }
};
