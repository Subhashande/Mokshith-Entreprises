import Company from './company.model.js';

export const createCompany = (data) => Company.create(data);

export const findCompanyById = (id) => Company.findById(id);

export const findAllCompanies = () => Company.find();

export const updateCompany = (id, data) =>
  Company.findByIdAndUpdate(id, data, { new: true });