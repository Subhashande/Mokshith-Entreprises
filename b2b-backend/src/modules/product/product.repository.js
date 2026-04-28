import Product from './product.model.js';

export const createProduct = (data) => Product.create(data);

export const findProducts = (filter, options) => {
  const { skip, limit } = options;

  return Product.find(filter)
    .select('name price stock description categoryId images unit minOrderQty moq gst') //  Field Optimization
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .populate('categoryId', 'name') //  Populating only necessary fields
    .populate('vendorId', 'name')
    .populate('companyId', 'name');
};

export const findById = (id) =>
  Product.findById(id).populate('categoryId vendorId companyId');

export const updateProduct = (id, data) =>
  Product.findByIdAndUpdate(id, data, { new: true });

export const deleteProduct = (id) =>
  Product.findByIdAndDelete(id);