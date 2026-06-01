import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Redis from 'ioredis-mock';
import { jest } from '@jest/globals';

let mongoServer;
let redisClient;

// Setup test database
export const setupTestDB = async () => {
  try {
    // Only create if not already created
    if (!mongoServer) {
      mongoServer = await MongoMemoryServer.create();
    }
    
    const mongoUri = mongoServer.getUri();
    
    // Only connect if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 10000,
      });
    }
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
};

// Teardown test database
export const teardownTestDB = async () => {
  try {
    // Close mongoose connection if open
    if (mongoose.connection.readyState !== 0) {
      // Drop database first while connection is still active
      try {
        await mongoose.connection.dropDatabase();
      } catch (error) {
        console.error('Failed to drop database (non-fatal):', error.message);
      }
      
      // Close all connections
      await mongoose.connection.close(false);
      
      // Wait briefly for connection to fully close
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Stop MongoDB memory server
    if (mongoServer) {
      await mongoServer.stop({ doCleanup: true });
      mongoServer = null;
    }
  } catch (error) {
    console.error('Failed to teardown test database:', error);
    // Force cleanup even on error
    if (mongoServer) {
      try {
        await mongoServer.stop({ doCleanup: true });
      } catch (stopError) {
        console.error('Failed to stop mongoServer:', stopError.message);
      }
      mongoServer = null;
    }
  }
};

// Clear all collections with connection state validation
export const clearDatabase = async () => {
  // Defensive check: only clear if connected
  if (mongoose.connection.readyState !== 1) {
    console.warn('Skipping clearDatabase - MongoDB not connected (readyState:', mongoose.connection.readyState, ')');
    return;
  }
  
  try {
    const collections = mongoose.connection.collections;
    
    // Use Promise.allSettled to ensure all cleanups attempt to run
    const clearPromises = Object.keys(collections).map(async (key) => {
      try {
        await collections[key].deleteMany({});
      } catch (error) {
        console.error(`Failed to clear collection ${key}:`, error.message);
        throw error;
      }
    });
    
    await Promise.allSettled(clearPromises);
  } catch (error) {
    console.error('Error during clearDatabase:', error);
    throw error;
  }
};

// Setup Redis mock
export const setupRedis = () => {
  redisClient = new Redis({
    data: {}  // Initialize with empty data store
  });
  
  // Ensure expire method works correctly in mock
  const originalExpire = redisClient.expire.bind(redisClient);
  redisClient.expire = async function(key, seconds) {
    try {
      return await originalExpire(key, seconds);
    } catch (error) {
      // Silently ignore expire errors in tests
      return 1;
    }
  };
  
  return redisClient;
};

// Teardown Redis with proper async handling
export const teardownRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.flushall();
      // disconnect() is synchronous in ioredis-mock but we wrap for consistency
      await Promise.resolve(redisClient.disconnect());
    } catch (error) {
      console.error('Failed to teardown Redis:', error.message);
    } finally {
      redisClient = null;
    }
  }
};

// Mock external services
export const mockExternalServices = () => {
  // Mock Razorpay
  jest.mock('razorpay', () => {
    return jest.fn().mockImplementation(() => ({
      orders: {
        create: jest.fn().mockResolvedValue({
          id: 'order_mock123',
          amount: 10000,
          currency: 'INR',
          status: 'created',
        }),
        fetch: jest.fn().mockResolvedValue({
          id: 'order_mock123',
          status: 'paid',
        }),
      },
      payments: {
        fetch: jest.fn().mockResolvedValue({
          id: 'pay_mock123',
          order_id: 'order_mock123',
          status: 'captured',
          amount: 10000,
        }),
        capture: jest.fn().mockResolvedValue({
          id: 'pay_mock123',
          status: 'captured',
        }),
        refund: jest.fn().mockResolvedValue({
          id: 'rfnd_mock123',
          amount: 10000,
          status: 'processed',
        }),
      },
    }));
  });

  // Mock SendGrid/Email
  jest.mock('../../src/services/email.service.js', () => ({
    sendEmail: jest.fn().mockResolvedValue(true),
    sendOTPEmail: jest.fn().mockResolvedValue(true),
    sendOrderConfirmation: jest.fn().mockResolvedValue(true),
  }));

  // Mock Socket.IO
  jest.mock('socket.io', () => ({
    Server: jest.fn().mockImplementation(() => ({
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    })),
  }));

  // Mock BullMQ
  jest.mock('bullmq', () => ({
    Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue({ id: 'job123' }),
      process: jest.fn(),
      close: jest.fn(),
    })),
    Worker: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn(),
    })),
  }));
};

