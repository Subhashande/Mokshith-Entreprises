import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import connectDB from './src/config/db.js';
import { logger } from './src/config/logger.js';
import { initializeSentry } from './src/config/sentry.js';
import { redisClient } from './src/config/redis.js';
import { configureSocketAdapter, cleanupSocketAdapter } from './src/config/socketAdapter.js';
import { setupQueryTimeout } from './src/utils/queryTimeout.js';
import { Server } from 'socket.io';
import http from 'http';

// 🔥 Initialize Sentry FIRST (before any other imports)
initializeSentry(app);

// 🔥 Setup global query timeout
setupQueryTimeout();

// 🔥 VALIDATE REQUIRED ENVIRONMENT VARIABLES
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  logger.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// 🔒 Conditional validation for optional features
if (process.env.USE_S3_STORAGE === 'true') {
  const s3Vars = ['S3_REGION', 'S3_BUCKET_NAME', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];
  const missingS3 = s3Vars.filter(v => !process.env[v]);
  if (missingS3.length > 0) {
    logger.error(`❌ S3 enabled but missing: ${missingS3.join(', ')}`);
    process.exit(1);
  }
}

if (process.env.NODE_ENV === 'production' && !process.env.SENTRY_DSN) {
  logger.warn('⚠️ SENTRY_DSN not set in production - error tracking disabled');
}

if (process.env.USE_SOCKET_REDIS_ADAPTER === 'true' && !process.env.REDIS_HOST) {
  logger.error('❌ Socket.IO Redis adapter enabled but REDIS_HOST not set');
  process.exit(1);
}

// 🔒 CRITICAL: Enforce JWT_SECRET strength (minimum 64 characters for production)
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 64) {
  logger.error('❌ SECURITY ERROR: JWT_SECRET must be at least 64 characters');
  logger.error('Generate a strong secret: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  if (process.env.NODE_ENV === 'production') {
    logger.error('Exiting due to weak JWT_SECRET in production');
    process.exit(1);
  } else {
    logger.warn('⚠️ Continuing in development, but this would block production');
  }
}

const PORT = process.env.PORT || 5000;

let server;
let io;

const startServer = async () => {
  try {
    // 🔥 Connect DB
    await connectDB();

    // 🔥 Connect Redis (must be before workers/socket adapters)
    logger.info('Connecting to Redis...');
    const redisConnected = await redisClient.connect();
    if (!redisConnected) {
      logger.warn('⚠️ Redis connection failed - some features may be limited');
    }

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize Socket.io with production-ready configuration
    io = new Server(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.FRONTEND_URL || "https://mokshith-entreprises.vercel.app"
          : "*",
        methods: ["GET", "POST", "PATCH"],
        credentials: true
      },
      transports: ['websocket', 'polling'], // Allow polling fallback for stability
      pingTimeout: 60000, // 60 seconds before considering connection dead
      pingInterval: 25000, // Ping every 25 seconds
      connectTimeout: 45000, // Connection timeout
      maxHttpBufferSize: 1e6, // 1MB max message size
      allowUpgrades: true, // Allow transport upgrades
      perMessageDeflate: false, // Disable compression for better performance
      httpCompression: false // Disable http compression (app-level compression is better)
    });

    // Verify IO initialization
    if (io) {
      logger.info('✅ Socket.io initialized');
    }

    // Configure Redis adapter for horizontal scaling
    await configureSocketAdapter(io);

    // Store io globally and in app locals
    global.io = io;
    app.set('io', io);

    // 🔥 Initialize session management handlers
    const { initializeSessionHandlers } = await import('./src/services/socketSessionHandlers.js');
    initializeSessionHandlers(io);

    io.on('connection', (socket) => {
      logger.info(`🔌 New socket connection: ${socket.id}`);

      // 🔥 Join personal room for targeted events (backward compatibility)
      socket.on('join', (userId) => {
        if (userId) {
          socket.join(userId);
          logger.info(`👤 User ${userId} joined room ${userId}`);
        }
      });

      socket.on('disconnect', () => {
        logger.info(`🔌 Socket disconnected: ${socket.id}`);
      });
    });

    // ⏰ Start cron jobs for payment reconciliation
    try {
      // Only start cron jobs if not in test environment
      if (process.env.NODE_ENV !== 'test' && process.env.ENABLE_CRON !== 'false') {
        const { startCronJobs } = await import('./src/jobs/cron.js');
        startCronJobs();
      } else {
        logger.info('⏸️ Cron jobs disabled in test environment');
      }
    } catch (err) {
      logger.warn('⚠️ Cron jobs not started:', err.message);
    }

    // 🚀 Start BullMQ workers
    try {
      // Only start workers if explicitly enabled and not in test
      if (process.env.NODE_ENV !== 'test' && 
          process.env.ENABLE_QUEUE !== 'false' && 
          process.env.ENABLE_WORKERS !== 'false') {
        const { startWorkers } = await import('./src/workers/index.js');
        startWorkers();
      } else {
        logger.info('⏸️ Workers disabled in test environment');
      }
    } catch (err) {
      logger.warn('⚠️ Workers not started:', err.message);
    }

    // 🚀 Start server
    server = httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
    });

    // 🔥 Handle server errors
    server.on('error', (err) => {
      logger.error('Server error:', err);
    });

  } catch (error) {
    logger.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

// 🔥 Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`⚠️ ${signal} received. Shutting down gracefully...`);

  try {
    // 1. Stop accepting new connections
    if (server) {
      server.close(() => {
        logger.info('💤 HTTP Server closed');
      });
    }

    // 2. Close Socket.IO connections and Redis adapter
    if (io) {
      await cleanupSocketAdapter(io);
      io.close(() => {
        logger.info('💤 Socket.IO closed');
      });
    }

    // 3. Shutdown BullMQ workers
    try {
      if (process.env.NODE_ENV !== 'test' && 
          process.env.ENABLE_QUEUE !== 'false' && 
          process.env.ENABLE_WORKERS !== 'false') {
        const { shutdownWorkers } = await import('./src/workers/index.js');
        await shutdownWorkers();
      }
    } catch (err) {
      logger.warn('Workers shutdown skipped:', err.message);
    }

    // 4. Close database connection
    if (connectDB.connection) {
      await connectDB.connection.close();
      logger.info('💤 MongoDB connection closed');
    }

    // 5. Close Redis connection
    try {
      await redisClient.quit();
      logger.info('💤 Redis connection closed');
    } catch (err) {
      logger.warn('Redis quit warning:', err.message);
    }

    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (err) {
    logger.error('❌ Shutdown error:', err);
    process.exit(1);
  }
};

// 🔥 Handle system signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// 🔥 Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

// 🚀 Start
startServer();