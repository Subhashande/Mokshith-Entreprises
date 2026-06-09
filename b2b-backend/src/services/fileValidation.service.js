import crypto from 'crypto';
import AppError from '../errors/AppError.js';
import { logger } from '../config/logger.js';
import path from 'path';

/**
 * Secure File Upload Validation Service
 * Implements OWASP file upload security guidelines
 */

// Allowed file types with MIME validation
const ALLOWED_TYPES = {
  images: {
    mimes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    maxSize: 10 * 1024 * 1024, // 10MB
    magicNumbers: {
      'image/jpeg': ['FFD8FF'],
      'image/png': ['89504E47'],
      'image/gif': ['474946383761', '474946383961'], // GIF87a, GIF89a
      'image/webp': ['52494646']
    }
  },
  documents: {
    mimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    extensions: ['.pdf', '.doc', '.docx'],
    maxSize: 20 * 1024 * 1024 // 20MB
  },
  spreadsheets: {
    mimes: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
    extensions: ['.xls', '.xlsx', '.csv'],
    maxSize: 15 * 1024 * 1024 // 15MB
  }
};

// Dangerous file extensions to block
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar',
  '.app', '.deb', '.rpm', '.dmg', '.iso', '.msi', '.com',
  '.scr', '.hta', '.cpl', '.msc', '.pif', '.application'
];

// Dangerous filename patterns
const BLOCKED_PATTERNS = [
  /\.\./,  // Path traversal
  /[<>:"|?*]/,  // Invalid Windows characters
  /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\.|$)/i,  // Windows reserved names
  /\x00/,  // Null bytes
  /[\x00-\x1f]/  // Control characters
];

/**
 * Validate file upload
 */
export const validateFileUpload = (file, category = 'images') => {
  if (!file) {
    throw new AppError('No file provided', 400);
  }

  const config = ALLOWED_TYPES[category];
  
  if (!config) {
    throw new AppError('Invalid file category', 400);
  }

  // 1. Check file exists and has required fields
  if (!file.originalname || !file.mimetype || !file.size) {
    throw new AppError('Invalid file format', 400);
  }

  // 2. Check file size
  if (file.size > config.maxSize) {
    throw new AppError(
      `File size exceeds maximum allowed (${Math.round(config.maxSize / 1024 / 1024)}MB)`,
      400
    );
  }

  if (file.size === 0) {
    throw new AppError('Empty file not allowed', 400);
  }

  // 3. Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!config.extensions.includes(ext)) {
    throw new AppError(
      `File type not allowed. Allowed types: ${config.extensions.join(', ')}`,
      400
    );
  }

  // 4. Check for dangerous extensions
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    logger.error('Blocked file extension detected', {
      filename: file.originalname,
      extension: ext
    });
    throw new AppError('This file type is not allowed for security reasons', 400);
  }

  // 5. Check MIME type
  if (!config.mimes.includes(file.mimetype)) {
    logger.warn('MIME type mismatch', {
      filename: file.originalname,
      declaredMime: file.mimetype,
      expectedMimes: config.mimes
    });
    throw new AppError('Invalid file type', 400);
  }

  // 6. Validate filename
  validateFilename(file.originalname);

  // 7. Check magic numbers (file signature) if buffer available
  if (file.buffer && config.magicNumbers) {
    validateMagicNumbers(file.buffer, file.mimetype, config.magicNumbers);
  }

  return true;
};

/**
 * Validate filename for security issues
 */
const validateFilename = (filename) => {
  // Check for dangerous patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(filename)) {
      logger.error('Dangerous filename pattern detected', { filename });
      throw new AppError('Invalid filename', 400);
    }
  }

  // Check filename length
  if (filename.length > 255) {
    throw new AppError('Filename too long', 400);
  }

  // Check for null bytes
  if (filename.includes('\x00')) {
    logger.error('Null byte in filename detected', { filename });
    throw new AppError('Invalid filename', 400);
  }

  return true;
};

/**
 * Validate magic numbers (file signatures)
 * Prevents MIME type spoofing
 */
