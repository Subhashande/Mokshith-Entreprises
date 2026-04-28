// Unified configuration constants

export const APP_CONFIG = {
  NAME: 'Mokshith B2B',
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  RAZORPAY_KEY_ID: import.meta.env.VITE_RAZORPAY_KEY_ID,
  ENVIRONMENT: import.meta.env.MODE,
};

export const IMAGE_CONFIG = {
  FALLBACK_URL: 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&w=500&q=80',
  CATEGORY_IMAGES: {
    rice: 'https://images.unsplash.com/photo-1586201327693-86750f72332e?auto=format&fit=crop&w=500&q=80',
    dal: 'https://images.unsplash.com/photo-1547825407-2d060104b7f8?auto=format&fit=crop&w=500&q=80',
    pulse: 'https://images.unsplash.com/photo-1547825407-2d060104b7f8?auto=format&fit=crop&w=500&q=80',
    oil: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80',
    sugar: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=500&q=80',
    salt: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=500&q=80',
  },
  LOADING_STRATEGY: 'lazy',
  DECODE_STRATEGY: 'async',
};

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
};

export const TOAST_CONFIG = {
  DURATION: 3000,
  POSITION: 'bottom-right',
};

export const VALIDATION_RULES = {
  EMAIL_PATTERN: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  PASSWORD_MIN_LENGTH: 8,
  PHONE_PATTERN: /^[6-9]\d{9}$/,
};

export const UI_CONFIG = {
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 300,
  SKELETON_COUNT: 8,
};
