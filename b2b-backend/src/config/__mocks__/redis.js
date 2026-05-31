import Redis from 'ioredis-mock';

// Create a mock Redis instance for testing
const mockRedis = new Redis();

// 🔒 Mock Circuit Breaker for Testing
const mockCircuitBreaker = {
  state: 'CLOSED',
  failureCount: 0,
  failureThreshold: 5,
  successCount: 0,
  successThreshold: 2,
  timeout: 30000,
  nextAttempt: 0,
  
  recordSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
      }
    }
  },
  
  recordFailure() {
    this.failureCount++;
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      this.successCount = 0;
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  },
  
  canAttempt() {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'HALF_OPEN') return true;
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.state = 'HALF_OPEN';
      this.successCount = 0;
      return true;
    }
    return false;
  },
  
  isOpen() {
    return this.state === 'OPEN';
  }
};

// Wrap Redis methods to match production API
const wrappedRedis = {
  // Core methods
  async get(key) {
    return mockRedis.get(key);
  },
  
  async set(...args) {
    return mockRedis.set(...args);
  },
  
  async setex(key, seconds, value) {
    return mockRedis.setex(key, seconds, value);
  },
  
  async del(...keys) {
    return mockRedis.del(...keys);
  },
  
  async keys(pattern) {
    return mockRedis.keys(pattern);
  },
  
  async flushdb() {
    return mockRedis.flushdb();
  },
  
  async flushall() {
    return mockRedis.flushall();
  },
  
  // List operations
  async lpush(key, ...values) {
    return mockRedis.lpush ? mockRedis.lpush(key, ...values) : values.length;
  },
  
  async rpush(key, ...values) {
    return mockRedis.rpush ? mockRedis.rpush(key, ...values) : values.length;
  },
  
  async ltrim(key, start, stop) {
    return mockRedis.ltrim ? mockRedis.ltrim(key, start, stop) : 'OK';
  },
  
  async lrange(key, start, stop) {
    return mockRedis.lrange ? mockRedis.lrange(key, start, stop) : [];
  },
  
  async llen(key) {
    return mockRedis.llen ? mockRedis.llen(key) : 0;
  },
  
  // Hash operations
  async hset(key, field, value) {
    return mockRedis.hset(key, field, value);
  },
  
  async hget(key, field) {
    return mockRedis.hget(key, field);
  },
  
  async hgetall(key) {
    return mockRedis.hgetall(key);
  },
  
  async hdel(key, ...fields) {
    return mockRedis.hdel(key, ...fields);
  },
  
  // Set operations
  async sadd(key, ...members) {
    return mockRedis.sadd ? mockRedis.sadd(key, ...members) : members.length;
  },
  
  async smembers(key) {
    return mockRedis.smembers ? mockRedis.smembers(key) : [];
  },
  
  async srem(key, ...members) {
    return mockRedis.srem ? mockRedis.srem(key, ...members) : members.length;
  },
  
  // TTL operations
  async expire(key, seconds) {
    return mockRedis.expire(key, seconds);
  },
  
  async ttl(key) {
    return mockRedis.ttl(key);
  },
  
  // Increment/Decrement
  async incr(key) {
    return mockRedis.incr(key);
  },
  
  async decr(key) {
    return mockRedis.decr(key);
  },
  
  async incrby(key, increment) {
    return mockRedis.incrby(key, increment);
  },
  
  async decrby(key, decrement) {
    return mockRedis.decrby(key, decrement);
  },
  
  async persist(key) {
    return mockRedis.persist(key);
  },

  async eval(...args) {
    if (typeof mockRedis.eval === 'function') {
      return mockRedis.eval(...args);
    }
    return null;
  },

  // 🔒 Distributed lock primitives (mirror production redisClient semantics)
  async acquireLock(key, value, ttlSeconds = 30) {
    const result = await mockRedis.set(key, value, 'NX', 'EX', ttlSeconds);
    return result === 'OK';
  },

  async releaseLock(key, value) {
    const current = await mockRedis.get(key);
    if (current === value) {
      await mockRedis.del(key);
      return true;
    }
    return false;
  },

  async extendLock(key, value, additionalSeconds = 30) {
    const current = await mockRedis.get(key);
    if (current === value) {
      await mockRedis.expire(key, additionalSeconds);
      return true;
    }
    return false;
  },

  async detectStaleLock(key) {
    const ttl = await mockRedis.ttl(key);
    // -1 => key exists without expiration (stale); -2 => key missing
    if (ttl === -1) {
      await mockRedis.del(key);
      return true;
    }
    return false;
  },

  getCircuitBreakerStatus() {
    return {
      state: mockCircuitBreaker.state,
      failureCount: mockCircuitBreaker.failureCount,
      successCount: mockCircuitBreaker.successCount,
      isHealthy: mockCircuitBreaker.state === 'CLOSED',
      nextAttemptTime:
        mockCircuitBreaker.state === 'OPEN' ? new Date(mockCircuitBreaker.nextAttempt) : null,
    };
  },

  async cleanupExpiredLocks() {
    return { deleted: 0 };
  },

  // Expose circuit breaker for tests
  circuitBreaker: mockCircuitBreaker,

  // Connection status methods
  status: 'ready',

  async quit() {
    return 'OK';
  },

  async disconnect() {
    return 'OK';
  }
};

export const redisClient = wrappedRedis;
export const circuitBreaker = mockCircuitBreaker;

// Default export mirrors production (src/config/redis.js exports the redis client
// as default), so modules that `import redis from '../config/redis.js'` and call
// list/primitive methods (lpush, ltrim, get, ...) work against the mock too.
export default wrappedRedis;
