import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import supertest from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import Order from '../../src/modules/order/order.model.js';
import Cart from '../../src/modules/cart/cart.model.js';
import Product from '../../src/modules/product/product.model.js';
import Category from '../../src/modules/category/category.model.js';
import User from '../../src/modules/user/user.model.js';
import Inventory from '../../src/modules/inventory/inventory.model.js';
import Warehouse from '../../src/modules/warehouse/warehouse.model.js';
import {
  clearDatabase,
  generateTestUser,
} from '../helpers/testUtils.js';
import { hashPassword } from '../../src/utils/hashPassword.js';
import { ROLES } from '../../src/constants/roles.js';
import { USER_STATUS } from '../../src/constants/userStatus.js';
import { ORDER_STATUS } from '../../src/constants/orderStatus.js';
import { PAYMENT_STATUS } from '../../src/constants/paymentStatus.js';
import { redisClient } from '../../src/config/redis.js';

const request = supertest(app);

/**
 * 🔥 PHASE 4: Checkout Workflow - End-to-End Integration Tests
 * Tests complete checkout flow: cart → validation → order → inventory sync
 */

describe('Checkout Workflow - End-to-End Tests', () => {
  let testUser;
  let userToken;
  let testCategory;
  let testProduct1;
  let testProduct2;
  let lowStockProduct;
  let testWarehouse;
  let validShippingAddress;

  beforeEach(async () => {
    await clearDatabase();
    await redisClient.flushdb();

    // Create test user
    const hashedPassword = await hashPassword('Test@1234');
    testUser = await User.create({
      ...generateTestUser({
        email: 'checkout@test.com',
        mobile: '9876543210',
      }),
      password: hashedPassword,
      role: ROLES.B2B_CUSTOMER,
      status: USER_STATUS.ACTIVE,
    });

    // Login user
    const loginResponse = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'checkout@test.com', password: 'Test@1234' });
    userToken = loginResponse.body.data.accessToken;

    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      slug: 'test-category',
    });

    // Create test warehouse
    testWarehouse = await Warehouse.create({
      name: 'Main Warehouse',
      location: {
        city: 'Test City',
      },
      capacity: 10000,
    });

    // Create test products
    testProduct1 = await Product.create({
      name: 'High Stock Product',
      price: 1000,
      stock: 100,
      categoryId: testCategory._id,
      isActive: true,
      moq: 10,
    });

    testProduct2 = await Product.create({
      name: 'Medium Stock Product',
      price: 2000,
      stock: 50,
      categoryId: testCategory._id,
      isActive: true,
      moq: 5,
    });

    lowStockProduct = await Product.create({
      name: 'Low Stock Product',
      price: 1500,
      stock: 5,
      categoryId: testCategory._id,
      isActive: true,
      moq: 5,
    });

    // Create inventory records
    await Inventory.create({
      productId: testProduct1._id,
      warehouseId: testWarehouse._id,
      stock: 100,
    });

    await Inventory.create({
      productId: testProduct2._id,
      warehouseId: testWarehouse._id,
      stock: 50,
    });

    await Inventory.create({
      productId: lowStockProduct._id,
      warehouseId: testWarehouse._id,
      stock: 5,
    });

    validShippingAddress = {
      name: 'John Doe',
      phone: '9876543210',
      addressLine: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
    };
  });

  afterEach(async () => {
    await redisClient.flushdb();
  });

  describe('Complete Checkout Flow - COD', () => {
    it('should complete full checkout: add to cart → checkout → order created → inventory updated', async () => {
      // Step 1: Add products to cart
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        })
        .expect(200);

      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct2._id.toString(),
          quantity: 5,
        })
        .expect(200);

      // Step 2: Verify cart contents
      const cartResponse = await request
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(cartResponse.body.data.items).toHaveLength(2);

      // Step 3: Checkout (create order)
      const orderResponse = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: validShippingAddress,
        })
        .expect(201);

      const orderId = orderResponse.body.data._id;
      expect(orderResponse.body.data.status).toBe(ORDER_STATUS.CONFIRMED);

      // Step 4: Verify cart is cleared
      const clearedCartResponse = await request
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(clearedCartResponse.body.data.items).toHaveLength(0);

      // Step 5: Verify inventory is updated
      const product1Updated = await Product.findById(testProduct1._id);
      const product2Updated = await Product.findById(testProduct2._id);

      expect(product1Updated.stock).toBe(90); // 100 - 10
      expect(product2Updated.stock).toBe(45); // 50 - 5

      // Step 6: Verify order is retrievable
      const fetchedOrderResponse = await request
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(fetchedOrderResponse.body.data._id).toBe(orderId);
    });

    it('should handle checkout with partial stock availability', async () => {
      // Add product with low stock to cart
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: lowStockProduct._id.toString(),
          quantity: 5, // Exactly available stock
        })
        .expect(200);

      // First checkout should succeed
      const response1 = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: validShippingAddress,
        })
        .expect(201);

      expect(response1.body.success).toBe(true);

      // Verify stock is depleted
      const productUpdated = await Product.findById(lowStockProduct._id);
      expect(productUpdated.stock).toBe(0);

      // Try to add same product to cart again
      const addToCartResponse = await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: lowStockProduct._id.toString(),
          quantity: 5,
        })
        .expect(400); // Should fail due to insufficient stock

      expect(addToCartResponse.body.message).toMatch(/insufficient stock/i);
    });

    it('should rollback inventory on order creation failure', async () => {
      // Mock a scenario where order creation fails after stock check
      // (e.g., by providing invalid address after items are validated)
      
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      const initialStock = testProduct1.stock;

      // Try to create order with invalid data (should fail)
      const response = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: {}, // Invalid address
        })
        .expect(400);

      expect(response.body.success).toBe(false);

      // Verify stock is unchanged
      const productAfterFailure = await Product.findById(testProduct1._id);
      expect(productAfterFailure.stock).toBe(initialStock);

      // Verify cart is not cleared
      const cartAfterFailure = await request
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(cartAfterFailure.body.data.items).toHaveLength(1);

      // Verify no order was created
      const orderCount = await Order.countDocuments({ userId: testUser._id });
      expect(orderCount).toBe(0);
    });
  });

  describe('Complete Checkout Flow - ONLINE Payment', () => {
    it('should complete checkout with payment pending: cart → order → inventory reserved', async () => {
      // Step 1: Add products to cart
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      // Step 2: Checkout with ONLINE payment
      const orderResponse = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'ONLINE',
          shippingAddress: validShippingAddress,
        })
        .expect(201);

      expect(orderResponse.body.data.status).toBe(ORDER_STATUS.PENDING_PAYMENT);
      expect(orderResponse.body.data.paymentStatus).toBe(PAYMENT_STATUS.PENDING);

      // Step 3: Verify cart is NOT cleared (pending payment)
      const cartResponse = await request
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(cartResponse.body.data.items.length).toBeGreaterThan(0);

      // Step 4: Verify inventory is RESERVED, not deducted
      const productAfterCheckout = await Product.findById(testProduct1._id);
      expect(productAfterCheckout.stock).toBe(100); // Stock unchanged until payment

      // Step 5: Verify reservation exists in Redis
      const reservationKey = `reservation:${orderResponse.body.data._id}`;
      const reservation = await redisClient.get(reservationKey);
      expect(reservation).toBeTruthy();
    });

    it('should expire reservation after timeout', async () => {
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      const orderResponse = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'ONLINE',
          shippingAddress: validShippingAddress,
        })
        .expect(201);

      const orderId = orderResponse.body.data._id;

      // Simulate TTL expiry by manually deleting reservation
      const reservationKey = `reservation:${orderId}`;
      await redisClient.del(reservationKey);

      // After expiry, stock should be available again
      const addToCartResponse = await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        })
        .expect(200); // Should succeed as reservation expired

      expect(addToCartResponse.body.success).toBe(true);
    });
  });

  describe('Concurrent Checkout Scenarios', () => {
    it('should handle concurrent checkouts for same product safely', async () => {
      // Set product stock to 15 (just enough for one 10-item order)
      testProduct1.stock = 15;
      await testProduct1.save();

      // Create two users
      const user2 = await User.create({
        ...generateTestUser({
          email: 'user2@test.com',
          mobile: '9876543211',
        }),
        password: await hashPassword('Test@1234'),
        role: ROLES.B2B_CUSTOMER,
        status: USER_STATUS.ACTIVE,
      });

      const login2 = await request
        .post('/api/v1/auth/login')
        .send({ identifier: 'user2@test.com', password: 'Test@1234' });
      const token2 = login2.body.data.accessToken;

      // Both users add same product to cart
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      // Try concurrent checkouts
      const checkout1 = request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: validShippingAddress,
        });

      const checkout2 = request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: validShippingAddress,
        });

      const results = await Promise.allSettled([checkout1, checkout2]);

      // One should succeed, one should fail
      const successes = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const failures = results.filter(r => r.status === 'fulfilled' && r.value.status !== 201);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);

      // Verify final stock is correct
      const finalProduct = await Product.findById(testProduct1._id);
      expect(finalProduct.stock).toBe(5); // 15 - 10 from one successful order
    });

    it('should prevent overselling during concurrent checkouts', async () => {
      testProduct1.stock = 12; // Not enough for two 10-item orders
      await testProduct1.save();

      // Create multiple users
      const users = [];
      const tokens = [];
      for (let i = 0; i < 3; i++) {
        const user = await User.create({
          ...generateTestUser({
            email: `user${i}@test.com`,
            mobile: `987654321${i}`,
          }),
          password: await hashPassword('Test@1234'),
          role: ROLES.B2B_CUSTOMER,
          status: USER_STATUS.ACTIVE,
        });
        users.push(user);

        const login = await request
          .post('/api/v1/auth/login')
          .send({ identifier: `user${i}@test.com`, password: 'Test@1234' });
        tokens.push(login.body.data.accessToken);

        // Add product to each cart
        await request
          .post('/api/v1/cart')
          .set('Authorization', `Bearer ${login.body.data.accessToken}`)
          .send({
            productId: testProduct1._id.toString(),
            quantity: 10,
          });
      }

      // Try concurrent checkouts
      const checkoutPromises = tokens.map(token =>
        request
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${token}`)
          .send({
            paymentMethod: 'COD',
            shippingAddress: validShippingAddress,
          })
      );

      const results = await Promise.allSettled(checkoutPromises);

      // Only one should succeed (stock 12 can only fulfill one 10-item order)
      const successes = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      expect(successes.length).toBe(1);

      // Verify no overselling occurred
      const finalProduct = await Product.findById(testProduct1._id);
      expect(finalProduct.stock).toBeGreaterThanOrEqual(0);
      expect(finalProduct.stock).toBe(2); // 12 - 10
    });
  });

  describe('Checkout Validation & Edge Cases', () => {
    it('should prevent checkout with inactive product in cart', async () => {
      // Add active product to cart
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      // Deactivate product
      testProduct1.isActive = false;
      await testProduct1.save();

      // Try checkout
      const response = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: validShippingAddress,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not available/i);
    });

    it('should prevent checkout when product is deleted', async () => {
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      // Delete product
      await Product.findByIdAndDelete(testProduct1._id);

      // Try checkout
      const response = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: validShippingAddress,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should prevent checkout when cart quantity exceeds available stock', async () => {
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      // Reduce stock below cart quantity
      testProduct1.stock = 5;
      await testProduct1.save();

      // Try checkout
      const response = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: validShippingAddress,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/insufficient stock/i);
    });

    it('should handle price changes between cart and checkout', async () => {
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      // Change product price
      testProduct1.price = 1500; // Was 1000
      await testProduct1.save();

      // Checkout should use current price
      const response = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: validShippingAddress,
        })
        .expect(201);

      // Should use new price: 1500 * 10 = 15000 + 18% GST = 17700
      expect(response.body.data.totalAmount).toBe(17700);
    });

    it('should prevent checkout without authentication', async () => {
      const response = await request
        .post('/api/v1/orders')
        .send({
          paymentMethod: 'COD',
          shippingAddress: validShippingAddress,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle very large cart (stress test)', async () => {
      // Add many different products
      const products = [];
      for (let i = 0; i < 10; i++) {
        const product = await Product.create({
          name: `Bulk Product ${i}`,
          price: 1000,
          stock: 100,
          categoryId: testCategory._id,
          isActive: true,
          moq: 5,
        });
        products.push(product);

        await request
          .post('/api/v1/cart')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            productId: product._id.toString(),
            quantity: 5,
          });
      }

      // Checkout large cart
      const response = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: validShippingAddress,
        })
        .expect(201);

      expect(response.body.data.items).toHaveLength(10);

      // Verify all products had stock deducted
      for (const product of products) {
        const updated = await Product.findById(product._id);
        expect(updated.stock).toBe(95); // 100 - 5
      }
    });
  });

  describe('Checkout Failure Recovery', () => {
    it('should maintain cart state on checkout failure', async () => {
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct2._id.toString(),
          quantity: 5,
        });

      // Try checkout with invalid data
      const response = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'COD',
          // Missing shipping address
        })
        .expect(400);

      expect(response.body.success).toBe(false);

      // Verify cart is unchanged
      const cartAfterFailure = await request
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(cartAfterFailure.body.data.items).toHaveLength(2);

      // User can retry checkout
      const retryResponse = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: validShippingAddress,
        })
        .expect(201);

      expect(retryResponse.body.success).toBe(true);
    });

    it('should handle database transaction failure gracefully', async () => {
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      // Store initial state
      const initialStock = testProduct1.stock;
      const initialCartCount = (await Cart.findOne({ userId: testUser._id })).items.length;
      const initialOrderCount = await Order.countDocuments({ userId: testUser._id });

      // Try to create order with stock that will fail validation mid-transaction
      testProduct1.stock = 5; // Below required quantity
      await testProduct1.save();

      const response = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: validShippingAddress,
        })
        .expect(400);

      expect(response.body.success).toBe(false);

      // Verify no partial writes occurred
      const finalOrderCount = await Order.countDocuments({ userId: testUser._id });
      expect(finalOrderCount).toBe(initialOrderCount);

      const finalCart = await Cart.findOne({ userId: testUser._id });
      expect(finalCart.items.length).toBe(initialCartCount);

      const finalProduct = await Product.findById(testProduct1._id);
      expect(finalProduct.stock).toBe(5); // Unchanged from when we set it
    });
  });

  describe('Checkout Order Lifecycle', () => {
    it('should transition through complete order lifecycle', async () => {
      // Add to cart
      await request
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id.toString(),
          quantity: 10,
        });

      // Checkout (COD)
      const orderResponse = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: validShippingAddress,
        })
        .expect(201);

      const orderId = orderResponse.body.data._id;

      // Verify initial status
      expect(orderResponse.body.data.status).toBe(ORDER_STATUS.CONFIRMED);

      // Fetch orders list
      const ordersListResponse = await request
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(ordersListResponse.body.data.orders).toHaveLength(1);
      expect(ordersListResponse.body.data.orders[0]._id).toBe(orderId);

      // Fetch single order
      const singleOrderResponse = await request
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(singleOrderResponse.body.data._id).toBe(orderId);
      expect(singleOrderResponse.body.data.status).toBe(ORDER_STATUS.CONFIRMED);
    });
  });
});
