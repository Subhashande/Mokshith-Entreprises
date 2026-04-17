import redis from '../config/redis.js';

export const setRedis = async (key, value) => {
  await redis.set(key, JSON.stringify(value));
};

export const getRedis = async (key) => {
  const data = await redis.get(key);
  return JSON.parse(data);
};

export const deleteRedis = async (key) => {
  await redis.del(key);
};