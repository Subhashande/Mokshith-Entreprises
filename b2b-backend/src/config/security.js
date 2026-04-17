import helmet from 'helmet';
import cors from 'cors';

export const securityMiddleware = (app) => {
  app.use(helmet());

  app.use(
    cors({
      origin: '*', // change in production
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    })
  );
};