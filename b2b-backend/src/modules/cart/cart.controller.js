import { asyncHandler } from '../../utils/asyncHandler.js';
import * as cartService from './cart.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const addToCart = asyncHandler(async (req, res) => {
  const cart = await cartService.addToCart(req.user.id, req.body);
  successResponse(res, cart, 'Item added to cart');
});

export const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getCart(req.user.id);
  successResponse(res, cart);
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const cart = await cartService.updateCartItem(
    req.user.id,
    req.params.productId,
    req.body.quantity
  );

  successResponse(res, cart, 'Cart item updated');
});

export const clearCart = asyncHandler(async (req, res) => {
  const cart = await cartService.clearCart(req.user.id);
  successResponse(res, cart, 'Cart cleared');
});

export const removeFromCart = asyncHandler(async (req, res) => {
  const cart = await cartService.removeFromCart(
    req.user.id,
    req.params.productId
  );

  successResponse(res, cart, 'Item removed from cart');
});