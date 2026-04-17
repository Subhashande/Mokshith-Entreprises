import cors from 'cors';

export const corsConfig = cors({
  origin: '*', // change in production
  credentials: true,
});