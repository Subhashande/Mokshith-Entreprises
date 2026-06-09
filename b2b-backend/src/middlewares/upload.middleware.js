import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AppError from '../errors/AppError.js';
import crypto from 'crypto';
import { s3Service } from '../services/s3.service.js';
import { logger } from '../config/logger.js';
import { validateAndSanitizeUpload } from '../services/fileValidation.service.js';

// 🔥 Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 🔥 Ensure we save to the EXACT SAME root uploads folder being served
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    // Auto-create folder if missing (failsafe)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 🔥 Security: Generate unique filename to prevent path traversal
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const ext = path.extname(sanitizedOriginalName);
    const basename = path.basename(sanitizedOriginalName, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

// 🔥 File filter for security
const fileFilter = (req, file, cb) => {
  try {
    // Basic validation in fileFilter (detailed validation happens after upload)
    const allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
    
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new AppError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`, 400), false);
    }
    
    // Additional security: check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx'];
    
    if (!allowedExts.includes(ext)) {
      return cb(new AppError('Invalid file extension', 400), false);
    }
    
    cb(null, true);
  } catch (error) {
    logger.error('File filter error:', error);
    cb(new AppError('File validation error', 400), false);
  }
};

export const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5, // Max 5 files at once
  }
});

// Specialized upload for images only
export const uploadImage = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new AppError('Only image files are allowed', 400), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: MAX_FILE_SIZE,
  }
});

/**
 * Cloud upload middleware - uploads to S3 if enabled, falls back to local
 */
export const uploadToCloud = (fieldName, options = {}) => {
  const { folder = 'uploads', maxFiles = 1 } = options;

  // Use memory storage for S3 uploads
  const memoryStorage = multer.memoryStorage();
  
  const uploader = multer({
    storage: s3Service.isEnabled() ? memoryStorage : storage,
    fileFilter,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: maxFiles
    }
  });

  // Return middleware chain
  return async (req, res, next) => {
    // First, handle multer upload
    const uploadHandler = maxFiles === 1 
      ? uploader.single(fieldName)
      : uploader.array(fieldName, maxFiles);

    uploadHandler(req, res, async (err) => {
      if (err) {
        return next(new AppError(err.message, 400));
      }

      try {
        // Validate and sanitize uploaded files
        if (req.file) {
          // 🔒 Magic number validation for single file
          if (req.file.path) {
            const fs = await import('fs');
            const buffer = fs.readFileSync(req.file.path);
            req.file.buffer = buffer; // Add buffer for validation
          }
          
          // Single file validation with magic number check
          const validated = validateAndSanitizeUpload(req.file, folder);
          req.file = validated;

          // If S3 is enabled, upload to S3
          if (s3Service.isEnabled()) {
            const result = await s3Service.upload(req.file, folder);
            req.file.s3 = result;
            req.file.url = result.url;
            logger.info('File uploaded to S3', { key: result.key });
          }
        } else if (req.files && req.files.length > 0) {
          // Multiple files validation
          const validatedFiles = [];
          const fs = await import('fs');
          
          for (const file of req.files) {
            // 🔒 Magic number validation for each file
            if (file.path) {
              const buffer = fs.readFileSync(file.path);
              file.buffer = buffer; // Add buffer for validation
            }
            const validated = validateAndSanitizeUpload(file, folder);
            validatedFiles.push(validated);
          }
          
          req.files = validatedFiles;

          // If S3 is enabled, upload all to S3
          if (s3Service.isEnabled()) {
            const results = await s3Service.uploadMultiple(req.files, folder);
            req.files.forEach((file, index) => {
              file.s3 = results[index];
              file.url = results[index].url;
            });
            logger.info('Files uploaded to S3', { count: results.length });
          }
        }

        next();
      } catch (error) {
        logger.error('File upload/validation error:', error);
        return next(new AppError(error.message || 'Failed to upload files', error.statusCode || 500));
      }
    });
  };
};

/**
 * Image upload to cloud
 */
export const uploadImageToCloud = (fieldName = 'image') => {
  return uploadToCloud(fieldName, { folder: 'images', maxFiles: 1 });
};

/**
 * Multiple images upload to cloud
 */
export const uploadImagesToCloud = (fieldName = 'images', maxFiles = 5) => {
  return uploadToCloud(fieldName, { folder: 'images', maxFiles });
};