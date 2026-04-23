import express from 'express';
import morgan from 'morgan';

import path from 'path';
import { fileURLToPath } from 'url';

import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { notFound } from './middlewares/notFound.middleware.js';

import { securityMiddleware } from './config/security.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import { idempotencyMiddleware } from './middlewares/idempotency.middleware.js';

import logisticsRoutes from './modules/logistics/logistics.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 🔥 Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🔥 Trust proxy (important for rate limiting, IP, cloud)
app.set('trust proxy', 1);

// 🔐 Security
securityMiddleware(app);

// 🔥 Body parsers
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.includes('/webhook')) {
      req.rawBody = buf.toString();
    }
  }
}));
app.use(express.urlencoded({ extended: true }));

// 📜 Logging
app.use(morgan('dev'));
app.use(requestLogger);

// 🔁 Idempotency (safe retries)
app.use(idempotencyMiddleware);

// 🚀 Routes
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date() }));
app.use('/api', routes);

// 🔥 The previous emergency route for /api/v1/logistics was redundant and potentially conflicting
// since it is already registered via app.use('/api', routes) -> index.js -> v1.routes.js -> logistics.routes.js

// ❌ Not Found
app.use(notFound);

// 💥 Error Handler (must be last)
app.use(errorHandler);

export default app;