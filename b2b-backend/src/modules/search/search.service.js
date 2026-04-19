import Product from '../product/product.model.js';
import { buildSearchQuery } from './search.index.js';

export const searchProducts = async (query) => {
  if (!query) return [];

  const filter = buildSearchQuery(query);

  return Product.find(filter)
    .limit(20)
    .populate('categoryId vendorId');
};