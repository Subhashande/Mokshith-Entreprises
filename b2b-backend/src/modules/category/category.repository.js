import Category from './category.model.js';

export const createCategory = (data) => Category.create(data);

export const findAllCategories = () => Category.find();

export const findById = (id) => Category.findById(id);