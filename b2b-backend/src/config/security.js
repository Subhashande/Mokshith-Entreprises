import helmet from 'helmet';
import { corsConfig } from './cors.js';
import { apiLimiter } from './rateLimiter.js';

export const securityMiddleware = (app) => {
  app.use(helmet());
  app.use(corsConfig);
  app.use('/api', apiLimiter);
};