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

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await service.updateProduct(req.params.id, req.body);
  successResponse(res, product, 'Product updated successfully');
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await service.deleteProduct(req.params.id);
  successResponse(res, null, 'Product deleted successfully');
});

export const updateStock = asyncHandler(async (req, res) => {
  const { stock } = req.body;
  const product = await service.updateStock(req.params.id, stock);
  successResponse(res, product, 'Stock updated successfully');
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const product = await service.updateStatus(req.params.id, isActive);
  successResponse(res, product, 'Product status updated successfully');
});