export const onProductCreated = (product) => {
  try {
    console.log(' Product created:', product.name);
  } catch (err) {
    console.error('Product event failed:', err.message);
  }
};