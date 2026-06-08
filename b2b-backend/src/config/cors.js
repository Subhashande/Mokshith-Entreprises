import cors from 'cors';

const allowedOrigins = [
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  /\.vercel\.app$/,
  /mokshith-entreprises.*\.vercel\.app$/, // 🔥 Broadest match for your project on Vercel
  'https://mokshith-entreprises.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

export const corsConfig = cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed) {
      return callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked for origin: ${origin}`);
      // In production, we might want to be more strict, but for debugging let's allow it if it's a vercel preview
      if (origin.includes('vercel.app')) {
        return callback(null, true);
      }
      return callback(null, false); // Reject without error to allow middleware to handle it
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept',
    'x-csrf-token', // 🔥 Support CSRF protection
    'idempotency-key', // 🔥 Support idempotency
    'x-razorpay-signature' // 🔥 Support Razorpay webhooks
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'], // 🔥 For pagination
  maxAge: 86400, // Cache preflight requests for 24 hours
});