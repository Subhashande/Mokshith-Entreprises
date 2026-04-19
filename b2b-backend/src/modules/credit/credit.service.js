import * as repo from './credit.repository.js';
import AppError from '../../errors/AppError.js';

export const createCreditAccount = async (userId, limit) => {
  const existing = await repo.findByUser(userId);

  if (existing) {
    throw new AppError('Credit account already exists', 400);
  }

  return repo.createCredit({
    userId,
    creditLimit: limit,
    availableCredit: limit,
  });
};

export const useCredit = async (userId, amount) => {
  const credit = await repo.findByUser(userId);

  if (!credit) throw new AppError('Credit account not found', 404);

  if (credit.availableCredit < amount) {
    throw new AppError('Insufficient credit', 400);
  }

  const updated = await repo.updateCredit(userId, {
    usedCredit: credit.usedCredit + amount,
    availableCredit: credit.availableCredit - amount,
  });

  await repo.addLedger({
    userId,
    type: 'DEBIT',
    amount,
    description: 'Order payment',
  });

  return updated;
};

export const repayCredit = async (userId, amount) => {
  const credit = await repo.findByUser(userId);

  if (!credit) throw new AppError('Credit account not found', 404);

  const updated = await repo.updateCredit(userId, {
    usedCredit: credit.usedCredit - amount,
    availableCredit: credit.availableCredit + amount,
  });

  await repo.addLedger({
    userId,
    type: 'CREDIT',
    amount,
    description: 'Payment received',
  });

  return updated;
};

export const getCredit = async (userId) => {
  return repo.findByUser(userId);
};

export const getLedger = async (userId) => {
  return repo.getLedger(userId);
};