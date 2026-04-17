import AppError from '../../errors/AppError.js';

const transitions = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const validateTransition = (current, next) => {
  if (!transitions[current].includes(next)) {
    throw new AppError(
      `Invalid status transition from ${current} to ${next}`,
      400
    );
  }
};