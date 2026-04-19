export const getPricingRules = async () => {
  // 🔥 Placeholder (can connect DB later)
  return {
    bulkDiscounts: [
      { minQty: 100, discount: 0.2 },
      { minQty: 50, discount: 0.1 },
    ],
  };
};