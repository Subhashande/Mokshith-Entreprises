import { logAction } from '../modules/audit/audit.service.js';

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
      } catch (error) {
        // 🔥 Never break response because of audit failure
        console.error('Audit log failed:', error.message);
      }
    });

    next();
  };
};