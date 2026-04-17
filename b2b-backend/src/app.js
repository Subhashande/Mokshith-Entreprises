import express from 'express';
import morgan from 'morgan';

import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { notFound } from './middlewares/notFound.middleware.js';

import { securityMiddleware } from './config/security.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import { idempotencyMiddleware } from './middlewares/idempotency.middleware.js';

const app = express();

// 🔐 Security
securityMiddleware(app);

// 🔧 Core middlewares
app.use(express.json());
app.use(morgan('dev'));
app.use(requestLogger);

// 🔁 Idempotency (important for POST APIs)
app.use(idempotencyMiddleware);

// Routes
app.use('/api', routes);

// Not Found
app.use(notFound);

// Error Handler
app.use(errorHandler);

export default app;