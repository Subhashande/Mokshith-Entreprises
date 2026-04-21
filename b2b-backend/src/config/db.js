import mongoose from 'mongoose';
import { logger } from './logger.js';

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    logger.info('Using existing MongoDB connection');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = true;
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('MongoDB connection failed', error);
    process.exit(1);
  }
};

mongoose.connection.on("connected", () => {
  logger.info("MongoDB connection established successfully");
});

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  logger.warn("MongoDB disconnected. Reconnecting...");
});

mongoose.connection.on("error", (err) => {
  logger.error(`MongoDB connection error: ${err}`);
});

export default connectDB;