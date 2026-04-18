import apiClient from "../../services/apiClient";

export const searchService = {
  async search(query) {
    try {
      return await apiClient.get(`/search?q=${encodeURIComponent(query)}`);
    } catch {
      throw new Error("Search failed");
    }
  },
};