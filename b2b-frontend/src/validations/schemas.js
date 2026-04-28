import { z } from 'zod';
import { VALIDATION_RULES } from '../config/constants';

// Login Schema
export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`),
});

// Registration Schema
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  phone: z
    .string()
    .regex(VALIDATION_RULES.PHONE_PATTERN, 'Invalid phone number (must be 10 digits starting with 6-9)'),
  password: z
    .string()
    .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  role: z.enum(['B2B_CUSTOMER', 'B2C_CUSTOMER', 'VENDOR'], {
    required_error: 'Please select a role',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Product Schema
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(100, 'Product name too long'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().min(0, 'Price must be positive'),
  stock: z.number().int().min(0, 'Stock must be non-negative'),
  minOrderQty: z.number().int().min(1, 'Minimum order quantity must be at least 1'),
  categoryId: z.string().min(1, 'Category is required'),
  unit: z.string().min(1, 'Unit is required'),
});

// Order Schema
export const orderSchema = z.object({
  shippingAddress: z.object({
    street: z.string().min(5, 'Street address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    zipCode: z.string().regex(/^\d{6}$/, 'Invalid PIN code (must be 6 digits)'),
    country: z.string().default('India'),
  }),
  paymentMethod: z.enum(['online', 'credit', 'hybrid'], {
    required_error: 'Please select a payment method',
  }),
});

// Profile Update Schema
export const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(VALIDATION_RULES.PHONE_PATTERN, 'Invalid phone number'),
  companyName: z.string().optional(),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number').optional().or(z.literal('')),
});

// Password Change Schema
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH, `New password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ['confirmNewPassword'],
});

// Export types for TypeScript users
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type OrderFormData = z.infer<typeof orderSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
