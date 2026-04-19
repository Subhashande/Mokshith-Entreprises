import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// 🔥 Root health check
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy ✅',
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

// 🔥 Optional: direct ping
router.get('/ping', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'pong',
  });
});

router.get('/', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'UP' : 'DOWN';

  res.status(200).json({
    success: true,
    message: 'Server is healthy ✅',
    uptime: process.uptime(),
    database: dbStatus,
    timestamp: new Date(),
  });
});

export default router;