const validateMagicNumbers = (buffer, mimetype, magicNumbers) => {
  const signatures = magicNumbers[mimetype];
  
  if (!signatures) {
    return true; // No signature validation for this type
  }

  const header = buffer.slice(0, 12).toString('hex').toUpperCase();

  const isValid = signatures.some(signature => header.startsWith(signature));

  if (!isValid) {
    logger.warn('Magic number validation failed', {
      mimetype,
      actualHeader: header,
      expectedSignatures: signatures
    });
    throw new AppError('File content does not match declared type', 400);
  }

  return true;
};

/**
 * Sanitize filename for safe storage
 */
export const sanitizeFilename = (filename) => {
  // Remove path components
  const basename = path.basename(filename);

  // Replace unsafe characters
  let sanitized = basename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');

  // Ensure extension is preserved
  const ext = path.extname(basename);
  const nameWithoutExt = path.basename(basename, ext);

  // Generate unique prefix
  const uniquePrefix = crypto.randomBytes(8).toString('hex');

  return `${uniquePrefix}_${nameWithoutExt.slice(0, 50)}${ext}`;
};

/**
 * Basic malware detection using pattern matching
 * Note: This is NOT a replacement for proper antivirus scanning
 */
export const basicMalwareCheck = (buffer) => {
  if (!buffer) return true;

  // 1. Check for executable headers at the START of the file
  // These are only dangerous if they define the file type
  const executableHeaders = [
    { pattern: Buffer.from('MZ'), name: 'DOS/Windows Executable' },
    { pattern: Buffer.from('PK'), name: 'ZIP/Office Archive' }
  ];

  for (const { pattern, name } of executableHeaders) {
    if (buffer.slice(0, pattern.length).equals(pattern)) {
      logger.error(`Executable header detected at start of file: ${name}`);
      throw new AppError('File failed security validation: Executable or Archive not allowed', 400);
    }
  }

  // 2. Check for suspicious scripts ANYWHERE in the file
  const suspiciousPatterns = [
    // Script tags and dangerous code patterns
    Buffer.from('<script'),
    Buffer.from('javascript:'),
    Buffer.from('eval('),
    Buffer.from('exec('),
    
    // PHP code
    Buffer.from('<?php'),
    
    // Shell scripts
    Buffer.from('#!/bin/'),
    
    // Macro-enabled Office files (can contain malware)
    Buffer.from('xl/vbaProject.bin'),
    Buffer.from('word/vbaProject.bin')
  ];

  for (const pattern of suspiciousPatterns) {
    if (buffer.includes(pattern)) {
      logger.error('Suspicious content detected in file upload');
      throw new AppError('File failed security validation: Suspicious content detected', 400);
    }
  }

  return true;
};

/**
 * Comprehensive file validation
 */
export const validateAndSanitizeUpload = (file, category = 'images') => {
  // Validate file
  validateFileUpload(file, category);

  // Basic malware check
  if (file.buffer) {
    basicMalwareCheck(file.buffer);
  }

  // Sanitize filename
  const safeName = sanitizeFilename(file.originalname);

  return {
    ...file,
    safeName,
    validated: true
  };
};

/**
 * ClamAV integration for production malware scanning
 * This is a placeholder - implement with actual ClamAV client in production
 */
export const scanWithClamAV = async (filePath) => {
  // TODO: Implement ClamAV scanning in production
  // Example with node-clam:
  // const NodeClam = require('clamscan');
  // const clamscan = await new NodeClam().init();
  // const { isInfected } = await clamscan.scanFile(filePath);
  // if (isInfected) throw new AppError('File contains malware', 400);
  
  logger.info('ClamAV scanning not configured (placeholder)');
  return true;
};

export default {
  validateFileUpload,
  validateFilename,
  sanitizeFilename,
  basicMalwareCheck,
  validateAndSanitizeUpload,
  scanWithClamAV,
  ALLOWED_TYPES,
  BLOCKED_EXTENSIONS
};
