import AppError from '../../errors/AppError.js';
import * as repo from './vendor.repository.js';

export const createVendor = async (data) => {
  return repo.createVendor(data);
};

export const getVendors = async () => {
  return repo.findAllVendors();
};

export const approveVendor = async (id, status) => {
  const vendor = await repo.updateVendor(id, { status });

  if (!vendor) throw new AppError('Vendor not found', 404);

  return vendor;
};