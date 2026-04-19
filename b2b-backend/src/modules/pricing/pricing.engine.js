export const calculatePrice = ({ basePrice, quantity }) => {
  if (quantity >= 100) return basePrice * 0.8; // 20% discount
  if (quantity >= 50) return basePrice * 0.9;  // 10% discount

  return basePrice;
};