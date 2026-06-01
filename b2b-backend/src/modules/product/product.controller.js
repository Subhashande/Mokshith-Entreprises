import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './product.service.js';
import { successResponse } from '../../utils/responseHandler.js';
import { uploadFile } from '../../services/fileUpload.service.js';
import { logger } from '../../config/logger.js';
import AppError from '../../errors/AppError.js';

/**
 * Middleware to load product and attach to req.product
 * Used for ownership checks in permission middleware
 */
export const loadProduct = asyncHandler(async (req, res, next) => {
  const product = await service.getProductById(req.params.id);
  
  if (!product) {
    throw new AppError('Product not found', 404);
  }
  
  req.product = product;
  next();
});

export const createProduct = asyncHandler(async (req, res) => {
  logger.debug('Product creation request', { hasFile: !!req.file, bodyKeys: Object.keys(req.body) });

  const data = { ...req.body };
  
  // 🔥 Normalize types from FormData (multer stringifies everything)
  if (data.price) data.price = Number(data.price);
  if (data.stock) data.stock = Number(data.stock);
  if (data.moq) data.moq = Number(data.moq);
  
  // Handle Boolean normalization
  if (data.isActive === 'true') data.isActive = true;
  if (data.isActive === 'false') data.isActive = false;

  if (req.file) {
    logger.debug('Processing uploaded file', { filename: req.file.originalname });
    const uploadResult = await uploadFile(req.file);
    logger.debug('Upload result', { url: uploadResult.url });
    data.image = uploadResult.url;
    data.imageUrl = uploadResult.url;
  }

  const product = await service.createProduct(data);
  successResponse(res, product, 'Product created', 201);
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
  logger.debug('Product update request', { id: req.params.id, hasFile: !!req.file });

  const data = { ...req.body };

  // 🔥 Normalize types from FormData (multer stringifies everything)
  if (data.price) data.price = Number(data.price);
  if (data.stock) data.stock = Number(data.stock);
  if (data.moq) data.moq = Number(data.moq);
  
  // Handle Boolean normalization
  if (data.isActive === 'true') data.isActive = true;
  if (data.isActive === 'false') data.isActive = false;

  // 🔥 CRITICAL FIX: Handle Image Upload
  if (req.file) {
    console.log('Processing uploaded file:', req.file.originalname);
    const uploadResult = await uploadFile(req.file);
    console.log('Upload Service Result:', uploadResult);
    
    // Store the URL in both fields to be safe
    data.image = uploadResult.url;
    data.imageUrl = uploadResult.url;
  } else {
    // If no new file, remove image from update object to avoid overwriting existing data with undefined
    delete data.image;
    delete data.imageUrl;
  }

  console.log('FINAL DATABASE PAYLOAD:', data);

  const product = await service.updateProduct(req.params.id, data);
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