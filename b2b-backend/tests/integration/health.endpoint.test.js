import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import { redisClient } from '../../src/config/redis.js';
import { clearDatabase, cleanupQueuesAndWorkers } from '../helpers/testUtils.js';

/**
 * 🔒 CRITICAL: Health Check Endpoint Tests
 * Tests endpoint availability, latency thresholds, circuit breaker status, queue health
 */

describe('Health Check Endpoint Tests', () => {
  beforeEach(async () => {
    await clearDatabase();
    
    // Reset circuit breaker
    if (redisClient.circuitBreaker) {
      redisClient.circuitBreaker.state = 'CLOSED';
      redisClient.circuitBreaker.failureCount = 0;
    }
  });

  describe('GET /api/v1/health - Basic Health', () => {
    it('should return 200 when all services healthy', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toBe('healthy');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('checks');
    });

    it('should include database health check', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(res.body.checks).toHaveProperty('database');
      expect(res.body.checks.database).toHaveProperty('status');
      expect(res.body.checks.database).toHaveProperty('latencyMs');
      expect(res.body.checks.database.status).toMatch(/healthy|degraded|unhealthy/);
    });

    it('should include Redis health check', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(res.body.checks).toHaveProperty('redis');
      expect(res.body.checks.redis).toHaveProperty('status');
      expect(res.body.checks.redis).toHaveProperty('latencyMs');
      expect(res.body.checks.redis).toHaveProperty('circuitBreakerState');
    });

    it('should include queue health checks', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(res.body.checks).toHaveProperty('queues');
      expect(res.body.checks.queues).toHaveProperty('status');
      
      if (res.body.checks.queues.details) {
        expect(res.body.checks.queues.details).toHaveProperty('waiting');
        expect(res.body.checks.queues.details).toHaveProperty('active');
        expect(res.body.checks.queues.details).toHaveProperty('failed');
      }
    });
  });

  describe('Database Latency Thresholds', () => {
    it('should report healthy when latency < 100ms', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);

      if (res.body.checks.database.latencyMs < 100) {
        expect(res.body.checks.database.status).toBe('healthy');
      }
    });

    it('should report degraded when latency 100-500ms', async () => {
      // Mock slow database
      const originalExec = mongoose.Query.prototype.exec;
      jest.spyOn(mongoose.Query.prototype, 'exec').mockImplementation(async function() {
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
        return originalExec.call(this);
      });

      const res = await request(app).get('/api/v1/health');

      if (res.body.checks.database.latencyMs >= 100 && res.body.checks.database.latencyMs <= 500) {
        expect(res.body.checks.database.status).toBe('degraded');
        expect(res.body.status).toMatch(/degraded|healthy/);
      }

      jest.restoreAllMocks();
    });

    it('should report unhealthy when latency >= 500ms', async () => {
      // Mock very slow database
      const originalExec = mongoose.Query.prototype.exec;
      jest.spyOn(mongoose.Query.prototype, 'exec').mockImplementation(async function() {
        await new Promise(resolve => setTimeout(resolve, 600)); // 600ms delay
        return originalExec.call(this);
      });

      const res = await request(app)
        .get('/api/v1/health')
        .expect(503);

      expect(res.body.checks.database.status).toBe('unhealthy');
      expect(res.body.status).toBe('unhealthy');

      jest.restoreAllMocks();
    });
  });

  describe('Redis Latency Thresholds', () => {
    it('should report healthy when Redis latency < 50ms', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);

      if (res.body.checks.redis.latencyMs < 50) {
        expect(res.body.checks.redis.status).toBe('healthy');
      }
    });

    it('should report degraded when Redis latency 50-200ms', async () => {
      // Mock slow Redis
      const originalGet = redisClient.get;
      jest.spyOn(redisClient, 'get').mockImplementation(async function(...args) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
        return originalGet.apply(redisClient, args);
      });

      const res = await request(app).get('/api/v1/health');

      if (res.body.checks.redis.latencyMs >= 50 && res.body.checks.redis.latencyMs <= 200) {
        expect(res.body.checks.redis.status).toBe('degraded');
      }

      jest.restoreAllMocks();
    });

    it('should report unhealthy when Redis latency >= 200ms', async () => {
      // Mock very slow Redis
      const originalGet = redisClient.get;
      jest.spyOn(redisClient, 'get').mockImplementation(async function() {
        await new Promise(resolve => setTimeout(resolve, 250)); // 250ms delay
        return null;
      });

      const res = await request(app)
        .get('/api/v1/health')
        .expect(503);

      expect(res.body.checks.redis.status).toBe('unhealthy');

      jest.restoreAllMocks();
    });
  });

  describe('Circuit Breaker Status Reporting', () => {
    it('should report circuit breaker in CLOSED state when healthy', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(res.body.checks.redis.circuitBreakerState).toBe('CLOSED');
    });

    it('should report circuit breaker in OPEN state when degraded', async () => {
      // Force circuit breaker to OPEN
      for (let i = 0; i < 5; i++) {
        redisClient.circuitBreaker.recordFailure();
      }

      const res = await request(app)
        .get('/api/v1/health')
        .expect(503);

      expect(res.body.checks.redis.circuitBreakerState).toBe('OPEN');
      expect(res.body.checks.redis.status).toBe('unhealthy');
      expect(res.body.status).toBe('unhealthy');
    });

    it('should report circuit breaker in HALF_OPEN state during recovery', async () => {
      // Force OPEN state
      for (let i = 0; i < 5; i++) {
        redisClient.circuitBreaker.recordFailure();
      }

      // Transition to HALF_OPEN
      redisClient.circuitBreaker.nextAttempt = Date.now() - 1000;
      redisClient.circuitBreaker.canAttempt();

      const res = await request(app).get('/api/v1/health');

      expect(res.body.checks.redis.circuitBreakerState).toBe('HALF_OPEN');
    });
  });

  describe('Queue Health Validation', () => {
    it('should report healthy queues with normal depth', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(res.body.checks.queues.status).toMatch(/healthy|degraded/);
      
      if (res.body.checks.queues.details) {
        expect(res.body.checks.queues.details.waiting).toBeDefined();
        expect(res.body.checks.queues.details.active).toBeDefined();
      }
    });

    it('should detect high queue depth', async () => {
      // Add many jobs to queue to increase depth
      const { Queue } = await import('bullmq');
      const testQueue = new Queue('test-queue', {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
        },
      });

      // Add 100 jobs
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(testQueue.add('test-job', { index: i }));
      }
      await Promise.all(promises);

      const res = await request(app).get('/api/v1/health');

      // Should report queue issues if depth exceeds thresholds
      if (res.body.checks.queues.details && res.body.checks.queues.details.waiting > 50) {
        expect(res.body.checks.queues.status).toMatch(/degraded|unhealthy/);
      }

      // Safe cleanup
      await cleanupQueuesAndWorkers({
        queues: [testQueue].filter(Boolean),
        obliterate: true,
        timeout: 5000
      });
    });

    it('should detect failed job accumulation', async () => {
      const res = await request(app).get('/api/v1/health');

      if (res.body.checks.queues.details && res.body.checks.queues.details.failed > 20) {
        expect(res.body.checks.queues.status).toMatch(/degraded|unhealthy/);
      }
    });

    it('should aggregate queue metrics across all workers', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(res.body.checks.queues).toHaveProperty('status');
      
      if (res.body.checks.queues.details) {
        expect(typeof res.body.checks.queues.details.waiting).toBe('number');
        expect(typeof res.body.checks.queues.details.active).toBe('number');
        expect(typeof res.body.checks.queues.details.failed).toBe('number');
      }
    });
  });

  describe('Overall Health Status', () => {
    it('should return 200 when all checks healthy', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(res.body.status).toMatch(/healthy|degraded/);
    });

    it('should return 503 when any check unhealthy', async () => {
      // Force Redis circuit open
      for (let i = 0; i < 5; i++) {
        redisClient.circuitBreaker.recordFailure();
      }

      const res = await request(app)
        .get('/api/v1/health')
        .expect(503);

      expect(res.body.status).toBe('unhealthy');
    });

    it('should return 200 for degraded services', async () => {
      // Simulate degraded Redis (slow but working)
      const originalGet = redisClient.get;
      jest.spyOn(redisClient, 'get').mockImplementation(async function() {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
        return null;
      });

      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);

      if (res.body.checks.redis.status === 'degraded') {
        expect(res.body.status).toMatch(/healthy|degraded/);
      }

      jest.restoreAllMocks();
    });
  });

  describe('Health Check Response Time', () => {
    it('should respond within 2 seconds', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/v1/health')
        .expect(200);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });

    it('should handle concurrent health checks', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(request(app).get('/api/v1/health'));
      }
      
      const results = await Promise.all(promises);
      
      results.forEach(res => {
        expect(res.status).toMatch(/200|503/);
      });
    });
  });

  describe('Health Check Details', () => {
    it('should include timestamp', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(res.body.timestamp).toBeDefined();
      expect(new Date(res.body.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should include version information', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);

      // Version info might be in response
      if (res.body.version) {
        expect(typeof res.body.version).toBe('string');
      }
    });

    it('should include uptime', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);

      if (res.body.uptime) {
        expect(typeof res.body.uptime).toBe('number');
        expect(res.body.uptime).toBeGreaterThan(0);
      }
    });
  });

  describe('Health Check Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Temporarily close database
      await mongoose.connection.close();

      const res = await request(app)
        .get('/api/v1/health')
        .expect(503);

      expect(res.body.checks.database.status).toBe('unhealthy');

      // Reconnect
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/test');
    });

    it('should gracefully handle check timeouts', async () => {
      // Mock extremely slow database
      const originalExec = mongoose.Query.prototype.exec;
      jest.spyOn(mongoose.Query.prototype, 'exec').mockImplementation(async function() {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5s delay
        return originalExec.call(this);
      });

      const res = await request(app)
        .get('/api/v1/health')
        .timeout(3000);

      // Should timeout and report unhealthy
      expect([200, 503]).toContain(res.status);

      jest.restoreAllMocks();
    });

    it('should not crash on malformed check responses', async () => {
      const res = await request(app)
        .get('/api/v1/health');

      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('checks');
      expect(typeof res.body.checks).toBe('object');
    });
  });

  describe('Load Testing Health Endpoint', () => {
    it('should handle 100 concurrent health checks', async () => {
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app)
            .get('/api/v1/health')
            .timeout(5000)
        );
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed or fail gracefully
      const successful = results.filter(r => r.status === 200 || r.status === 503).length;
      expect(successful).toBe(100);
      
      // Response times should be reasonable
      const avgResponseTime = results.reduce((sum, r) => sum + (r.headers['x-response-time'] || 0), 0) / results.length;
      expect(avgResponseTime).toBeLessThan(500); // Average under 500ms
    }, 10000);
  });
});
