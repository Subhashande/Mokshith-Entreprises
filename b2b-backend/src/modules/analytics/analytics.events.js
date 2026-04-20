export const trackEvent = (event, data) => {
  console.log(`Analytics Event: ${event}`, data);
};

export const trackOrder = (order) => {
  trackEvent('ORDER_CREATED', order);
};