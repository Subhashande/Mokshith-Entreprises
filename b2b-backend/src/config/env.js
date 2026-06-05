import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,

  REDIS_URL: process.env.REDIS_URL,
  REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_SENTINELS: process.env.REDIS_SENTINELS,
  REDIS_SENTINEL_NAME: process.env.REDIS_SENTINEL_NAME,
  REDIS_CLUSTER: process.env.REDIS_CLUSTER,
  USE_SOCKET_REDIS_ADAPTER: process.env.USE_SOCKET_REDIS_ADAPTER,
  USE_S3_STORAGE: process.env.USE_S3_STORAGE,
  S3_REGION: process.env.S3_REGION,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  SENTRY_DSN: process.env.SENTRY_DSN,

  NODE_ENV: process.env.NODE_ENV || 'development',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },
};