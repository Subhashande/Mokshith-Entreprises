import apiClient from "../../../services/apiClient";

export const companyService = {
  async getCompany() {
    try {
      return await apiClient.get("/companies/me");
    } catch (error) {
      throw new Error(error.message || "Failed to fetch company details");
    }
  },

  async updateCompany(data) {
    try {
      return await apiClient.put("/companies/update", data);
    } catch (error) {
      throw new Error(error.message || "Failed to update company");
    }
  },

  async getCompanyById(id) {
    try {
      return await apiClient.get(`/companies/${id}`);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch company");
    }
  }
};