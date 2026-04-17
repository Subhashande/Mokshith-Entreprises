import * as repo from './category.repository.js';
import AppError from '../../errors/AppError.js';

export const createCategory = async (data) => {
  return repo.createCategory(data);
};

export const getCategories = async () => {
  return repo.findAllCategories();
};

export const getCategoryById = async (id) => {
  const category = await repo.findById(id);

  if (!category) throw new AppError('Category not found', 404);

  return category;
};