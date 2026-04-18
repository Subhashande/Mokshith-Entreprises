import apiClient from "../../services/apiClient";

export const invoiceService = {
  async getInvoices() {
    try {
      return await apiClient.get("/invoices");
    } catch {
      throw new Error("Failed to fetch invoices");
    }
  },

  async getInvoiceById(id) {
    try {
      return await apiClient.get(`/invoices/${id}`);
    } catch {
      throw new Error("Invoice fetch failed");
    }
  },
};