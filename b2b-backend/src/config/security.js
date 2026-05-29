import helmet from 'helmet';
import { apiLimiter } from './rateLimiter.js';
import { logger } from './logger.js';

// 🔒 Express 5 compatible request sanitization.
// In Express 5, req.query/req.params are getter-only and cannot be reassigned,
// which crashes express-mongo-sanitize and xss-clean. We replicate their behavior
// by sanitizing request objects IN PLACE (no property reassignment).

// Escape HTML-significant characters to neutralize stored/reflected XSS (mirrors xss-clean).
const escapeHtml = (str) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

// Keys that enable NoSQL operator injection.
const isForbiddenKey = (key) => key.startsWith('$') || key.includes('.');

const sanitizeInPlace = (obj, onSanitizeKey) => {
  if (!obj || typeof obj !== 'object') return;

  for (const key of Object.keys(obj)) {
    const value = obj[key];

    if (isForbiddenKey(key)) {
      if (onSanitizeKey) onSanitizeKey(key);
      const safeKey = key.replace(/\$/g, '_').replace(/\./g, '_');
      delete obj[key];
      obj[safeKey] = value;
      if (value && typeof value === 'object') sanitizeInPlace(value, onSanitizeKey);
      continue;
    }

    if (typeof value === 'string') {
      obj[key] = escapeHtml(value);
    } else if (value && typeof value === 'object') {
      sanitizeInPlace(value, onSanitizeKey);
    }
  }
};

export const securityMiddleware = (app) => {
  // 🔥 Helmet: Secure HTTP headers with production-ready configuration
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https:"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
      }
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    frameguard: { action: 'deny' }, // Prevent clickjacking
    noSniff: true, // Prevent MIME sniffing
    xssFilter: true, // Enable XSS filter
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hidePoweredBy: true, // Hide X-Powered-By header
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    dnsPrefetchControl: { allow: false }
  }));

  // 🔥 Prevent NoSQL injection + XSS (Express 5 compatible, in-place sanitization)
  app.use((req, res, next) => {
    const onSanitizeKey = (key) => {
      logger.warn('⚠️ Potential NoSQL injection attempt blocked', {
        ip: req.ip,
        path: req.originalUrl,
        key,
      });
    };

    if (req.body) sanitizeInPlace(req.body, onSanitizeKey);
    // req.query / req.params are getters in Express 5 — mutate the returned object in place.
    try {
      if (req.query) sanitizeInPlace(req.query, onSanitizeKey);
    } catch {
      /* query getter not mutable in this context — body sanitization still applies */
    }
    try {
      if (req.params) sanitizeInPlace(req.params, onSanitizeKey);
    } catch {
      /* params getter not mutable in this context */
    }

    next();
  });

  // 🔥 Rate limiting (applied globally)
  app.use('/api', apiLimiter);
};