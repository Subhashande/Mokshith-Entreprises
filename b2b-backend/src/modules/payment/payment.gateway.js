export const createPaymentOrder = async ({ amount }) => {
  return {
    gatewayOrderId: `order_${Date.now()}`,
    amount,
  };
};

export const verifyPayment = async (payload) => {
  // 🔥 simulate verification (replace with real gateway later)
  return true;
};