import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

// 🔒 Circuit Breaker State for Redis Resilience
const circuitBreaker = {
  state: 'CLOSED', // CLOSED (working), OPEN (failing), HALF_OPEN (testing)
  failureCount: 0,
  failureThreshold: 5, // Open circuit after 5 failures
  successCount: 0,
  successThreshold: 2, // Close circuit after 2 successes in HALF_OPEN
  timeout: 30000, // 30s before trying again
  nextAttempt: 0,
  
  recordSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        logger.info('✅ Redis circuit breaker CLOSED - connection restored');
      }
    } else if (this.state === 'OPEN') {
      // Shouldn't happen, but reset anyway
      this.state = 'CLOSED';
      this.failureCount = 0;
      logger.info('✅ Redis circuit breaker CLOSED');
    }
  },
  
  recordFailure() {
    this.failureCount++;
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      this.successCount = 0;
      logger.error('❌ Redis circuit breaker OPEN - fallback mode activated');
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      logger.error(`❌ Redis circuit breaker OPEN after ${this.failureCount} failures`);
    }
  },
  
  canAttempt() {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'HALF_OPEN') return true;
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.state = 'HALF_OPEN';
      this.successCount = 0;
      logger.info('🔄 Redis circuit breaker HALF_OPEN - testing connection');
      return true;
    }
    return false;
  },
  
  isOpen() {
    return this.state === 'OPEN';
  }
};

// 🔒 Distributed Redis connection configuration
// Prioritizes REDIS_URL for production (Upstash/Managed Redis)
const getRedisConfig = () => {
  const baseConfig = {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    showFriendlyErrorStack: env.NODE_ENV === 'development',
    
    // 🔒 Enhanced reconnection strategy
    retryStrategy(times) {
      if (times > 10) {
        logger.error('Redis connection failed after 10 retries - circuit breaker will activate');
        return null;
      }
      return Math.min(times * 1000, 30000);
    },
    
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
      return targetErrors.some(e => err.message.includes(e));
    },
    
    connectTimeout: 15000, // 15s
    keepAlive: 30000, // 30s
    commandTimeout: 10000, // 10s
  };

  // 1. Prioritize REDIS_URL (Upstash / Managed Redis)
  if (env.REDIS_URL) {
    logger.info('Using Redis connection from REDIS_URL');
    return {
      ...baseConfig,
      // URL includes host, port, password, and TLS/SSL settings
      path: env.REDIS_URL,
    };
  }

  // 2. Support for Redis Sentinel (high availability)
  if (env.REDIS_SENTINELS) {
    try {
      const sentinels = JSON.parse(env.REDIS_SENTINELS);
      logger.info('Using Redis Sentinel configuration');
      return {
        ...baseConfig,
        sentinels,
        name: env.REDIS_SENTINEL_NAME || 'mymaster',
        password: env.REDIS_PASSWORD,
      };
    } catch (err) {
      logger.error('Failed to parse REDIS_SENTINELS, falling back to standalone');
    }
  }

  // 3. Fallback to Standalone (Localhost / Traditional Hosting)
  logger.info(`Using standalone Redis: ${env.REDIS_HOST}:${env.REDIS_PORT}`);
  return {
    ...baseConfig,
    host: env.REDIS_HOST,
    port: parseInt(env.REDIS_PORT),
    password: env.REDIS_PASSWORD,
  };
};

const redisConfig = getRedisConfig();
const redis = new Redis(env.REDIS_URL || redisConfig);

