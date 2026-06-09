import { API_BASE_URL } from '../services/apiClient.js';

/**
 * Resolves a product image path to a full URL.
 * Handles both full URLs and relative backend paths.
 * 
 * @param {Object|string} productOrPath - The product object or the image path string
 * @returns {string} The full image URL or a placeholder
 */
export const getProductImage = (productOrPath) => {
  const placeholder = "/images/product-placeholder.svg";
  if (!productOrPath) return placeholder;

  const imgPath = typeof productOrPath === 'string' 
    ? productOrPath 
    : (productOrPath.image || productOrPath.imageUrl || (productOrPath.images && productOrPath.images[0]));

  if (!imgPath) return placeholder;

  // If it's already a full URL (http:// or https://), return it
  if (imgPath.startsWith('http')) return imgPath;

  // Otherwise prepend the base URL
  // Ensure we don't have double slashes
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  const path = imgPath.startsWith('/') ? imgPath : `/${imgPath}`;
  
  const finalUrl = `${baseUrl}${path}`;
  
  // Debug logging for troubleshooting
  if (import.meta.env.DEV) {
    console.log(`🖼️ [ImageHelper] Path: ${imgPath} -> URL: ${finalUrl}`);
  }
  
  return finalUrl;
};
