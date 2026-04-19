import * as repo from './product.repository.js';
import AppError from '../../errors/AppError.js';
import { buildProductFilter } from './product.utils.js';

// 🔥 EVENTS
import { onProductCreated } from './product.events.js';

export const createProduct = async (data) => {
  if (data.price <= 0) {
    throw new AppError('Price must be greater than 0', 400);
  }

  const product = await repo.createProduct(data);

  // 🔥 EVENT (non-blocking)
  try {
    onProductCreated(product);
  } catch (err) {
    console.error('Product event error:', err.message);
  }

  return product;
};

export const getProducts = async (query) => {
  const { page = 1, limit = 10, categoryId, search } = query;

  const skip = (page - 1) * limit;

  const filter = buildProductFilter({ categoryId, search });

  return repo.findProducts(filter, {
    skip,
    limit: Number(limit),
  });
};

export const getProductById = async (id) => {
  const product = await repo.findById(id);

  if (!product) throw new AppError('Product not found', 404);

  return product;
};