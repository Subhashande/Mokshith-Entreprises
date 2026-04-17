import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './company.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const createCompany = asyncHandler(async (req, res) => {
  const company = await service.createCompany(req.body, req.user.id);
  successResponse(res, company, 'Company created');
});

export const getCompany = asyncHandler(async (req, res) => {
  const company = await service.getCompany(req.params.id);
  successResponse(res, company);
});

export const getAllCompanies = asyncHandler(async (req, res) => {
  const companies = await service.getAllCompanies();
  successResponse(res, companies);
});

export const updateCompany = asyncHandler(async (req, res) => {
  const company = await service.updateCompany(req.params.id, req.body);
  successResponse(res, company, 'Company updated');
});