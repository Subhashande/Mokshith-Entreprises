import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './product.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const createProduct = asyncHandler(async (req, res) => {
  const product = await service.createProduct(req.body);
  successResponse(res, product, 'Product created');
});

export const getProducts = asyncHandler(async (req, res) => {
  const products = await service.getProducts(req.query);
  successResponse(res, products);
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await service.getProductById(req.params.id);
  successResponse(res, product);
});