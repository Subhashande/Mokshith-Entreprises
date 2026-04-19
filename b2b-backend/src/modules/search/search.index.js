// Placeholder for future Elasticsearch / Algolia

export const buildSearchQuery = (query) => {
  return {
    name: { $regex: query, $options: 'i' },
  };
};