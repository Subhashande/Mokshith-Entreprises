import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { logger } from './logger.js';
import { env } from './env.js';

/**
 * Configure Socket.IO Redis adapter for horizontal scaling
 * Enables multiple server instances to share socket connections
 */
export const configureSocketAdapter = async (io) => {
  // Only use Redis adapter in production or when explicitly enabled
  if (process.env.NODE_ENV !== 'production' && process.env.USE_SOCKET_REDIS_ADAPTER !== 'true') {
    logger.info('Socket.IO using default in-memory adapter (dev mode)');
    return;
  }

  try {
    const redisUrl = env.REDIS_URL || `redis://${env.REDIS_HOST || 'localhost'}:${env.REDIS_PORT || 6379}`;
    
    // Create two Redis clients for Socket.IO adapter (pub/sub pattern)
    const pubClient = createClient({ 
      url: redisUrl,
      password: env.REDIS_PASSWORD,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Socket.IO Redis adapter: Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });
    
    const subClient = pubClient.duplicate();

    // Error handlers
    pubClient.on('error', (err) => logger.error('Socket.IO Redis Pub Client Error:', err));
    subClient.on('error', (err) => logger.error('Socket.IO Redis Sub Client Error:', err));

    // Connect both clients
    await Promise.all([pubClient.connect(), subClient.connect()]);

    // Create and attach adapter
    io.adapter(createAdapter(pubClient, subClient));

    logger.info('✅ Socket.IO Redis adapter configured for horizontal scaling');

    // Store clients for cleanup
    io.socketRedisClients = { pubClient, subClient };
  } catch (error) {
    logger.error('❌ Failed to configure Socket.IO Redis adapter:', error);
    logger.warn('⚠️ Falling back to default in-memory adapter');
  }
};

/**
 * Cleanup Socket.IO Redis adapter connections
 */
export const cleanupSocketAdapter = async (io) => {
  if (io.socketRedisClients) {
    const { pubClient, subClient } = io.socketRedisClients;
    try {
      await Promise.all([
        pubClient.quit(),
        subClient.quit()
      ]);
      logger.info('✅ Socket.IO Redis adapter connections closed');
    } catch (error) {
      logger.error('Error closing Socket.IO Redis adapter:', error);
    }
  }
};
