import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import connectDB from './src/config/db.js';
import { logger } from './src/config/logger.js';
import { Server } from 'socket.io';
import http from 'http';

const PORT = process.env.PORT || 5000;

let server;
let io;

const startServer = async () => {
  try {
    // 🔥 Connect DB
    await connectDB();

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize Socket.io
    io = new Server(httpServer, {
      path: '/socket.io',
      cors: {
        origin: ["http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:5173", "http://127.0.0.1:5173"],
        methods: ["GET", "POST", "PATCH"],
        credentials: true
      },
      transports: ['polling', 'websocket']
    });

    // Verify IO initialization
    if (io) {
      logger.info('✅ Socket.io initialized');
    }

    // Store io globally and in app locals
    global.io = io;
    app.set('io', io);

    io.on('connection', (socket) => {
      logger.info(`🔌 New socket connection: ${socket.id}`);

      socket.on('disconnect', () => {
        logger.info(`🔌 Socket disconnected: ${socket.id}`);
      });
    });

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