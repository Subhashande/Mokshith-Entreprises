import AppError from '../../errors/AppError.js';
import * as repo from './company.repository.js';

export const createCompany = async (data, userId) => {
  // 🔥 Basic duplicate check (email)
  const existingCompanies = await repo.findAllCompanies();

  const isDuplicate = existingCompanies.find(
    (c) => c.email.toLowerCase() === data.email.toLowerCase()
  );

  if (isDuplicate) {
    throw new AppError('Company with this email already exists', 400);
  }

  return repo.createCompany({
    ...data,
    createdBy: userId,
  });
};

export const getCompany = async (id) => {
  const company = await repo.findCompanyById(id);

  if (!company) throw new AppError('Company not found', 404);

  return company;
};

export const getAllCompanies = async () => {
  return repo.findAllCompanies();
};

export const updateCompany = async (id, data) => {
  const company = await repo.updateCompany(id, data);

  if (!company) throw new AppError('Company not found', 404);

  return company;
};