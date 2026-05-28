import mongoose from 'mongoose';
import * as repo from './inventory.repository.js';
import AppError from '../../errors/AppError.js';
import Warehouse from '../warehouse/warehouse.model.js';
import { logger } from '../../config/logger.js';

// ➕ Add Stock
export const addStock = async ({ productId, warehouseId, stock }) => {
  if (stock <= 0) {
    throw new AppError('Stock must be greater than 0', 400);
  }

  let inventory = await repo.findInventory(productId, warehouseId);

  if (!inventory) {
    return repo.createInventory({ productId, warehouseId, stock });
  }

  inventory.stock += stock;
  return inventory.save();
};

export const getLowStockItems = async () => {
  return repo.findLowStock();
};

export const getInventoryStats = async () => {
  const stats = await repo.getStats();
  return {
    ...stats,
    productCount: stats.uniqueProducts.length
  };
};

// 📦 Get All Inventory
export const getInventory = async () => {
  return repo.findAll();
};

// 🔄 Update Stock
export const updateStock = async ({ productId, warehouseId, stock, type = 'SET' }) => {
  let inventory = await repo.findInventory(productId, warehouseId);

  if (!inventory) {
    if (type === 'SET') {
      return repo.createInventory({ productId, warehouseId, stock });
    }
    throw new AppError('Inventory record not found', 404);
  }

  if (type === 'ADD') {
    inventory.stock += stock;
  } else if (type === 'SUBTRACT') {
    if (inventory.stock < stock) {
      throw new AppError('Insufficient stock', 400);
    }
    inventory.stock -= stock;
  } else {
    inventory.stock = stock;
  }

  return inventory.save();
};

// ✅ Check Stock Availability
export const checkStock = async (productId, quantity) => {
  if (quantity <= 0) {
    throw new AppError('Quantity must be greater than 0', 400);
  }

  const items = await repo.findByProduct(productId);

  // 🔒 PHASE 3 FIX: Remove dangerous auto-seeding that silently creates phantom inventory
  // In production, missing inventory records are DATA INTEGRITY ERRORS, not opportunities to fake data
  if (items.length === 0) {
    logger.error('🚨 INVENTORY MISSING: No inventory records found for product', { 
      productId,
      requestedQuantity: quantity,
      severity: 'CRITICAL',
      action: 'ORDER_REJECTED'
    });
    throw new AppError(`Product inventory not configured. Please contact support. Product ID: ${productId}`, 404);
  }

  const totalStock = items.reduce((sum, i) => sum + i.stock, 0);

  if (totalStock < quantity) {
    logger.warn('Insufficient stock for product', { 
      productId, 
      available: totalStock, 
      requested: quantity 
    });
    throw new AppError('Insufficient stock', 400);
  }

  return true;
};

