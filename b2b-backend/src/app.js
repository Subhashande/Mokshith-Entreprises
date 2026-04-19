import express from 'express';
import morgan from 'morgan';

import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { notFound } from './middlewares/notFound.middleware.js';

import { securityMiddleware } from './config/security.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import { idempotencyMiddleware } from './middlewares/idempotency.middleware.js';

const app = express();

// 🔥 Trust proxy (important for rate limiting, IP, cloud)
app.set('trust proxy', 1);

// 🔐 Security
securityMiddleware(app);

// 🔥 Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📜 Logging
app.use(morgan('dev'));
app.use(requestLogger);

// 🔁 Idempotency (safe retries)
app.use(idempotencyMiddleware);

// 🚀 Routes
app.use('/api', routes);

// ❌ Not Found
app.use(notFound);

// 💥 Error Handler (must be last)
app.use(errorHandler);

export default app;