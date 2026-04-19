import AppError from '../../errors/AppError.js';
import * as repo from './vendor.repository.js';

const VALID_STATUS = ['PENDING', 'APPROVED', 'REJECTED'];

export const createVendor = async (data) => {
  if (!data.name || !data.companyId) {
    throw new AppError('Vendor name and companyId required', 400);
  }

  return repo.createVendor(data);
};

export const getVendors = async () => {
  return repo.findAllVendors();
};

export const approveVendor = async (id, status) => {
  if (!VALID_STATUS.includes(status)) {
    throw new AppError('Invalid vendor status', 400);
  }

  const vendor = await repo.updateVendor(id, { status });

  if (!vendor) throw new AppError('Vendor not found', 404);

  return vendor;
};