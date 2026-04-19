import Credit from './credit.model.js';
import CreditLedger from './credit.ledger.js';

export const findByUser = (userId) =>
  Credit.findOne({ userId });

export const createCredit = (data) =>
  Credit.create(data);

export const updateCredit = (userId, data) =>
  Credit.findOneAndUpdate({ userId }, data, { new: true });

export const addLedger = (data) =>
  CreditLedger.create(data);

export const getLedger = (userId) =>
  CreditLedger.find({ userId }).sort({ createdAt: -1 });