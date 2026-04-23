import apiClient from "../../../services/apiClient";

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

  async getInvoiceByOrderId(orderId) {
    try {
      const response = await apiClient.get(`/invoices/${orderId}`);
      return response.data || response;
    } catch (err) {
      console.error("Error fetching invoice by order ID:", err);
      throw new Error("Failed to fetch invoice for this order");
    }
  },
};