// Generate test user data
export const generateTestUser = (overrides = {}) => ({
  name: 'Test User',
  email: `test${Date.now()}@example.com`,
  mobile: `98765${Math.floor(Math.random() * 100000)}`,
  password: 'Test@1234',
  role: 'B2B_CUSTOMER',
  status: 'ACTIVE',
  ...overrides,
});

// Generate test product data
// Counter for unique SKU generation
let productCounter = 0;

export const generateTestProduct = (overrides = {}) => ({
  name: 'Test Product',
  sku: `TEST-${Date.now()}-${++productCounter}`,
  price: 1000,
  basePrice: 1000,
  stock: 100,
  moq: 10,
  category: 'Test Category',
  categoryId: new mongoose.Types.ObjectId(),
  vendorId: new mongoose.Types.ObjectId(),
  isActive: true,
  status: 'ACTIVE',
  ...overrides,
});

// Generate test address data
export const generateTestAddress = (overrides = {}) => ({
  name: 'Test Customer',
  phone: '9876543210',
  addressLine: '123 Test Street, Test Area',
  city: 'Test City',
  state: 'Test State',
  pincode: '123456',
  ...overrides,
});

// Generate test order item
export const generateTestOrderItem = (overrides = {}) => ({
  productId: new mongoose.Types.ObjectId(),
  name: 'Test Product',
  price: 1000,
  quantity: 10,
  ...overrides,
});

// Generate test order data
export const generateTestOrder = (overrides = {}) => {
  const items = overrides.items || [generateTestOrderItem()];
  const totalAmount = overrides.totalAmount || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  return {
    userId: new mongoose.Types.ObjectId(),
    items,
    totalAmount,
    paymentMethod: 'ONLINE',
    paymentStatus: 'PENDING',
    address: generateTestAddress(),
    status: 'PENDING',
    ...overrides,
  };
};

// Generate test payment data
export const generateTestPayment = (overrides = {}) => ({
  orderId: new mongoose.Types.ObjectId(),
  userId: new mongoose.Types.ObjectId(),
  amount: 10000,
  paymentMethod: 'RAZORPAY',
  status: 'PENDING',
  razorpayOrderId: `order_${Date.now()}`,
  ...overrides,
});

// Generate test inventory data
export const generateTestInventory = (overrides = {}) => ({
  productId: new mongoose.Types.ObjectId(),
  warehouseId: new mongoose.Types.ObjectId(),
  stock: 100,
  reservedStock: 0,
  soldStock: 0,
  ...overrides,
});

// Wait for async operations
export const waitFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Create authenticated request context
export const createAuthContext = (user) => ({
  user,
  ip: '127.0.0.1',
  headers: {
    authorization: `Bearer mock_token_${user._id}`,
  },
});

// Mock request object
export const mockRequest = (data = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  ip: '127.0.0.1',
  ...data,
});

// Mock response object
export const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.header = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

// Mock next function
export const mockNext = () => jest.fn();

// Verify JWT token structure
export const verifyTokenStructure = (token) => {
  expect(token).toBeDefined();
  expect(typeof token).toBe('string');
  expect(token.split('.')).toHaveLength(3);
};

// Verify password hash
export const verifyPasswordHash = (hash) => {
  expect(hash).toBeDefined();
  expect(typeof hash).toBe('string');
  expect(hash.length).toBeGreaterThan(50);
};

// Assert error response
export const assertErrorResponse = (error, statusCode, message) => {
  expect(error).toBeDefined();
  expect(error.statusCode).toBe(statusCode);
  if (message) {
    expect(error.message).toContain(message);
  }
};

// Assert validation error
export const assertValidationError = (error, field) => {
  assertErrorResponse(error, 400);
  if (field) {
    expect(error.message.toLowerCase()).toContain(field.toLowerCase());
  }
};

// Create test factories
export const factories = {
  user: generateTestUser,
  product: generateTestProduct,
  order: generateTestOrder,
  address: generateTestAddress,
  orderItem: generateTestOrderItem,
  payment: generateTestPayment,
  inventory: generateTestInventory,
};

export default {
  setupTestDB,
  teardownTestDB,
  clearDatabase,
  setupRedis,
  teardownRedis,
  mockExternalServices,
  generateTestUser,
  generateTestProduct,
  generateTestOrder,
  generateTestAddress,
  generateTestOrderItem,
  generateTestPayment,
  generateTestInventory,
  waitFor,
  createAuthContext,
  mockRequest,
  mockResponse,
  mockNext,
  verifyTokenStructure,
  verifyPasswordHash,
  assertErrorResponse,
  assertValidationError,
  factories,
};

/**
 * INFRASTRUCTURE UTILITIES FOR QUEUE/WORKER TESTING
 * These utilities ensure proper lifecycle management for BullMQ in tests
 */

/**
 * Safely close a BullMQ queue with timeout protection
 * @param {Queue} queue - BullMQ Queue instance
 * @param {number} timeout - Timeout in ms (default: 5000)
 */
