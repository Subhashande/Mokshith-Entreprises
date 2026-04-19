import User from './user.model.js';

export const findById = async (id) => {
  return User.findById(id);
};

export const findAll = async (filter, options) => {
  const { skip, limit, sort } = options;

  return User.find(filter)
    .skip(skip)
    .limit(limit)
    .sort(sort);
};

export const countUsers = async (filter) => {
  return User.countDocuments(filter);
};

export const updateUserById = async (id, data) => {
  return User.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
};