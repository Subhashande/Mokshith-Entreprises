export const buildProductFilter = ({ categoryId, search }) => {
  const filter = { isActive: true };

  if (categoryId) {
    filter.categoryId = categoryId;
  }

  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  return filter;
};