import Product from './product.model.js';

export const createProduct = (data) => Product.create(data);

export const findProducts = (filter, options) => {
  const { skip, limit } = options;

  return Product.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .populate('categoryId vendorId companyId');
};

export const findById = (id) =>
  Product.findById(id).populate('categoryId vendorId companyId');

export const updateProduct = (id, data) =>
  Product.findByIdAndUpdate(id, data, { new: true });

export const deleteProduct = (id) =>
  Product.findByIdAndDelete(id);