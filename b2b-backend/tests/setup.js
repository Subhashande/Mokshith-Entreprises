import { jest, beforeAll, afterAll } from '@jest/globals';
import { setupTestDB, teardownTestDB } from './helpers/testUtils.js';
import dotenv from 'dotenv';

// 🔥 CRITICAL: Set test environment flags BEFORE any other imports
process.env.NODE_ENV = 'test';
process.env.ENABLE_QUEUE = 'false';
process.env.ENABLE_WORKERS = 'false';
process.env.ENABLE_CRON = 'false';
process.env.REDIS_MOCK = 'true'; // Signal to skip real Redis connection

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Validate required environment variables
const requiredEnvVars = ['NODE_ENV'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Set test-specific environment defaults
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing_with_minimum_64_characters_required';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_key_for_testing_minimum_64_chars_long_string';
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'test_razorpay_key';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_razorpay_secret';

console.log('🧪 Test environment initialized:', {
  NODE_ENV: process.env.NODE_ENV,
  ENABLE_QUEUE: process.env.ENABLE_QUEUE,
});

// Setup before all tests with extended timeout
beforeAll(async () => {
  console.log('🚀 Starting global test setup...');
  
  try {
    await setupTestDB();
    console.log('✅ Test database setup complete');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
}, 60000);

// Teardown after all tests with extended timeout
afterAll(async () => {
  console.log('🧹 Starting global test teardown...');
  
  try {
    await teardownTestDB();
    console.log('✅ Test database teardown complete');
  } catch (error) {
    console.error('❌ Failed to teardown test database:', error);
    // Don't throw - allow process to exit
  }
  
  // Give async operations time to complete
  await new Promise(resolve => setTimeout(resolve, 500));
}, 60000);

// Suppress console logs in tests (optional - can be disabled for debugging)
const SUPPRESS_LOGS = process.env.SUPPRESS_TEST_LOGS !== 'false';

if (SUPPRESS_LOGS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Promise Rejection in tests:', reason);
  // Don't exit - let Jest handle it
});

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception in tests:', error);
  // Don't exit - let Jest handle it
});
