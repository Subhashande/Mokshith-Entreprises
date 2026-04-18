import apiClient from "../../../services/apiClient";

export const productService = {
  async getProducts() {
    try {
      return await apiClient.get("/products");
    } catch (error) {
      throw new Error("Failed to fetch products");
    }
  },

  async getProductById(id) {
    try {
      return await apiClient.get(`/products/${id}`);
    } catch {
      throw new Error("Product fetch failed");
    }
  },
};