const cache = new Map();

export const setCache = async (key, value, ttl = 60) => {
  cache.set(key, value);

  setTimeout(() => {
    cache.delete(key);
  }, ttl * 1000);
};

export const getCache = async (key) => {
  return cache.get(key);
};

export const deleteCache = async (key) => {
  cache.delete(key);
};