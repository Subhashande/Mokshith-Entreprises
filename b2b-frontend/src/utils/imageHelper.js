import { API_BASE_URL } from '../services/apiClient.js';

/**
 * Resolves a product image path to a full URL.
 * Handles both full URLs and relative backend paths.
 * 
 * @param {Object|string} productOrPath - The product object or the image path string
 * @returns {string} The full image URL or a placeholder
 */
export const getProductImage = (productOrPath) => {
  const placeholder = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300";
  if (!productOrPath) return placeholder;

  const imgPath = typeof productOrPath === 'string' 
    ? productOrPath 
    : (productOrPath.imageUrl || productOrPath.image || (productOrPath.images && productOrPath.images[0]));

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

/**
 * Gets a category-specific image based on category name.
 * 
 * @param {string|Object} categoryOrName - Category object or name string
 * @returns {string} The category image URL
 */
export const getCategoryImage = (categoryOrName) => {
  const categoryName = typeof categoryOrName === 'string' 
    ? categoryOrName 
    : categoryOrName?.name || 'General';
  
  const nameLower = categoryName.toLowerCase();
  
  // Category image mapping
  if (nameLower.includes('rice') || nameLower.includes('pulse') || nameLower.includes('dal')) {
    return "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=300";
  }
  if (nameLower.includes('oil')) {
    return "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=300";
  }
  if (nameLower.includes('spice') || nameLower.includes('masala') || nameLower.includes('turmeric') || nameLower.includes('mirchi')) {
    return "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=300";
  }
  if (nameLower.includes('sugar') || nameLower.includes('salt')) {
    return "https://images.unsplash.com/photo-1627485601819-747ee16fdb76?auto=format&fit=crop&q=80&w=300";
  }
  if (nameLower.includes('atta') || nameLower.includes('flour')) {
    return "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&q=80&w=300";
  }
  if (nameLower.includes('beverage') || nameLower.includes('drink')) {
    return "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=300";
  }
  if (nameLower.includes('dry fruit') || nameLower.includes('dryfruit') || nameLower.includes('almond') || nameLower.includes('cashew')) {
    return "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&q=80&w=300";
  }
  if (nameLower.includes('clean') || nameLower.includes('hygiene')) {
    return "https://images.unsplash.com/photo-1585128190989-44a06f858682?auto=format&fit=crop&q=80&w=300";
  }
  if (nameLower.includes('packaging') || nameLower.includes('material') || nameLower.includes('carton')) {
    return "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&q=80&w=300";
  }

  // Fallback image
  return "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300";
};
