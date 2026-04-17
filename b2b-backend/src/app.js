import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { notFound } from './middlewares/notFound.middleware.js';

const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Routes
app.use('/api', routes);

// Not Found
app.use(notFound);

// Error Handler
app.use(errorHandler);

export default app;