redis.on('connect', () => {
  logger.info('✅ Redis connection established', {
    mode: env.REDIS_URL ? 'URL' : (redisConfig.sentinels ? 'sentinel' : 'standalone'),
    destination: env.REDIS_URL ? 'External URL' : `${env.REDIS_HOST}:${env.REDIS_PORT}`
  });
});
redis.on('ready', () => {
  logger.info('✅ Redis ready');
  circuitBreaker.recordSuccess();
});
redis.on('error', (err) => {
  circuitBreaker.recordFailure();
  if (err.code === 'ECONNREFUSED') {
    logger.warn('⚠️ Redis connection refused - running in degraded mode');
    return;
  }
  logger.error('❌ Redis error:', err.message);
});
redis.on('close', () => {
  logger.warn('⚠️ Redis connection closed');
});
redis.on('reconnecting', (delay) => {
  logger.info(`🔄 Redis reconnecting in ${delay}ms...`);
});
redis.on('end', () => {
  logger.warn('⚠️ Redis connection ended');
});

// Graceful error handling wrapper with circuit breaker
export const redisClient = {
  async get(key) {
    if (!circuitBreaker.canAttempt()) {
      logger.debug('Redis circuit breaker OPEN, skipping GET', { key });
      return null;
    }
    
    try {
      const result = await redis.get(key);
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      circuitBreaker.recordFailure();
      logger.error(`Redis GET error for key ${key}:`, error.message);
      return null;
    }
  },
  
  async set(...args) {
    if (!circuitBreaker.canAttempt()) {
      logger.debug('Redis circuit breaker OPEN, skipping SET');
      return null;
    }
    
    try {
      const result = await redis.set(...args);
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      circuitBreaker.recordFailure();
      logger.error('Redis SET error:', error.message);
      return null;
    }
  },

  /**
   * 🔥 List operations for security audit logs
   */
  async lpush(key, ...values) {
    if (!circuitBreaker.canAttempt()) {
      logger.debug('Redis circuit breaker OPEN, skipping LPUSH');
      return null;
    }
    
    try {
      const result = await redis.lpush(key, ...values);
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      circuitBreaker.recordFailure();
      logger.error('Redis LPUSH error:', error.message);
      return null;
    }
  },

  async rpush(key, ...values) {
    if (!circuitBreaker.canAttempt()) {
      logger.debug('Redis circuit breaker OPEN, skipping RPUSH');
      return null;
    }
    
    try {
      const result = await redis.rpush(key, ...values);
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      circuitBreaker.recordFailure();
      logger.error('Redis RPUSH error:', error.message);
      return null;
    }
  },

  async ltrim(key, start, stop) {
    if (!circuitBreaker.canAttempt()) {
      logger.debug('Redis circuit breaker OPEN, skipping LTRIM');
      return null;
    }
    
    try {
      const result = await redis.ltrim(key, start, stop);
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      circuitBreaker.recordFailure();
      logger.error('Redis LTRIM error:', error.message);
      return null;
    }
  },

  async lrange(key, start, stop) {
    if (!circuitBreaker.canAttempt()) {
      logger.debug('Redis circuit breaker OPEN, skipping LRANGE');
      return [];
    }
    
    try {
      const result = await redis.lrange(key, start, stop);
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      circuitBreaker.recordFailure();
      logger.error('Redis LRANGE error:', error.message);
      return [];
    }
  },
  
  async setex(key, ttl, value) {
    if (!circuitBreaker.canAttempt()) {
      logger.debug('Redis circuit breaker OPEN, skipping SETEX', { key });
      return null;
    }
    
    try {
      const result = await redis.setex(key, ttl, value);
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      circuitBreaker.recordFailure();
      logger.error(`Redis SETEX error for key ${key}:`, error.message);
      return null;
    }
  },
  
  async del(key) {
    if (!circuitBreaker.canAttempt()) {
      logger.debug('Redis circuit breaker OPEN, skipping DEL', { key });
      return null;
    }
    
    try {
      const result = await redis.del(key);
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      circuitBreaker.recordFailure();
      logger.error(`Redis DEL error for key ${key}:`, error.message);
      return null;
    }
  },
  
  async incr(key) {
    if (!circuitBreaker.canAttempt()) {
      logger.debug('Redis circuit breaker OPEN, skipping INCR', { key });
      return 0;
    }
    
    try {
      const result = await redis.incr(key);
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      circuitBreaker.recordFailure();
      logger.error(`Redis INCR error for key ${key}:`, error.message);
      return 0;
    }
  },
  async decr(key) {
    try {
      return await redis.decr(key);
    } catch (error) {
      logger.error(`Redis DECR error for key ${key}:`, error.message);
      return 0;
    }
  },
  async expire(key, seconds) {
    try {
      return await redis.expire(key, seconds);
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error.message);
      return 0;
    }
  },
  
  /**
   * 🔒 Acquire distributed lock with database fallback
   * @param {string} key - Lock key
   * @param {string} value - Unique lock identifier
   * @param {number} ttlSeconds - Lock TTL in seconds (default: 30)
   * @returns {Promise<boolean>} true if lock acquired, false if already locked
   */
  async acquireLock(key, value, ttlSeconds = 30) {
    // Try Redis first if circuit breaker allows
    if (circuitBreaker.canAttempt()) {
      try {
        const result = await redis.set(key, value, 'NX', 'EX', ttlSeconds);
        if (result === 'OK') {
          circuitBreaker.recordSuccess();
          return true;
        }
        return false; // Lock already held by someone else
      } catch (error) {
        circuitBreaker.recordFailure();
        logger.error(`Redis LOCK error for key ${key}:`, error.message);
        // Fall through to database fallback
      }
    }
    
    // 🔒 DATABASE FALLBACK: Use MongoDB for locking when Redis is down
    logger.warn('Redis unavailable, using database fallback for lock', { key });
    try {
      const mongoose = await import('mongoose');
      const LockModel = mongoose.default.models.Lock || mongoose.default.model('Lock', new mongoose.default.Schema({
        key: { type: String, required: true, unique: true, index: true },
        value: { type: String, required: true },
        expiresAt: { type: Date, required: true, index: true }
      }));
      
      // Try to create lock document
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      const lock = await LockModel.create({ key, value, expiresAt });
      
      if (lock) {
        logger.info('Database lock acquired', { key });
        return true;
      }
      return false;
    } catch (error) {
      // E11000 duplicate key error means lock already exists
      if (error.code === 11000) {
        logger.debug('Database lock already held', { key });
        return false;
      }
      logger.error('Database lock acquisition failed', { key, error: error.message });
      return false;
    }
  },
  
  /**
   * 🔓 Release distributed lock with database fallback
   * @param {string} key - Lock key
   * @param {string} value - Lock identifier to verify ownership
   * @returns {Promise<boolean>} true if lock released, false otherwise
   */
  async releaseLock(key, value) {
    let redisReleased = false;
    
    // Try Redis first if circuit breaker allows
    if (circuitBreaker.canAttempt()) {
      try {
        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        const result = await redis.eval(script, 1, key, value);
        circuitBreaker.recordSuccess();
        redisReleased = result === 1;
        if (redisReleased) return true;
      } catch (error) {
        circuitBreaker.recordFailure();
        logger.error(`Redis UNLOCK error for key ${key}:`, error.message);
        // Fall through to database fallback
      }
    }
    
    // 🔒 DATABASE FALLBACK: Release lock from MongoDB
    try {
      const mongoose = await import('mongoose');
      const LockModel = mongoose.default.models.Lock;
      
      if (!LockModel) {
        logger.warn('Lock model not found for release', { key });
        return false;
      }
      
      const result = await LockModel.deleteOne({ key, value });
      const dbReleased = result.deletedCount > 0;
      
      if (dbReleased) {
        logger.info('Database lock released', { key });
      }
      
      return redisReleased || dbReleased;
    } catch (error) {
      logger.error('Database lock release failed', { key, error: error.message });
      return false;
    }
  },
  
  /**
   * 🔒 Detect and clean stale locks (for dead-lock prevention)
   * @param {string} key - Lock key to check
   * @returns {Promise<boolean>} true if lock was stale and cleaned
   */
  async detectStaleLock(key) {
    try {
      // Check Redis TTL
      if (circuitBreaker.canAttempt()) {
        const ttl = await redis.ttl(key);
        
        // TTL -1 means key exists but has no expiration (stale)
        // TTL -2 means key doesn't exist
        if (ttl === -1) {
          logger.warn('Detected stale lock without TTL, removing', { key });
          await redis.del(key);
          return true;
        }
      }
      
      // Check database for expired locks
      const mongoose = await import('mongoose');
      const LockModel = mongoose.default.models.Lock;
      
      if (LockModel) {
        const staleLock = await LockModel.findOne({ 
          key, 
          expiresAt: { $lt: new Date() } 
        });
        
        if (staleLock) {
          logger.warn('Detected expired database lock, removing', { key });
          await LockModel.deleteOne({ _id: staleLock._id });
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Stale lock detection failed', { key, error: error.message });
      return false;
    }
  },
  
  /**
   * 🔧 Extend lock TTL for long-running operations
   * @param {string} key - Lock key
   * @param {string} value - Lock identifier to verify ownership
   * @param {number} additionalSeconds - Additional TTL seconds to add
   * @returns {Promise<boolean>} true if extended, false if lock doesn't exist or not owned
   */
  async extendLock(key, value, additionalSeconds = 30) {
    try {
      // Try Redis first
      if (circuitBreaker.canAttempt()) {
        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("expire", KEYS[1], ARGV[2])
          else
            return 0
          end
        `;
        const result = await redis.eval(script, 1, key, value, additionalSeconds);
        
        if (result === 1) {
          logger.debug('Lock TTL extended', { key, additionalSeconds });
          return true;
        }
      }
      
      // Database fallback
      const mongoose = await import('mongoose');
      const LockModel = mongoose.default.models.Lock;
      
      if (LockModel) {
        const lock = await LockModel.findOne({ key, value });
        
        if (lock) {
          lock.expiresAt = new Date(lock.expiresAt.getTime() + additionalSeconds * 1000);
          await lock.save();
          logger.debug('Database lock extended', { key, additionalSeconds });
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Lock extension failed', { key, error: error.message });
      return false;
    }
  },
  
  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus() {
    return {
      state: circuitBreaker.state,
      failureCount: circuitBreaker.failureCount,
      successCount: circuitBreaker.successCount,
      isHealthy: circuitBreaker.state === 'CLOSED',
      nextAttemptTime: circuitBreaker.state === 'OPEN' ? new Date(circuitBreaker.nextAttempt) : null
    };
  },
  
  /**
   * Cleanup expired database locks (should run periodically)
   */
  async cleanupExpiredLocks() {
    try {
      const mongoose = await import('mongoose');
      const LockModel = mongoose.default.models.Lock;
      
      if (!LockModel) return { deleted: 0 };
      
      const result = await LockModel.deleteMany({ 
        expiresAt: { $lt: new Date() } 
      });
      
      if (result.deletedCount > 0) {
        logger.info('Cleaned up expired database locks', { count: result.deletedCount });
      }
      
      return { deleted: result.deletedCount };
    } catch (error) {
      logger.error('Failed to cleanup expired locks', { error: error.message });
      return { deleted: 0 };
    }
  },
  
  /**
   * 🔌 Explicitly connect to Redis
   * Required to be called before using Redis operations
   */
  async connect() {
    try {
      if (redis.status === 'ready') {
        logger.info('Redis already connected');
        return true;
      }
      await redis.connect();
      return true;
    } catch (error) {
      logger.error('Redis connection failed:', error.message);
      return false;
    }
  },
  
  /**
   * Gracefully disconnect from Redis
   */
  async quit() {
    try {
      await redis.quit();
      return true;
    } catch (error) {
      logger.error('Redis quit error:', error.message);
      return false;
    }
  },
};

export default redis;