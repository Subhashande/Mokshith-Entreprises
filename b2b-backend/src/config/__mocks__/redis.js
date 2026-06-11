import Redis from 'ioredis-mock';

// Create a mock Redis instance for testing
const mockRedis = new Redis();

// Add missing methods that ioredis-mock doesn't fully implement
if (!mockRedis.lpush) {
  mockRedis.lpush = async function(key, ...values) {
    // Mock implementation - just return success
    return values.length;
  };
}

if (!mockRedis.ltrim) {
  mockRedis.ltrim = async function(key, start, stop) {
    // Mock implementation - just return OK
    return 'OK';
  };
}

if (!mockRedis.lrange) {
  mockRedis.lrange = async function(key, start, stop) {
    // Mock implementation - return empty array
    return [];
  };
}

if (!mockRedis.rpush) {
  mockRedis.rpush = async function(key, ...values) {
    // Mock implementation - just return success
    return values.length;
  };
}

export const redisClient = mockRedis;

// Export default raw client for modules that import the default Redis instance.
export default mockRedis;
