import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './settings.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const updateSetting = asyncHandler(async (req, res) => {
  const data = await service.updateSetting(
    req.body.key,
    req.body.value
  );

  successResponse(res, data, 'Setting updated');
});

export const getSetting = asyncHandler(async (req, res) => {
  const data = await service.fetchSetting(req.params.key);

  successResponse(res, data);
});

export const getAllSettings = asyncHandler(async (req, res) => {
  const data = await service.getAllSettings();

  successResponse(res, data);
});