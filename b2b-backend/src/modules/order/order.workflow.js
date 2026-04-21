import AppError from '../../errors/AppError.js';
import { ORDER_STATUS } from '../../constants/orderStatus.js';

const transitions = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED, ORDER_STATUS.FAILED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.PACKED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PACKED]: [ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.FAILED]: [],
};

export const validateTransition = (current, next) => {
  if (!transitions[current] || !transitions[current].includes(next)) {
    throw new AppError(
      `Invalid status transition from ${current} to ${next}`,
      400
    );
  }
};
