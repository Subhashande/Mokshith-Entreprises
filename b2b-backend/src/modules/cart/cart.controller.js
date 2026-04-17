import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './cart.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const addToCart = asyncHandler(async (req, res) => {
  const cart = await service.addToCart(req.user.id, req.body);
  successResponse(res, cart, 'Added to cart');
});

export const getCart = asyncHandler(async (req, res) => {
  const cart = await service.getCart(req.user.id);
  successResponse(res, cart);
});

export const removeFromCart = asyncHandler(async (req, res) => {
  const cart = await service.removeFromCart(
    req.user.id,
    req.params.productId
  );
  successResponse(res, cart, 'Item removed');
});