import jwt from 'jsonwebtoken';
import AppError from '../errors/AppError.js';

export const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) throw new AppError('Not authorized', 401);

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  req.user = decoded;

  next();
};