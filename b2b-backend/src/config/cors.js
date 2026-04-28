import cors from 'cors';

const allowedOrigins = [
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5173', // Common Vite default
  'http://127.0.0.1:5173'
];

export const corsConfig = cors({
  origin: function (origin, callback) {
    //  SECURITY: Reject requests with no origin in production
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('Origin header required'), false);
      }
      // Allow dev tools, curl, Postman in development only
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
});