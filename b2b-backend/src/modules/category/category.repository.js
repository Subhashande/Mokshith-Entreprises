import Category from './category.model.js';

export const createCategory = async (data) => Category.create(data);

export const findAllCategories = async () =>
  Category.find().populate('parentId');

export const findById = async (id) =>
  Category.findById(id).populate('parentId');