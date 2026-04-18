export const search = async ({ query, data }) => {
  return data.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );
};