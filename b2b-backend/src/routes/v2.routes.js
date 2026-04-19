import express from 'express';

const router = express.Router();

// 🔥 Health for v2
router.get('/health', (req, res) => {
  res.json({
    success: true,
    version: 'v2',
    message: 'API v2 is working 🚀',
    timestamp: new Date(),
  });
});

// 🔥 Placeholder for future upgrades
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to API v2',
  });
});

export default router;