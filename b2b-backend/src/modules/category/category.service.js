import * as repo from './category.repository.js';
import AppError from '../../errors/AppError.js';

export const createCategory = async (data) => {
  const { name, parentId } = data;

  // 🔥 Referential check: a provided parent category must exist
  if (parentId) {
    const parent = await repo.findById(parentId);
    if (!parent) {
      throw new AppError('Parent category not found', 400);
    }
  }

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

  // Auto-generate a URL slug from the name when one is not provided
  const payload = { ...data };
  if (!payload.slug && name) {
    payload.slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  return repo.createCategory(payload);
};

export const getCategories = async () => {
  return repo.findAllCategories();
};

export const getCategoryById = async (id) => {
  const category = await repo.findById(id);

  if (!category) throw new AppError('Category not found', 404);

  return category;
};

export const updateCategory = async (id, data) => {
  const updated = await repo.updateCategory(id, data);

  if (!updated) throw new AppError('Category not found', 404);

  return updated;
};

export const deleteCategory = async (id) => {
  const deleted = await repo.deleteCategory(id);

  if (!deleted) throw new AppError('Category not found', 404);

  return deleted;
};