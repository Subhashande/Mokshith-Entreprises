export const createPaymentOrder = async ({ amount }) => {
  // simulate Razorpay/Stripe
  return {
    gatewayOrderId: `order_${Date.now()}`,
    amount,
  };
};

export const verifyPayment = async (payload) => {
  // simulate verification
  return true;
};