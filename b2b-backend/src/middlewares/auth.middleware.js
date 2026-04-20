import jwt from 'jsonwebtoken';
import AppError from '../errors/AppError.js';
import { fetchSetting } from '../modules/settings/settings.service.js';
import { ROLES } from '../constants/roles.js';
import { findUserById } from '../modules/auth/auth.repository.js';
import { USER_STATUS } from '../constants/userStatus.js';

export const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return next(new AppError('Not authorized', 401));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 🔥 Fetch user to check status
    const user = await findUserById(decoded.id);
    if (!user) {
      return next(new AppError('User no longer exists', 401));
    }

    // 🔥 Check Maintenance Mode
    const maintenance = await fetchSetting('maintenanceMode');
    const maintenanceOld = await fetchSetting('MAINTENANCE_MODE');
    if ((maintenance?.value === true || maintenanceOld?.value === true) && user.role !== ROLES.SUPER_ADMIN) {
      return next(new AppError('System under maintenance', 503));
    }

    // 🔥 Check User Status
    if (user.role !== ROLES.SUPER_ADMIN && user.status !== USER_STATUS.ACTIVE) {
      const message = user.status === USER_STATUS.PENDING 
        ? 'Your account is pending admin approval. Please wait for activation.' 
        : 'Your account is inactive or suspended. Please contact support.';
      return next(new AppError(message, 403));
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    next(new AppError('Invalid token', 401));
  }
};