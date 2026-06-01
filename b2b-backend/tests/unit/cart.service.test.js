import { describe, it, expect, jest, beforeAll, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';

// ESM-compatible module mocking: register mocks before dynamically importing the SUT
const mockFindCartByUser = jest.fn();
const mockCreateCart = jest.fn();
const mockUpdateCart = jest.fn();
const mockDeleteCartItem = jest.fn();
const mockFindById = jest.fn();

jest.unstable_mockModule('../../src/modules/cart/cart.repository.js', () => ({
  __esModule: true,
  findCartByUser: mockFindCartByUser,
  createCart: mockCreateCart,
  updateCart: mockUpdateCart,
  deleteCartItem: mockDeleteCartItem,
}));
jest.unstable_mockModule('../../src/modules/product/product.model.js', () => ({
  __esModule: true,
  default: { findById: mockFindById },
}));

// Aliases so existing test bodies referencing these names continue to work
const cartRepo = {
  findCartByUser: mockFindCartByUser,
  createCart: mockCreateCart,
  updateCart: mockUpdateCart,
  deleteCartItem: mockDeleteCartItem,
};
const Product = { findById: mockFindById };

let cartService;

beforeAll(async () => {
  cartService = await import('../../src/modules/cart/cart.service.js');
});

describe('Cart Service - Unit Tests', () => {
  let mockUserId;
  let mockProductId;
  let mockProduct;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Product model mock functions
    Product.findById = mockFindById;

    mockUserId = new mongoose.Types.ObjectId().toString();
    mockProductId = new mongoose.Types.ObjectId().toString();
    mockProduct = {
      _id: mockProductId,
      name: 'Test Product',
      price: 1000,
      basePrice: 1000,
      stock: 100,
      isActive: true,
      minOrderQty: 10,
      moq: 10,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('addToCart', () => {
    it('should add product to cart successfully', async () => {
      const quantity = 15;

      cartRepo.findCartByUser.mockResolvedValue(null);
      Product.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProduct),
        }),
      });
      cartRepo.createCart.mockResolvedValue({
        userId: mockUserId,
        items: [{ productId: mockProductId, quantity }],
      });

      const result = await cartService.addToCart(mockUserId, {
        productId: mockProductId,
        quantity,
      });

      expect(result).toBeDefined();
      expect(cartRepo.createCart).toHaveBeenCalledWith({
        userId: mockUserId,
        items: [{ productId: mockProductId, quantity }],
      });
    });

    it('should throw error for invalid product ID', async () => {
      await expect(
        cartService.addToCart(mockUserId, { productId: 'invalid-id', quantity: 10 })
      ).rejects.toThrow('Invalid product ID');
    });

    it('should throw error when quantity is less than 1', async () => {
      await expect(
        cartService.addToCart(mockUserId, { productId: mockProductId, quantity: 0 })
      ).rejects.toThrow('Quantity must be at least 1');
    });

    it('should throw error when product not found', async () => {
      Product.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        cartService.addToCart(mockUserId, { productId: mockProductId, quantity: 10 })
      ).rejects.toThrow('Product not found');
    });

    it('should throw error when product is not active', async () => {
      const inactiveProduct = { ...mockProduct, isActive: false };

      Product.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(inactiveProduct),
        }),
      });

      await expect(
        cartService.addToCart(mockUserId, { productId: mockProductId, quantity: 10 })
      ).rejects.toThrow('Product is not available');
    });

    it('should throw error when quantity is less than MOQ', async () => {
      const quantity = 5; // Less than MOQ of 10

      Product.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      await expect(
        cartService.addToCart(mockUserId, { productId: mockProductId, quantity })
      ).rejects.toThrow('Minimum order quantity');
    });

    it('should throw error when quantity exceeds stock', async () => {
      const quantity = 150; // More than stock of 100

      Product.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      await expect(
        cartService.addToCart(mockUserId, { productId: mockProductId, quantity })
      ).rejects.toThrow('Insufficient stock');
    });

    it('should add to existing cart item quantity', async () => {
      const existingCart = {
        userId: mockUserId,
        items: [
          {
            productId: { _id: mockProductId, toString: () => mockProductId },
            quantity: 10,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      cartRepo.findCartByUser.mockResolvedValue(existingCart);
      Product.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      await cartService.addToCart(mockUserId, { productId: mockProductId, quantity: 15 });

      expect(existingCart.items[0].quantity).toBe(25);
      expect(existingCart.save).toHaveBeenCalled();
    });

    it('should create new cart item when product not in cart', async () => {
      const existingCart = {
        userId: mockUserId,
        items: [],
        save: jest.fn().mockResolvedValue(true),
      };

      cartRepo.findCartByUser.mockResolvedValue(existingCart);
      Product.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      await cartService.addToCart(mockUserId, { productId: mockProductId, quantity: 15 });

      expect(existingCart.items).toHaveLength(1);
      expect(existingCart.items[0].productId).toBe(mockProductId);
      expect(existingCart.items[0].quantity).toBe(15);
      expect(existingCart.save).toHaveBeenCalled();
    });

    it('should handle products without MOQ', async () => {
      const productWithoutMOQ = { ...mockProduct, minOrderQty: null, moq: null };
      const quantity = 1;

      cartRepo.findCartByUser.mockResolvedValue(null);
      Product.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(productWithoutMOQ),
        }),
      });
      cartRepo.createCart.mockResolvedValue({
        userId: mockUserId,
        items: [{ productId: mockProductId, quantity }],
      });

      const result = await cartService.addToCart(mockUserId, {
        productId: mockProductId,
        quantity,
      });

      expect(result).toBeDefined();
      expect(cartRepo.createCart).toHaveBeenCalled();
    });

    it('should adjust quantity to MOQ if below minimum after addition', async () => {
      const existingCart = {
        userId: mockUserId,
        items: [
          {
            productId: { _id: mockProductId, toString: () => mockProductId },
            quantity: 3,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      cartRepo.findCartByUser.mockResolvedValue(existingCart);
      Product.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      await cartService.addToCart(mockUserId, { productId: mockProductId, quantity: 10 });

      expect(existingCart.items[0].quantity).toBeGreaterThanOrEqual(mockProduct.minOrderQty);
    });
  });

  describe('getCart', () => {
    it('should return user cart', async () => {
      const mockCart = {
        userId: mockUserId,
        items: [{ productId: mockProductId, quantity: 10 }],
      };

      cartRepo.findCartByUser.mockResolvedValue(mockCart);

      const result = await cartService.getCart(mockUserId);

      expect(result).toEqual(mockCart);
      expect(cartRepo.findCartByUser).toHaveBeenCalledWith(mockUserId);
    });

    it('should return null when cart does not exist', async () => {
      cartRepo.findCartByUser.mockResolvedValue(null);

      const result = await cartService.getCart(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('removeFromCart', () => {
    it('should remove product from cart successfully', async () => {
      const mockCart = {
        userId: mockUserId,
        items: [
          {
            productId: { _id: mockProductId, toString: () => mockProductId },
            quantity: 10,
          },
          {
            productId: {
              _id: new mongoose.Types.ObjectId(),
              toString: () => new mongoose.Types.ObjectId().toString(),
            },
            quantity: 5,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      cartRepo.findCartByUser.mockResolvedValue(mockCart);

      await cartService.removeFromCart(mockUserId, mockProductId);

      expect(mockCart.items).toHaveLength(1);
      expect(mockCart.save).toHaveBeenCalled();
    });

    it('should throw error for invalid product ID', async () => {
      await expect(
        cartService.removeFromCart(mockUserId, 'invalid-id')
      ).rejects.toThrow('Invalid product ID');
    });

    it('should throw error when cart not found', async () => {
      cartRepo.findCartByUser.mockResolvedValue(null);

      await expect(
        cartService.removeFromCart(mockUserId, mockProductId)
      ).rejects.toThrow('Cart not found');
    });

    it('should handle removing non-existent product from cart', async () => {
      const nonExistentProductId = new mongoose.Types.ObjectId().toString();
      const mockCart = {
        userId: mockUserId,
        items: [
          {
            productId: { _id: mockProductId, toString: () => mockProductId },
            quantity: 10,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      cartRepo.findCartByUser.mockResolvedValue(mockCart);

      await cartService.removeFromCart(mockUserId, nonExistentProductId);

      expect(mockCart.items).toHaveLength(1);
      expect(mockCart.save).toHaveBeenCalled();
    });

    it('should handle empty cart after removal', async () => {
      const mockCart = {
        userId: mockUserId,
        items: [
          {
            productId: { _id: mockProductId, toString: () => mockProductId },
            quantity: 10,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      cartRepo.findCartByUser.mockResolvedValue(mockCart);

      await cartService.removeFromCart(mockUserId, mockProductId);

      expect(mockCart.items).toHaveLength(0);
      expect(mockCart.save).toHaveBeenCalled();
    });
  });
});
