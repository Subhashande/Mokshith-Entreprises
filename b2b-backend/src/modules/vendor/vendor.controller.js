import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './vendor.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const createVendor = asyncHandler(async (req, res) => {
  const vendor = await service.createVendor(req.body);
  successResponse(res, vendor, 'Vendor created');
});

export const getVendors = asyncHandler(async (req, res) => {
  const vendors = await service.getVendors();
  successResponse(res, vendors);
});

export const approveVendor = asyncHandler(async (req, res) => {
  const vendor = await service.approveVendor(
    req.params.id,
    req.body.status
  );
  successResponse(res, vendor, 'Vendor status updated');
});