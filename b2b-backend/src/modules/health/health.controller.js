import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/responseHandler.js';
import { getOTPServiceStatus } from '../../services/otp.service.js';

/**
 * Basic health check - returns 200 if server is running
 */
export const basicHealthCheck = asyncHandler(async (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Detailed health check - checks all dependencies
 */
export const detailedHealthCheck = asyncHandler(async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {}
  };

  // Check MongoDB
  try {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    health.services.database = {
      status: dbState === 1 ? 'healthy' : 'unhealthy',
      state: states[dbState],
      host: mongoose.connection.host
    };

    if (dbState !== 1) {
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.database = {
      status: 'unhealthy',
      error: error.message
    };
    health.status = 'unhealthy';
  }

  // Check Redis (if configured)
  try {
    if (global.redisClient) {
      const redisPing = await global.redisClient.ping();
      health.services.redis = {
        status: redisPing === 'PONG' ? 'healthy' : 'unhealthy'
      };
    } else {
      health.services.redis = {
        status: 'not_configured'
      };
    }
  } catch (error) {
    health.services.redis = {
      status: 'unhealthy',
      error: error.message
    };
    health.status = 'degraded';
  }

  // Check OTP services
  const otpStatus = getOTPServiceStatus();
  health.services.otp = {
    sms: otpStatus.sms.available ? 'configured' : 'not_configured',
    email: otpStatus.email.available ? 'configured' : 'not_configured'
  };

  // System metrics
  health.system = {
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
    },
    nodeVersion: process.version,
    platform: process.platform
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Readiness probe - checks if service can accept traffic
 */
export const readinessCheck = asyncHandler(async (req, res) => {
  const ready = mongoose.connection.readyState === 1;

  if (ready) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      reason: 'Database not connected',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness probe - checks if service is alive
 */
export const livenessCheck = asyncHandler(async (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});
