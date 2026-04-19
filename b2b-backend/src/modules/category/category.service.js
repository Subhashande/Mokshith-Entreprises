import * as repo from './category.repository.js';
import AppError from '../../errors/AppError.js';

export const createCategory = async (data) => {
  const { name, parentId } = data;

  // 🔥 Check duplicate under same parent
  const existing = await repo.findAllCategories();

  const isDuplicate = existing.find(
    (cat) =>
      cat.name.toLowerCase() === name.toLowerCase() &&
      String(cat.parentId) === String(parentId || null)
  );

  if (isDuplicate) {
    throw new AppError('Category already exists under this parent', 400);
  }

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