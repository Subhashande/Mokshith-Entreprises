import Redis from 'ioredis';
import { env } from './env.js';

const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: 1, // ⚡ Reduce retries if it fails
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 3) {
      return null; // Stop retrying after 3 attempts to prevent log spam
    }
    return Math.min(times * 50, 2000);
  },
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    // Silently handle connection refusal if Redis is optional
    return;
  }
  console.error('Redis error', err);
});

export default redis;