import AppError from '../errors/AppError.js';

export const checkPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user || !permissions.includes(req.user.permission)) {
      return next(new AppError('Permission denied', 403));
    }
    next();
  };
};