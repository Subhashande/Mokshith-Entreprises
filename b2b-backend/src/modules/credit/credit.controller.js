import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './credit.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const createCredit = asyncHandler(async (req, res) => {
  const credit = await service.createCreditAccount(
    req.body.userId,
    req.body.limit
  );

  successResponse(res, credit, 'Credit created');
});

export const useCredit = asyncHandler(async (req, res) => {
  const data = await service.useCredit(req.user.id, req.body.amount);
  successResponse(res, data, 'Credit used');
});

export const repayCredit = asyncHandler(async (req, res) => {
  const data = await service.repayCredit(req.user.id, req.body.amount);
  successResponse(res, data, 'Credit repaid');
});

export const getCredit = asyncHandler(async (req, res) => {
  const data = await service.getCredit(req.user.id);
  successResponse(res, data);
});

export const getLedger = asyncHandler(async (req, res) => {
  const data = await service.getLedger(req.user.id);
  successResponse(res, data);
});