import express from 'express';

const router = express.Router();

// Placeholder for future upgrades
router.get('/health', (req, res) => {
  res.json({
    message: 'API v2 is working 🚀',
  });
});

export default router;