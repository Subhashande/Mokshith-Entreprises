import User from '../user/user.model.js';

export const findUserByEmailOrMobile = async (identifier) => {
  return User.findOne({
    $or: [{ email: identifier }, { mobile: identifier }],
  }).select('+password');
};

export const createUser = async (data) => {
  return User.create(data);
};

export const updateUser = async (id, data) => {
  return User.findByIdAndUpdate(id, data, { new: true });
};