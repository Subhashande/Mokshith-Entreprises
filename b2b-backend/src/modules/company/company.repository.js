import Company from './company.model.js';

export const createCompany = async (data) => Company.create(data);

export const findCompanyById = async (id) =>
  Company.findById(id).populate('createdBy');

export const findAllCompanies = async () =>
  Company.find().populate('createdBy');

export const updateCompany = async (id, data) =>
  Company.findByIdAndUpdate(id, data, { new: true });