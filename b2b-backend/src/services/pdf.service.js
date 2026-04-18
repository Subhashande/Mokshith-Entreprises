export const generatePDF = async (data) => {
  console.log('Generating PDF for:', data);

  return {
    url: `/uploads/invoices/${Date.now()}.pdf`,
  };
};