export const safeCloseQueue = async (queue, timeout = 5000) => {
  if (!queue) return;
  
  try {
    // Race between close and timeout
    await Promise.race([
      queue.close(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Queue close timeout')), timeout)
      )
    ]);
  } catch (error) {
    console.error(`Failed to close queue ${queue.name}:`, error.message);
    // Continue - don't throw to allow other cleanup to proceed
  }
};

/**
 * Safely obliterate a BullMQ queue with timeout protection
 * Obliterate removes all jobs and queue data from Redis
 * @param {Queue} queue - BullMQ Queue instance
 * @param {number} timeout - Timeout in ms (default: 5000)
 */
export const safeObliterateQueue = async (queue, timeout = 5000) => {
  if (!queue) return;
  
  try {
    // Obliterate can hang if Redis is slow or disconnected
    await Promise.race([
      queue.obliterate({ force: true }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Queue obliterate timeout')), timeout)
      )
    ]);
  } catch (error) {
    console.error(`Failed to obliterate queue ${queue.name}:`, error.message);
    // Non-fatal - queue data might remain but test will proceed
  }
};

/**
 * Safely close a BullMQ worker with timeout protection
 * @param {Worker} worker - BullMQ Worker instance
 * @param {number} timeout - Timeout in ms (default: 5000)
 */
export const safeCloseWorker = async (worker, timeout = 5000) => {
  if (!worker) return;
  
  try {
    await Promise.race([
      worker.close(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Worker close timeout')), timeout)
      )
    ]);
  } catch (error) {
    console.error(`Failed to close worker ${worker.name}:`, error.message);
    // Continue - don't throw
  }
};

/**
 * Safely close a BullMQ QueueEvents instance with timeout protection
 * @param {QueueEvents} queueEvents - BullMQ QueueEvents instance
 * @param {number} timeout - Timeout in ms (default: 5000)
 */
export const safeCloseQueueEvents = async (queueEvents, timeout = 5000) => {
  if (!queueEvents) return;
  
  try {
    await Promise.race([
      queueEvents.close(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('QueueEvents close timeout')), timeout)
      )
    ]);
  } catch (error) {
    console.error('Failed to close QueueEvents:', error.message);
    // Continue - don't throw
  }
};

/**
 * Comprehensive cleanup for queue tests
 * Closes workers, obliterates queues, closes queue connections, and closes queue events
 * @param {Object} options - Cleanup options
 * @param {Worker[]} options.workers - Array of BullMQ workers
 * @param {Queue[]} options.queues - Array of BullMQ queues
 * @param {QueueEvents[]} options.queueEvents - Array of BullMQ QueueEvents instances
 * @param {boolean} options.obliterate - Whether to obliterate queue data (default: true)
 * @param {number} options.timeout - Timeout per operation (default: 5000)
 */
export const cleanupQueuesAndWorkers = async ({ 
  workers = [], 
  queues = [],
  queueEvents = [],
  obliterate = true,
  timeout = 5000 
} = {}) => {
  try {
    // Step 1: Close all workers first (stops processing new jobs)
    if (workers.length > 0) {
      const workerPromises = workers.map(worker => safeCloseWorker(worker, timeout));
      await Promise.allSettled(workerPromises);
    }
    
    // Step 2: Close all QueueEvents instances
    if (queueEvents.length > 0) {
      const queueEventsPromises = queueEvents.map(qe => safeCloseQueueEvents(qe, timeout));
      await Promise.allSettled(queueEventsPromises);
    }
    
    // Step 3: Obliterate queues if requested (removes job data)
    if (obliterate && queues.length > 0) {
      const obliteratePromises = queues.map(queue => safeObliterateQueue(queue, timeout));
      await Promise.allSettled(obliteratePromises);
    }
    
    // Step 4: Close all queue connections
    if (queues.length > 0) {
      const closePromises = queues.map(queue => safeCloseQueue(queue, timeout));
      await Promise.allSettled(closePromises);
    }
  } catch (error) {
    console.error('Error during cleanupQueuesAndWorkers:', error);
    // Don't throw - best effort cleanup
  }
};

/**
 * Wait for a queue job to complete with timeout
 * @param {Job} job - BullMQ Job instance
 * @param {QueueEvents} queueEvents - QueueEvents instance for the queue
 * @param {number} timeout - Timeout in ms (default: 10000)
 */
export const waitForJob = async (job, queueEvents, timeout = 10000) => {
  try {
    await Promise.race([
      job.waitUntilFinished(queueEvents),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Job ${job.id} timeout`)), timeout)
      )
    ]);
  } catch (error) {
    console.error(`Job ${job.id} failed or timed out:`, error.message);
    throw error;
  }
};
