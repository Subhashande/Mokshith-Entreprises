import { logAction } from '../services/audit.service.js';

export const auditMiddleware = (action, entity) => {
  return (req, res, next) => {
    res.on('finish', async () => {
      try {
        await logAction({
          userId: req.user?.id || null,
          action,
          entity,
          entityId: req.params?.id || null,
          data: req.body || {},
        });
      } catch (err) {
        console.error('Audit failed:', err.message);
      }
    });

    next();
  };
};