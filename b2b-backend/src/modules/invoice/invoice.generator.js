export const generateInvoiceNumber = () => {
  return `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};