import Category from './category.model.js';

export const createCategory = async (data) => Category.create(data);

export const findAllCategories = async () =>
  Category.find()
    .populate('parentId', 'name') // Only populate name
    .select('-__v') // Exclude version key
    .lean(); // 🔥 Performance optimization

export const findById = async (id) =>
  Category.findById(id).populate('parentId');

export const updateCategory = async (id, data) =>
  Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });

export const deleteCategory = async (id) => Category.findByIdAndDelete(id);