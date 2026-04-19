import app from './src/app.js';
import connectDB from './src/config/db.js';
import { logger } from './src/config/logger.js';

const PORT = process.env.PORT || 5000;

let server;

const startServer = async () => {
  try {
    // 🔥 Connect DB
    await connectDB();

    // 🚀 Start server
    server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
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
    if (server) {
      server.close(() => {
        logger.info('💤 Server closed');
        process.exit(0);
      });
    }
  } catch (err) {
    logger.error('Shutdown error:', err);
    process.exit(1);
  }
};

// 🔥 Handle system signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

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