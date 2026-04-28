import * as repo from './product.repository.js';
import AppError from '../../errors/AppError.js';
import { buildProductFilter } from './product.utils.js';
import { logger } from '../../config/logger.js';

//  Simple In-Memory Cache
const productCache = {
  data: null,
  lastFetched: null,
  ttl: 300000 // 5 minutes
};

//  EVENTS
import { onProductCreated } from './product.events.js';

export const createProduct = async (data) => {
  if (data.price <= 0) {
    throw new AppError('Price must be greater than 0', 400);
  }

  const product = await repo.createProduct(data);
  
  //  Invalidate Cache
  productCache.data = null;

  //  EVENT (non-blocking)
  try {
    onProductCreated(product);
  } catch (err) {
    logger.error('Product event error:', err.message);
  }

  return product;
};

export const getProducts = async (query) => {
  let { page = 1, limit = 10, categoryId, search } = query;

  //  SECURITY: Enforce pagination limits to prevent abuse
  page = Math.max(1, Math.min(parseInt(page) || 1, 1000));
  limit = Math.max(1, Math.min(parseInt(limit) || 10, 100));

  //  Caching for default product list
  const isDefaultQuery = page === 1 && limit === 10 && !categoryId && !search;
  if (isDefaultQuery && productCache.data && (Date.now() - productCache.lastFetched < productCache.ttl)) {
    return productCache.data;
  }

  const skip = (page - 1) * limit;

  const filter = buildProductFilter({ categoryId, search });

  const result = await repo.findProducts(filter, {
    skip,
    limit: Number(limit),
  });

  if (isDefaultQuery) {
    productCache.data = result;
    productCache.lastFetched = Date.now();
  }

  return result;
};

export const getProductById = async (id) => {
  const product = await repo.findById(id);

  if (!product) throw new AppError('Product not found', 404);

  return product;
};

export const updateProduct = async (id, data) => {
  const product = await repo.findById(id);

  if (!product) throw new AppError('Product not found', 404);

  const updatedProduct = await repo.updateProduct(id, data);

  return updatedProduct;
};

export const deleteProduct = async (id) => {
  const product = await repo.findById(id);

  if (!product) throw new AppError('Product not found', 404);

  await repo.deleteProduct(id);

  return { message: 'Product deleted successfully' };
};

export const updateStock = async (id, stock) => {
  if (stock < 0) {
    throw new AppError('Stock cannot be negative', 400);
  }

  const product = await repo.updateProduct(id, { stock });

  if (!product) throw new AppError('Product not found', 404);

  return product;
};

export const updateStatus = async (id, isActive) => {
  const product = await repo.updateProduct(id, { isActive });

  if (!product) throw new AppError('Product not found', 404);

  return product;
};