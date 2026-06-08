import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { notFound } from './middlewares/notFound.middleware.js';

import { corsConfig } from './config/cors.js';
import { securityMiddleware } from './config/security.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import { idempotencyMiddleware } from './middlewares/idempotency.middleware.js';
import { ipBlockMiddleware } from './middlewares/ipBlock.middleware.js';
import { timeoutMiddleware } from './middlewares/timeout.middleware.js';
import { correlationMiddleware } from './middlewares/correlation.middleware.js';
import { monitoringMiddleware, errorRateTracker } from './middlewares/monitoring.middleware.js';

import { sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './config/sentry.js';

import logisticsRoutes from './modules/logistics/logistics.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 🔥 THE ROBUST FIX: CHECK MULTIPLE POTENTIAL PATHS
const potentialPaths = [
  path.join(process.cwd(), 'src/uploads'),
  path.join(process.cwd(), 'uploads'),
  path.join(process.cwd(), 'b2b-backend', 'src/uploads'),
  path.join(process.cwd(), 'b2b-backend', 'uploads'),
  path.resolve(__dirname, '..', 'src/uploads'),
  path.resolve(__dirname, '..', 'uploads'),
  path.resolve(__dirname, '..', '..', 'uploads')
];

let uploadsPath = potentialPaths[0]; // Default

for (const p of potentialPaths) {
  if (fs.existsSync(p)) {
    uploadsPath = p;
    break;
  }
}

// Ensure directory exists if none found
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// 1. Global headers for cross-origin assets (images, etc)
app.use((req, res, next) => {
  // Only set * for static assets if needed, but the main CORS middleware handles the rest
  if (req.path.startsWith('/uploads')) {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

// 2. Serve static files with absolute control to fix ERR_ABORTED
app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  let foundPath = null;

  // Check all potential paths for the file
  for (const p of potentialPaths) {
    const fullPath = path.join(p, filename);
    if (fs.existsSync(fullPath)) {
      foundPath = fullPath;
      break;
    }
  }
  
  if (foundPath) {
    // Set explicit headers to bypass all security blocks
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.header('Cache-Control', 'public, max-age=3600');
    
    // Explicitly set MIME type for webp images
    if (filename.endsWith('.webp')) {
      res.type('image/webp');
    }
    
    return res.sendFile(foundPath);
  } else {
    return res.status(404).send(`Image not found: ${filename}`);
  }
});

// Also handle subdirectories like /uploads/invoices/:filename
app.get('/uploads/:folder/:filename', (req, res) => {
  const { folder, filename } = req.params;
  let foundPath = null;

  for (const p of potentialPaths) {
    const fullPath = path.join(p, folder, filename);
    if (fs.existsSync(fullPath)) {
      foundPath = fullPath;
      break;
    }
  }

  if (foundPath) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    return res.sendFile(foundPath);
  } else {
    return res.status(404).send(`File not found: ${folder}/${filename}`);
  }
});

// Backup for nested files if any
potentialPaths.forEach(p => {
  if (fs.existsSync(p)) {
    app.use('/uploads', express.static(p));
  }
});

// 🔥 Trust proxy (important for Render / cloud deployments)
app.set('trust proxy', 1);

// 🔥 Sentry request handler (MUST be first middleware)
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

// 🔥 Correlation ID middleware (must be early in chain)
app.use(correlationMiddleware);

// � Monitoring middleware (tracks performance metrics)
app.use(monitoringMiddleware);
app.use(errorRateTracker());

// �🔥 COMPRESSION - Compress all responses (gzip/deflate)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6 // Balance between speed and compression ratio
}));

// 🔥 CORS CONFIG
app.use(corsConfig);

// 🔥 IP Blocking
app.use(ipBlockMiddleware);

// 🔥 Request timeout protection (30 seconds)
app.use(timeoutMiddleware(30000));

// 🔥 Handle preflight requests (VERY IMPORTANT)
app.options(/.*/, corsConfig);


// 🛡️ Security middleware
securityMiddleware(app);

// 🍪 Cookie parser (must be before routes that use cookies)
app.use(cookieParser());

// 🔥 Body parsers with size limits
app.use(express.json({
  limit: '10mb', // Prevent large payload attacks
  verify: (req, res, buf) => {
    if (req.originalUrl.includes('/webhook')) {
      req.rawBody = buf.toString();
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb',
  parameterLimit: 100 // Limit number of parameters
}));


// 📜 Logging (now using structured format with correlation IDs)
app.use(morgan('dev'));
app.use(requestLogger);


// 🔁 Idempotency middleware
app.use(idempotencyMiddleware);


// ❤️ Health check routes
import { healthCheck, livenessProbe, readinessProbe, getMetrics } from './controllers/health.controller.js';

app.get('/health', healthCheck);
app.get('/health/live', livenessProbe);
app.get('/health/ready', readinessProbe);
app.get('/metrics', getMetrics); // System metrics for monitoring


// 🚀 API routes
app.use('/api', routes);


// ❌ Not Found handler
app.use(notFound);


// 💥 Sentry error handler (MUST be after routes, before other error handlers)
app.use(sentryErrorHandler());

// 💥 Global error handler (must be last)
app.use(errorHandler);


export default app;