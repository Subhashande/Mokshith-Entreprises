export const TEMPLATES = {
  ORDER_PLACED: (orderId) => ({
    title: 'Order Placed',
    message: `Your order ${orderId} has been placed successfully.`,
  }),

  PAYMENT_SUCCESS: (amount) => ({
    title: 'Payment Successful',
    message: `Payment of ₹${amount} completed successfully.`,
  }),

  LOW_CREDIT: () => ({
    title: 'Low Credit Alert',
    message: 'Your credit balance is running low.',
  }),
};