// 🔥 Atomic Stock Deduction with Retry Logic and Global Timeout Protection
export const reduceStock = async (productId, quantity, options = {}) => {
  const { session, maxRetries = 3, globalTimeoutMs = 10000 } = options; // 🔒 PHASE 2: Add global timeout (10s)
  
  if (quantity <= 0) {
    throw new AppError('Quantity must be greater than 0', 400);
  }

  // 🔒 PHASE 2 FIX: Global timeout to prevent infinite retry loops
  const startTime = Date.now();
  const checkTimeout = () => {
    if (Date.now() - startTime > globalTimeoutMs) {
      throw new AppError('Inventory update timed out due to high concurrency. Please try again.', 408);
    }
  };

  // Retry logic for optimistic locking conflicts
  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    checkTimeout(); // 🔒 Check timeout before each attempt
    
    try {
      const items = await repo.findByProduct(productId);

      if (items.length === 0) {
        throw new AppError(`No inventory found for product: ${productId}`, 404);
      }

      let remaining = quantity;
      const updates = [];

      // First, verify total stock is sufficient
      const totalStock = items.reduce((sum, i) => sum + i.stock, 0);
      if (totalStock < quantity) {
        throw new AppError(`Insufficient total stock for product: ${productId}. Available: ${totalStock}, Requested: ${quantity}`, 400);
      }

      // Plan deductions across warehouses
      for (const item of items) {
        if (remaining <= 0) break;

        const deductAmount = Math.min(item.stock, remaining);
        if (deductAmount <= 0) continue;

        // 🔒 Atomic Stock Deduction with optimistic locking
        // Includes both stock check AND version check for true optimistic locking
        const updated = await mongoose.model('Inventory').findOneAndUpdate(
          { 
            _id: item._id, 
            stock: { $gte: deductAmount },
            version: item.version // 🔥 Optimistic locking - ensures no concurrent modification
          },
          { 
            $inc: { stock: -deductAmount, version: 1 },
            $set: { updatedAt: new Date() }
          },
          { new: true, session }
        );

        if (!updated) {
          // Stock changed between read and write - retry
          throw new AppError('INVENTORY_CONFLICT', 409);
        }

        remaining -= deductAmount;
        updates.push({ item: item._id, deducted: deductAmount });
      }

      if (remaining > 0) {
        throw new AppError(`Failed to deduct full quantity for product: ${productId}`, 500);
      }

      logger.info(`✅ Stock deducted for product ${productId}: ${quantity} units`, { updates });
      return true;

    } catch (error) {
      checkTimeout(); // 🔒 Check timeout after error
      
      if (error.message === 'INVENTORY_CONFLICT' && attempt < maxRetries - 1) {
        // Optimistic locking conflict - retry with exponential backoff
        attempt++;
        lastError = error;
        
        // 🔒 PHASE 2 FIX: Enhanced backoff with jitter for backpressure protection
        const baseDelay = 100 * Math.pow(2, attempt); // Exponential: 200ms, 400ms, 800ms
        const jitter = Math.random() * 50; // Add random jitter (0-50ms) to prevent thundering herd
        const delay = Math.min(baseDelay + jitter, 1500); // Cap at 1.5s
        
        logger.warn(`⚠️ Inventory conflict, retrying in ${delay.toFixed(0)}ms (attempt ${attempt}/${maxRetries})`, {
          productId,
          quantity,
          elapsedMs: Date.now() - startTime
        });
        
        // 🔒 PHASE 2 FIX: Check if request was aborted (for HTTP requests)
        if (options.signal && options.signal.aborted) {
          logger.warn('Request aborted during inventory retry', { productId, attempt });
          throw new AppError('Request cancelled by client', 499);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // 🔒 PHASE 2 FIX: If timeout error, provide helpful message
      if (error.message.includes('timed out')) {
        logger.error('Inventory operation timed out', {
          productId,
          quantity,
          attempts: attempt + 1,
          elapsedMs: Date.now() - startTime
        });
      }
      
      throw error;
    }
  }

  // Max retries reached
  logger.error('Inventory update failed after max retries', {
    productId,
    quantity,
    attempts: maxRetries,
    elapsedMs: Date.now() - startTime
  });
  throw new AppError(`Inventory update failed after ${maxRetries} attempts due to high concurrency. Please try again.`, 409);
};

// 🔥 Restore Stock (for payment failures, order cancellations)
export const restoreStock = async (productId, quantity, options = {}) => {
  const { session } = options;
  
  if (quantity <= 0) {
    throw new AppError('Quantity must be greater than 0', 400);
  }

  // Find all inventory entries for this product
  const items = await repo.findByProduct(productId);

  if (items.length === 0) {
    console.warn(`No inventory found for product ${productId} to restore stock`);
    return false;
  }

  // Restore to the first warehouse (or you can implement more sophisticated logic)
  const firstWarehouse = items[0];
  
  const updated = await mongoose.model('Inventory').findOneAndUpdate(
    { _id: firstWarehouse._id },
    { $inc: { stock: quantity } },
    { new: true, session }
  );

  if (!updated) {
    throw new AppError('Failed to restore stock', 500);
  }

  console.log(`Restored ${quantity} units of product ${productId}`);
  return true;
};

// 🔒 Inventory Reservation System - Prevents stock deduction before payment
/**
 * Reserve inventory for pending payment (with TTL)
 * @param {string} orderId - Order ID for reservation tracking
 * @param {Array} items - Array of {productId, quantity}
 * @param {number} ttlSeconds - Reservation TTL (default: 15 minutes)
 */
export const reserveInventory = async (orderId, items, ttlSeconds = 900) => {
  const { redisClient } = await import('../../config/redis.js');
  
  // Validate input
  if (!items || items.length === 0) {
    throw new AppError('No items provided for reservation', 400);
  }
  
  try {
    // 1. Check stock availability for all items
    for (const item of items) {
      await checkStock(item.productId, item.quantity);
    }
    
    // 2. Create reservation records in Redis with TTL
    const reservationKey = `inventory:reservation:${orderId}`;
    const reservationData = {
      orderId,
      items,
      createdAt: Date.now(),
      expiresAt: Date.now() + (ttlSeconds * 1000)
    };
    
    await redisClient.setex(reservationKey, ttlSeconds, JSON.stringify(reservationData));
    
    logger.info('Inventory reserved', { orderId, items, ttlSeconds });
    return true;
  } catch (error) {
    logger.error('Inventory reservation failed', { orderId, error: error.message });
    throw error;
  }
};

/**
 * Finalize reservation - Actually deduct stock after successful payment
 * @param {string} orderId - Order ID
 * @param {Object} options - Transaction options
 */
export const finalizeReservation = async (orderId, options = {}) => {
  const { redisClient } = await import('../../config/redis.js');
  const { session } = options;
  
  try {
    // 1. Get reservation details
    const reservationKey = `inventory:reservation:${orderId}`;
    const reservationData = await redisClient.get(reservationKey);
    
    if (!reservationData) {
      logger.warn('Reservation not found or expired', { orderId });
      // Reservation expired, but payment succeeded - proceed with stock check
      throw new AppError('Reservation expired - please contact support', 400);
    }
    
    const reservation = JSON.parse(reservationData);
    
    // 2. Deduct stock for all items
    for (const item of reservation.items) {
      await reduceStock(item.productId, item.quantity, { session, maxRetries: 5 });
    }
    
    // 3. Delete reservation after successful deduction
    await redisClient.del(reservationKey);
    
    logger.info('Inventory reservation finalized', { orderId });
    return true;
  } catch (error) {
    logger.error('Failed to finalize reservation', { orderId, error: error.message });
    throw error;
  }
};

/**
 * Release reservation - Cancel reservation on payment failure/timeout
 * @param {string} orderId - Order ID
 */
export const releaseReservation = async (orderId) => {
  const { redisClient } = await import('../../config/redis.js');
  
  try {
    const reservationKey = `inventory:reservation:${orderId}`;
    const deleted = await redisClient.del(reservationKey);
    
    if (deleted) {
      logger.info('Inventory reservation released', { orderId });
    } else {
      logger.debug('Reservation already expired or not found', { orderId });
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to release reservation', { orderId, error: error.message });
    // Non-blocking - reservation will auto-expire
    return false;
  }
};