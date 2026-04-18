import Vendor from './vendor.model.js';

export const createVendor = (data) => Vendor.create(data);

export const findAllVendors = () => Vendor.find().populate('companyId');

export const findVendorById = (id) => Vendor.findById(id);

export const updateVendor = (id, data) =>
  Vendor.findByIdAndUpdate(id, data, { new: true });