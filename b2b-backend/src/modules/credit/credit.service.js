import * as repo from './credit.repository.js';
import AppError from '../../errors/AppError.js';

// 🆕 Create Credit Account
export const createCreditAccount = async (userId, limit) => {
  if (limit < 0) {
    throw new AppError('Credit limit must be positive', 400);
  }

  const existing = await repo.findByUser(userId);

  if (existing) {
    throw new AppError('Credit account already exists', 400);
  }

  return repo.createCredit({
    userId,
    creditLimit: limit,
    availableCredit: limit,
    usedCredit: 0,
  });
};

// 💳 Use Credit (ORDER INTEGRATION)
export const useCredit = async (userId, amount) => {
  if (amount <= 0) {
    throw new AppError('Amount must be greater than 0', 400);
  }

  const credit = await repo.findByUser(userId);

  if (!credit) throw new AppError('Credit account not found', 404);

  if (credit.status === 'BLOCKED') {
    throw new AppError('Credit account is blocked', 403);
  }

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

// 💰 Repay Credit (PAYMENT INTEGRATION)
export const repayCredit = async (userId, amount) => {
  if (amount <= 0) {
    throw new AppError('Amount must be greater than 0', 400);
  }

  const credit = await repo.findByUser(userId);

  if (!credit) throw new AppError('Credit account not found', 404);

  if (amount > credit.usedCredit) {
    amount = credit.usedCredit;
  }

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