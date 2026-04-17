import * as repo from './product.repository.js';
import AppError from '../../errors/AppError.js';

export const createProduct = async (data) => {
  return repo.createProduct(data);
};

export const getProducts = async (query) => {
  const { page = 1, limit = 10, categoryId, search } = query;

  const skip = (page - 1) * limit;

  let filter = {};

  if (categoryId) filter.categoryId = categoryId;

  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  return repo.findProducts(filter, { skip, limit: Number(limit) });
};

export const getProductById = async (id) => {
  const product = await repo.findById(id);

  if (!product) throw new AppError('Product not found', 404);

  return product;
};