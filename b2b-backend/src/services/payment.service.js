export const processPayment = async ({ amount }) => {
  console.log('Processing payment:', amount);

  return {
    status: 'SUCCESS',
    transactionId: `TXN-${Date.now()}`,
  };
};