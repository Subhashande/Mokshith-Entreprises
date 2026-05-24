import mongoose from 'mongoose';
import { logger } from './logger.js';

let isConnected = false;
let isReplicaSet = false;

const connectDB = async () => {
  if (isConnected) {
    logger.info('Using existing MongoDB connection');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Optimized connection pool settings
      maxPoolSize: 100, // Increased from 10 for better concurrency  
      minPoolSize: 5, // Increased from 2
      maxIdleTimeMS: 30000,
      
      // Aggressive timeout settings for reliability
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 15000, // Reduced from 45000
      connectTimeoutMS: 10000,
      
      // Performance optimizations
      compressors: ['snappy', 'zlib'],
      
      // Read replica support - reads from secondaries when possible
      readPreference: process.env.MONGO_READ_PREFERENCE || 'primaryPreferred',
      readConcern: { level: 'local' },
      
      retryWrites: true,
      retryReads: true,
      
      // Write concern for data integrity
      writeConcern: {
        w: process.env.MONGO_WRITE_CONCERN || 'majority',
        wtimeout: 5000
      },
      
      family: 4 // Use IPv4, skip trying IPv6
    });

    isConnected = true;
    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Check if connected to a replica set
    try {
      const status = await mongoose.connection.db.admin().serverStatus();
      isReplicaSet = !!status.repl;
    } catch (err) {
      logger.warn('Could not detect replica set status, defaulting to standalone mode');
      isReplicaSet = false;
    }

    if (isReplicaSet) {
      logger.info('🔄 MongoDB Transaction support enabled (Replica Set detected)');
    } else {
      logger.warn('⚠️ MongoDB Transactions disabled (Standalone mode detected)');
    }

    // Create indexes for performance
    await createIndexes();
  } catch (error) {
    logger.error('❌ MongoDB connection failed', error);
    process.exit(1);
  }
};

/**
 * Create essential indexes for performance and search
 */
async function createIndexes() {
  try {
    const db = mongoose.connection.db;

    // Product text indexes for full-text search
    await db.collection('products').createIndex(
      { name: 'text', description: 'text', tags: 'text' },
      { 
        name: 'product_text_search',
        weights: { name: 10, tags: 5, description: 1 },
        default_language: 'english'
      }
    );

    // Category text indexes
    await db.collection('categories').createIndex(
      { name: 'text', description: 'text' },
      { name: 'category_text_search' }
    );

    // User indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ mobile: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ status: 1, role: 1 });

    // Order indexes for performance
    await db.collection('orders').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('orders').createIndex({ status: 1, paymentStatus: 1 });
    await db.collection('orders').createIndex({ paymentStatus: 1, updatedAt: -1 });
    await db.collection('orders').createIndex({ idempotencyKey: 1 }, { sparse: true, unique: true });

    // Payment indexes
    await db.collection('payments').createIndex({ orderId: 1 });
    await db.collection('payments').createIndex({ status: 1, createdAt: -1 });
    await db.collection('payments').createIndex({ razorpayPaymentId: 1 }, { sparse: true, unique: true });

    // Inventory indexes
    await db.collection('inventories').createIndex({ productId: 1, warehouseId: 1 }, { unique: true });
    await db.collection('inventories').createIndex({ productId: 1, stock: 1 });

    // TTL Indexes for automatic data cleanup and archival
    
    // Audit logs - expire after 90 days
    await db.collection('audits').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 7776000, name: 'audit_ttl' }
    );

    // Notifications - expire after 30 days
    await db.collection('notifications').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 2592000, name: 'notification_ttl' }
    );

    // OTP cleanup - expire immediately after expiresAt
    await db.collection('users').createIndex(
      { 'otp.expiresAt': 1 },
      { expireAfterSeconds: 0, sparse: true, name: 'otp_ttl' }
    );

    // Session/token cleanup - expire after 7 days
    await db.collection('sessions').createIndex(
      { lastActivity: 1 },
      { expireAfterSeconds: 604800, name: 'session_ttl' }
    );

    // Failed payment records - archive after 180 days
    await db.collection('payments').createIndex(
      { createdAt: 1, status: 1 },
      { 
        expireAfterSeconds: 15552000, 
        partialFilterExpression: { status: 'FAILED' },
        name: 'failed_payment_ttl'
      }
    );

    // Cart abandonment - clear after 7 days
    await db.collection('carts').createIndex(
      { updatedAt: 1 },
      { expireAfterSeconds: 604800, name: 'cart_ttl' }
    );

    // Temporary files/uploads - expire after 24 hours
    await db.collection('tempfiles').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 86400, name: 'tempfile_ttl' }
    );

    // Performance: Compound indexes for common queries
    await db.collection('orders').createIndex({ userId: 1, status: 1, createdAt: -1 });
    await db.collection('products').createIndex({ categoryId: 1, isActive: 1, createdAt: -1 });
    await db.collection('inventories').createIndex({ stock: 1, productId: 1 });
    await db.collection('payments').createIndex({ userId: 1, status: 1, createdAt: -1 });

    logger.info('✅ Database indexes created successfully');
  } catch (error) {
    logger.warn('⚠️ Some indexes may already exist:', error.message);
  }
}

mongoose.connection.on("connected", () => {
  logger.info("MongoDB connection established successfully");
});

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  logger.warn("MongoDB disconnected. Reconnecting...");
});

mongoose.connection.on("error", (err) => {
  logger.error(`MongoDB connection error: ${err}`);
});

export const getTransactionSupport = () => isReplicaSet;

export default connectDB;